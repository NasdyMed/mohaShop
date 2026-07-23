import "server-only";
import { OrderStatus, Prisma } from "@prisma/client";
import { db } from "@/lib/db";
const PAGE_SIZE = 20;
export async function listAdminOrders(input: { status?: string; q?: string; page?: number }) {
  const status = Object.values(OrderStatus).includes(input.status as OrderStatus) ? input.status as OrderStatus : undefined;
  const q = input.q?.trim().slice(0, 100) || "";
  const requestedPage = Math.min(10_000, Math.max(1, Math.trunc(input.page || 1)));
  const where: Prisma.OrderWhereInput = { ...(status ? { status } : {}), ...(q ? { OR: [
    { number: { contains: q, mode: "insensitive" } }, { customerFirstName: { contains: q, mode: "insensitive" } },
    { customerLastName: { contains: q, mode: "insensitive" } }, { customerPhone: { contains: q } },
  ] } : {}) };
  return db.$transaction(async (tx) => {
    const total = await tx.order.count({ where });
    const pageCount = Math.max(1, Math.ceil(total / PAGE_SIZE));
    const page = Math.min(requestedPage, pageCount);
    const orders = await tx.order.findMany({ where, orderBy: [{ createdAt: "desc" }, { id: "desc" }], skip: (page - 1) * PAGE_SIZE, take: PAGE_SIZE,
      select: { id: true, number: true, customerFirstName: true, customerLastName: true, customerPhone: true, totalDh: true, status: true, createdAt: true } });
    return { orders, total, page, pageCount, status, q };
  }, { isolationLevel: Prisma.TransactionIsolationLevel.RepeatableRead });
}
export async function getAdminOrder(id: string) {
  if (!id || id.length > 128) return null;
  return db.order.findUnique({ where: { id }, select: { id: true, number: true, customerFirstName: true, customerLastName: true, customerPhone: true, customerEmail: true, customerAddress: true, customerAddressComplement: true, customerCity: true, customerRegion: true, customerPostalCode: true, customerCountry: true, deliveryNotes: true, totalDh: true, status: true, stockRestored: true, createdAt: true, updatedAt: true, items: { select: { id: true, productName: true, size: true, color: true, unitPriceDh: true, quantity: true } } } });
}
