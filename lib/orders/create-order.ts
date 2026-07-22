import { Prisma } from "@prisma/client";
import { ZodError } from "zod";

import { db } from "@/lib/db";
import { generateOrderNumber } from "@/lib/orders/order-number";
import { checkoutSchema } from "@/lib/validation/checkout";

export type OrderCreationErrorCode = "INVALID" | "OUT_OF_STOCK" | "UNKNOWN";

export class OrderCreationError extends Error {
  constructor(
    public readonly code: OrderCreationErrorCode,
    options?: { cause?: unknown },
  ) {
    super(code === "OUT_OF_STOCK" ? "Stock insuffisant." : "La commande n’a pas pu être créée.", options);
    this.name = "OrderCreationError";
  }
}

export type CreateOrderResult = {
  number: string;
  productSlugs: string[];
};

const MAX_ORDER_TOTAL_DH = 100_000_000;
const MAX_ATTEMPTS = 3;

function isKnownPrismaError(error: unknown, code: string): boolean {
  return error instanceof Prisma.PrismaClientKnownRequestError && error.code === code;
}

function hasNumberConstraint(error: unknown): boolean {
  if (!isKnownPrismaError(error, "P2002")) return false;
  const target = (error as Prisma.PrismaClientKnownRequestError).meta?.target;
  return Array.isArray(target) ? target.includes("number") : String(target).includes("number");
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

  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt += 1) {
    try {
      return await db.$transaction(async (transaction) => {
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
            productName: variant.product.name,
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
            customerAddress: checkout.address,
            totalDh,
            items: { create: lines },
          },
        });
        return { number, productSlugs: [...productSlugs] };
      }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
    } catch (error) {
      if (error instanceof OrderCreationError) throw error;
      const retryable = isKnownPrismaError(error, "P2034") || hasNumberConstraint(error);
      if (retryable && attempt < MAX_ATTEMPTS) continue;
      throw new OrderCreationError("UNKNOWN");
    }
  }

  throw new OrderCreationError("UNKNOWN");
}
