import "server-only";
import { OrderStatus, Prisma } from "@prisma/client";
import { z } from "zod";
import { db } from "@/lib/db";
import { canTransition } from "@/lib/orders/status";

const inputSchema = z.object({ orderId: z.string().trim().min(1).max(128), target: z.nativeEnum(OrderStatus) }).strict();
export type OrderStatusUpdateCode = "INVALID" | "NOT_FOUND" | "INVALID_TRANSITION" | "UNKNOWN";
export class OrderStatusUpdateError extends Error {
  constructor(public readonly code: OrderStatusUpdateCode) { super(code); this.name = "OrderStatusUpdateError"; }
}
const MAX_ATTEMPTS = 5;
const retryable = (error: unknown) => error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2034";

export async function updateOrderStatus(orderId: unknown, target: unknown) {
  const parsed = inputSchema.safeParse({ orderId, target });
  if (!parsed.success) throw new OrderStatusUpdateError("INVALID");
  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    try {
      return await db.$transaction(async (tx) => {
        const order = await tx.order.findUnique({ where: { id: parsed.data.orderId }, include: { items: { select: { variantId: true, quantity: true } } } });
        if (!order) throw new OrderStatusUpdateError("NOT_FOUND");
        if (!canTransition(order.status, parsed.data.target)) throw new OrderStatusUpdateError("INVALID_TRANSITION");
        if (parsed.data.target === OrderStatus.CANCELLED && !order.stockRestored) {
          for (const item of order.items) await tx.productVariant.update({ where: { id: item.variantId }, data: { stock: { increment: item.quantity } } });
          return tx.order.update({ where: { id: order.id }, data: { status: OrderStatus.CANCELLED, stockRestored: true }, select: { id: true, status: true } });
        }
        return tx.order.update({ where: { id: order.id }, data: { status: parsed.data.target }, select: { id: true, status: true } });
      }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
    } catch (error) {
      if (error instanceof OrderStatusUpdateError) throw error;
      if (!retryable(error) || attempt === MAX_ATTEMPTS) throw new OrderStatusUpdateError("UNKNOWN");
      await new Promise((resolve) => setTimeout(resolve, Math.min(200, 20 * 2 ** (attempt - 1))));
    }
  }
  throw new OrderStatusUpdateError("UNKNOWN");
}
