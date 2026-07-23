// @vitest-environment node
import { randomUUID } from "node:crypto";
import { OrderStatus } from "@prisma/client";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

const RUN_ID = `task9_${process.pid}_${randomUUID().replaceAll("-", "")}`;
const PRODUCT_PREFIX = `${RUN_ID}_product_`;

type Db = typeof import("@/lib/db").db;
type UpdateOrderStatus = typeof import("@/lib/orders/update-status").updateOrderStatus;

let db: Db;
let updateOrderStatus: UpdateOrderStatus;

async function seedOrder(suffix: string, status: OrderStatus, quantity = 2) {
  const product = await db.product.create({
    data: {
      slug: `${PRODUCT_PREFIX}${suffix}`,
      name: `Botte statut ${suffix}`,
      description: "Produit isolé pour le workflow de commande",
      priceDh: 700,
      variants: { create: { sku: `${RUN_ID}_${suffix}`, size: "39", color: "Noir", stock: 3 } },
    },
    include: { variants: true },
  });
  const variant = product.variants[0];
  const order = await db.order.create({
    data: {
      number: `BOT-${randomUUID().replaceAll("-", "").slice(0, 10).toUpperCase()}`,
      customerFirstName: "Amina",
      customerLastName: "Test",
      customerPhone: "+212612345678",
      customerAddress: "12 rue Atlas, Rabat",
      totalDh: 700 * quantity,
      status,
      items: { create: { variantId: variant.id, productName: product.name, size: variant.size, color: variant.color, unitPriceDh: 700, quantity } },
    },
  });
  return { order, variant };
}

async function cleanup() {
  const items = await db.orderItem.findMany({
    where: { variant: { product: { slug: { startsWith: PRODUCT_PREFIX } } } },
    select: { orderId: true },
  });
  const orderIds = [...new Set(items.map(({ orderId }) => orderId))];
  await db.orderItem.deleteMany({ where: { orderId: { in: orderIds } } });
  await db.order.deleteMany({ where: { id: { in: orderIds } } });
  await db.product.deleteMany({ where: { slug: { startsWith: PRODUCT_PREFIX } } });
}

beforeAll(async () => {
  const configuredUrl = process.env.TEST_DATABASE_URL;
  const requirement = "Set TEST_DATABASE_URL to an isolated PostgreSQL test database whose database name contains 'test'.";
  if (!configuredUrl) throw new Error(`Integration precondition: ${requirement}`);
  let parsed: URL;
  try { parsed = new URL(configuredUrl); }
  catch { throw new Error(`Integration precondition: TEST_DATABASE_URL is not a valid URL. ${requirement}`); }
  if (!['postgres:', 'postgresql:'].includes(parsed.protocol)) {
    throw new Error(`Integration precondition: TEST_DATABASE_URL must use postgres or postgresql. ${requirement}`);
  }
  let databaseName: string;
  try { databaseName = decodeURIComponent(parsed.pathname.slice(1)); }
  catch { throw new Error(`Integration precondition: TEST_DATABASE_URL has an invalid database name. ${requirement}`); }
  if (!databaseName || !/test/i.test(databaseName)) {
    throw new Error(`Refusing integration tests because the TEST_DATABASE_URL database name does not contain 'test'. ${requirement}`);
  }
  process.env.DATABASE_URL = configuredUrl;
  ({ db } = await import("@/lib/db"));
  ({ updateOrderStatus } = await import("@/lib/orders/update-status"));
  await cleanup();
});

afterAll(async () => {
  if (db) { await cleanup(); await db.$disconnect(); }
});

describe.sequential("updateOrderStatus PostgreSQL integration", () => {
  it("applies the sequential fulfilment transitions", async () => {
    const { order } = await seedOrder("sequential", OrderStatus.NEW);
    await updateOrderStatus(order.id, OrderStatus.CONFIRMED);
    await updateOrderStatus(order.id, OrderStatus.SHIPPED);
    await updateOrderStatus(order.id, OrderStatus.DELIVERED);
    await expect(db.order.findUniqueOrThrow({ where: { id: order.id } })).resolves.toMatchObject({ status: OrderStatus.DELIVERED, stockRestored: false });
  });

  it("rejects an illegal skip without changing the order", async () => {
    const { order } = await seedOrder("skip", OrderStatus.NEW);
    await expect(updateOrderStatus(order.id, OrderStatus.DELIVERED)).rejects.toMatchObject({ code: "INVALID_TRANSITION" });
    await expect(db.order.findUniqueOrThrow({ where: { id: order.id } })).resolves.toMatchObject({ status: OrderStatus.NEW, stockRestored: false });
  });

  it.each([OrderStatus.NEW, OrderStatus.CONFIRMED, OrderStatus.SHIPPED])("cancels %s and restores stock exactly once", async (status) => {
    const { order, variant } = await seedOrder(`cancel-${status.toLowerCase()}`, status, 2);
    await updateOrderStatus(order.id, OrderStatus.CANCELLED);
    await expect(db.order.findUniqueOrThrow({ where: { id: order.id } })).resolves.toMatchObject({ status: OrderStatus.CANCELLED, stockRestored: true });
    expect((await db.productVariant.findUniqueOrThrow({ where: { id: variant.id } })).stock).toBe(5);
    await expect(updateOrderStatus(order.id, OrderStatus.CANCELLED)).rejects.toMatchObject({ code: "INVALID_TRANSITION" });
    expect((await db.productVariant.findUniqueOrThrow({ where: { id: variant.id } })).stock).toBe(5);
  });

  it("never restores stock twice under concurrent cancellation", async () => {
    const { order, variant } = await seedOrder("concurrent", OrderStatus.CONFIRMED, 2);
    const results = await Promise.allSettled(Array.from({ length: 6 }, () => updateOrderStatus(order.id, OrderStatus.CANCELLED)));
    expect(results.filter(({ status }) => status === "fulfilled")).toHaveLength(1);
    expect(results.filter(({ status }) => status === "rejected").every((result) => result.status === "rejected" && result.reason?.code === "INVALID_TRANSITION")).toBe(true);
    expect((await db.productVariant.findUniqueOrThrow({ where: { id: variant.id } })).stock).toBe(5);
  });

  it("does not cancel a delivered order", async () => {
    const { order, variant } = await seedOrder("delivered", OrderStatus.DELIVERED, 2);
    await expect(updateOrderStatus(order.id, OrderStatus.CANCELLED)).rejects.toMatchObject({ code: "INVALID_TRANSITION" });
    expect((await db.productVariant.findUniqueOrThrow({ where: { id: variant.id } })).stock).toBe(3);
  });

  it("returns NOT_FOUND for an unknown order", async () => {
    await expect(updateOrderStatus(`${RUN_ID}_missing`, OrderStatus.CONFIRMED)).rejects.toMatchObject({ code: "NOT_FOUND" });
  });
});
