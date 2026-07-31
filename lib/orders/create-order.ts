import { Prisma } from "@prisma/client";
import { ZodError } from "zod";

import { db } from "@/lib/db";
import { generateOrderNumber } from "@/lib/orders/order-number";
import { checkoutSchema } from "@/lib/validation/checkout";

export type OrderCreationErrorCode = "INVALID" | "OUT_OF_STOCK" | "UNKNOWN";
export type OrderCreationInternalCode = "UNEXPECTED" | "RETRY_EXHAUSTED";

export class OrderCreationError extends Error {
  constructor(
    public readonly code: OrderCreationErrorCode,
    options?: { cause?: unknown; internalCode?: OrderCreationInternalCode },
  ) {
    super(code === "OUT_OF_STOCK" ? "Stock insuffisant." : "La commande n’a pas pu être créée.", options);
    this.name = "OrderCreationError";
    this.internalCode = options?.internalCode ?? "UNEXPECTED";
  }

  public readonly internalCode: OrderCreationInternalCode;
}

export type CreateOrderResult = {
  number: string;
  productSlugs: string[];
};

const MAX_ORDER_TOTAL_DH = 100_000_000;
const MAX_ATTEMPTS = 5;
const RETRY_BASE_DELAY_MS = 20;
const RETRY_MAX_DELAY_MS = 250;

function isKnownPrismaError(error: unknown, code: string): boolean {
  return error instanceof Prisma.PrismaClientKnownRequestError && error.code === code;
}

function hasNumberConstraint(error: unknown): boolean {
  if (!isKnownPrismaError(error, "P2002")) return false;
  const target = (error as Prisma.PrismaClientKnownRequestError).meta?.target;
  return Array.isArray(target) ? target.includes("number") : String(target).includes("number");
}

export function computeRetryDelay(attempt: number, random: () => number = Math.random): number {
  const exponential = RETRY_BASE_DELAY_MS * 2 ** Math.max(0, attempt - 1);
  return Math.min(RETRY_MAX_DELAY_MS, Math.round(exponential * (1 + random())));
}

type RetryOptions = {
  sleep?: (milliseconds: number) => Promise<void>;
  random?: () => number;
};

export async function runWithOrderRetry<T>(
  operation: () => Promise<T>,
  options: RetryOptions = {},
): Promise<T> {
  const sleep = options.sleep ?? ((milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds)));
  const random = options.random ?? Math.random;

  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt += 1) {
    try {
      return await operation();
    } catch (error) {
      if (error instanceof OrderCreationError) throw error;
      const retryable = isKnownPrismaError(error, "P2034") || hasNumberConstraint(error);
      if (!retryable) throw new OrderCreationError("UNKNOWN");
      if (attempt === MAX_ATTEMPTS) {
        throw new OrderCreationError("UNKNOWN", { internalCode: "RETRY_EXHAUSTED" });
      }
      await sleep(computeRetryDelay(attempt, random));
    }
  }

  throw new OrderCreationError("UNKNOWN", { internalCode: "RETRY_EXHAUSTED" });
}

function safeLineTotal(priceDh: number, quantity: number): number {
  if (!Number.isSafeInteger(priceDh) || priceDh < 0) throw new OrderCreationError("UNKNOWN");
  const lineTotal = priceDh * quantity;
  if (!Number.isSafeInteger(lineTotal) || lineTotal > MAX_ORDER_TOTAL_DH) {
    throw new OrderCreationError("INVALID");
  }
  return lineTotal;
}

export async function createOrder(rawInput: unknown): Promise<CreateOrderResult> {
  let checkout;
  try {
    checkout = checkoutSchema.parse(rawInput);
  } catch (error) {
    if (error instanceof ZodError) throw new OrderCreationError("INVALID", { cause: error });
    throw new OrderCreationError("UNKNOWN");
  }

  return runWithOrderRetry(() =>
    db.$transaction(async (transaction) => {
        const lines: Array<{
          variantId: string;
          productName: string;
          size: string;
          color: string;
          unitPriceDh: number;
          quantity: number;
        }> = [];
        const productSlugs = new Set<string>();
        let totalDh = 0;

        for (const item of checkout.items) {
          const updated = await transaction.productVariant.updateMany({
            where: { id: item.variantId, stock: { gte: item.quantity } },
            data: { stock: { decrement: item.quantity } },
          });
          if (updated.count !== 1) throw new OrderCreationError("OUT_OF_STOCK");

          const variant = await transaction.productVariant.findUnique({
            where: { id: item.variantId },
            include: { product: true },
          });
          if (!variant) throw new OrderCreationError("OUT_OF_STOCK");

          const lineTotal = safeLineTotal(variant.product.priceDh, item.quantity);
          totalDh += lineTotal;
          if (!Number.isSafeInteger(totalDh) || totalDh > MAX_ORDER_TOTAL_DH) {
            throw new OrderCreationError("INVALID");
          }
          productSlugs.add(variant.product.slug);
          lines.push({
            variantId: variant.id,
            productName: checkout.locale === "ar" ? variant.product.nameAr?.trim() || variant.product.name : variant.product.name,
            size: variant.size,
            color: variant.color,
            unitPriceDh: variant.product.priceDh,
            quantity: item.quantity,
          });
        }

        const number = generateOrderNumber();
        await transaction.order.create({
          data: {
            number,
            customerFirstName: checkout.firstName,
            customerLastName: checkout.lastName,
            customerPhone: checkout.phone,
            customerEmail: null,
            customerAddress: checkout.address,
            customerAddressComplement: null,
            customerCity: checkout.city,
            customerRegion: null,
            customerPostalCode: null,
            customerCountry: "Maroc",
            deliveryNotes: null,
            totalDh,
            items: { create: lines },
          },
        });
        return { number, productSlugs: [...productSlugs] };
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable }),
  );
}
