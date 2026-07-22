import "server-only";
import { db } from "@/lib/db";
export async function listAdminProducts() {
  return db.product.findMany({ orderBy: { updatedAt: "desc" }, select: { id: true, name: true, priceDh: true, isVisible: true, variants: { select: { stock: true } } } });
}
export async function getAdminProduct(id: string) {
  return db.product.findUnique({
    where: { id },
    include: {
      images: { orderBy: { position: "asc" } },
      variants: { orderBy: [{ size: "asc" }, { color: "asc" }], include: { _count: { select: { orderItems: true } } } },
    },
  });
}
