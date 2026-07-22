// @vitest-environment node
import { afterAll, beforeAll, describe, expect, it } from "vitest";

const RUN_ID = "task6_atomic_order";
const PRODUCT_PREFIX = `${RUN_ID}_product_`;
const PHONE = "+212612345678";

type Db = typeof import("@/lib/db").db;
type CreateOrder = typeof import("@/lib/orders/create-order").createOrder;

let db: Db;
let createOrder: CreateOrder;

function checkout(items: Array<{ variantId: string; quantity: number }>) {
  return {
    firstName: "  Amina   Zahra ",
    lastName: " El   Idrissi ",
    phone: "06 12 34 56 78",
    address: "  12 rue   Atlas, Rabat  ",
    items,
  };
}

async function seedVariant(suffix: string, stock = 2, priceDh = 740) {
  const product = await db.product.create({
    data: {
      slug: `${PRODUCT_PREFIX}${suffix}`,
      name: `Botte test ${suffix}`,
      description: "Produit isolé pour le test atomique",
      priceDh,
      variants: {
        create: { sku: `${RUN_ID}_${suffix}`, size: "39", color: "Noir", stock },
      },
    },
    include: { variants: true },
  });
  return { product, variant: product.variants[0] };
}

async function cleanup() {
  const testItems = await db.orderItem.findMany({
    where: { variant: { product: { slug: { startsWith: PRODUCT_PREFIX } } } },
    select: { orderId: true },
  });
  const orderIds = [...new Set(testItems.map(({ orderId }) => orderId))];
  await db.orderItem.deleteMany({ where: { orderId: { in: orderIds } } });
  await db.order.deleteMany({ where: { id: { in: orderIds } } });
  await db.product.deleteMany({ where: { slug: { startsWith: PRODUCT_PREFIX } } });
}

beforeAll(async () => {
  const explicitTestUrl = process.env.TEST_DATABASE_URL;
  const configuredUrl = explicitTestUrl ?? process.env.DATABASE_URL;
  if (!configuredUrl) {
    throw new Error("Integration precondition: set TEST_DATABASE_URL to an isolated PostgreSQL test database.");
  }
  const parsed = new URL(configuredUrl);
  const databaseName = parsed.pathname.slice(1).toLowerCase();
  const safeByName = /(^|[_-])(test|testing)([_-]|$)/.test(databaseName);
  if (!explicitTestUrl && !safeByName && process.env.ALLOW_INTEGRATION_DATABASE !== "true") {
    throw new Error(
      "Refusing integration tests against a production-like DATABASE_URL. Use TEST_DATABASE_URL, a database named with 'test', or ALLOW_INTEGRATION_DATABASE=true.",
    );
  }
  process.env.DATABASE_URL = configuredUrl;
  ({ db } = await import("@/lib/db"));
  ({ createOrder } = await import("@/lib/orders/create-order"));
  await cleanup();
});

afterAll(async () => {
  if (db) {
    await cleanup();
    await db.$disconnect();
  }
});

describe.sequential("createOrder PostgreSQL integration", () => {
  it("uses canonical customer data and server snapshots, computes total, and decrements stock", async () => {
    const { product, variant } = await seedVariant("success", 2, 740);
    const result = await createOrder(checkout([{ variantId: variant.id, quantity: 2 }]));
    const saved = await db.order.findUniqueOrThrow({ where: { number: result.number }, include: { items: true } });

    expect(saved).toMatchObject({
      customerFirstName: "Amina Zahra",
      customerLastName: "El Idrissi",
      customerPhone: PHONE,
      customerAddress: "12 rue Atlas, Rabat",
      totalDh: 1480,
    });
    expect(saved.items).toEqual([
      expect.objectContaining({
        variantId: variant.id,
        productName: product.name,
        size: "39",
        color: "Noir",
        unitPriceDh: 740,
        quantity: 2,
      }),
    ]);
    await expect(db.productVariant.findUniqueOrThrow({ where: { id: variant.id } })).resolves.toMatchObject({ stock: 0 });
    expect(result.productSlugs).toEqual([product.slug]);
  });

  it("rejects unknown client fields as INVALID", async () => {
    const { variant } = await seedVariant("strict");
    await expect(createOrder({ ...checkout([{ variantId: variant.id, quantity: 1 }]), priceDh: 1 })).rejects.toMatchObject({ code: "INVALID" });
  });

  it("maps excessive and nonexistent variants to OUT_OF_STOCK without partial writes", async () => {
    const { variant } = await seedVariant("out-of-stock");
    const before = await db.order.count({ where: { customerPhone: PHONE } });
    await expect(createOrder(checkout([{ variantId: variant.id, quantity: 3 }]))).rejects.toMatchObject({ code: "OUT_OF_STOCK" });
    await expect(createOrder(checkout([{ variantId: `${RUN_ID}_missing`, quantity: 1 }]))).rejects.toMatchObject({ code: "OUT_OF_STOCK" });
    expect(await db.order.count({ where: { customerPhone: PHONE } })).toBe(before);
    expect((await db.productVariant.findUniqueOrThrow({ where: { id: variant.id } })).stock).toBe(2);
  });

  it("rolls back all lines if a later line cannot be fulfilled", async () => {
    const first = await seedVariant("rollback-a", 2);
    const second = await seedVariant("rollback-b", 0);
    const before = await db.order.count({ where: { customerPhone: PHONE } });
    await expect(createOrder(checkout([
      { variantId: first.variant.id, quantity: 1 },
      { variantId: second.variant.id, quantity: 1 },
    ]))).rejects.toMatchObject({ code: "OUT_OF_STOCK" });
    expect(await db.order.count({ where: { customerPhone: PHONE } })).toBe(before);
    expect((await db.productVariant.findUniqueOrThrow({ where: { id: first.variant.id } })).stock).toBe(2);
  });

  it("generates valid unique public numbers", async () => {
    const variants = await Promise.all(Array.from({ length: 12 }, (_, index) => seedVariant(`number-${index}`, 1)));
    const results = await Promise.all(variants.map(({ variant }) => createOrder(checkout([{ variantId: variant.id, quantity: 1 }]))));
    expect(results.every(({ number }) => /^BOT-[A-Z0-9]{10}$/.test(number))).toBe(true);
    expect(new Set(results.map(({ number }) => number))).toHaveLength(results.length);
  });

  it("does not oversell under concurrent requests", async () => {
    const { variant } = await seedVariant("concurrent", 2);
    const results = await Promise.allSettled(
      Array.from({ length: 6 }, () => createOrder(checkout([{ variantId: variant.id, quantity: 1 }]))),
    );
    const successes = results.filter((result) => result.status === "fulfilled");
    const failures = results.filter((result) => result.status === "rejected");
    expect(successes).toHaveLength(2);
    expect(failures).toHaveLength(4);
    expect(failures.every((result) => result.status === "rejected" && result.reason?.code === "OUT_OF_STOCK")).toBe(true);
    expect((await db.productVariant.findUniqueOrThrow({ where: { id: variant.id } })).stock).toBe(0);
  });
});
