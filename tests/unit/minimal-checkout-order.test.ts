// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => {
  const transaction = {
    productVariant: {
      updateMany: vi.fn(),
      findUnique: vi.fn(),
    },
    order: { create: vi.fn() },
  };
  return {
    transaction,
    runTransaction: vi.fn(async (callback: (tx: typeof transaction) => unknown) => callback(transaction)),
  };
});

vi.mock("@/lib/db", () => ({
  db: { $transaction: mocks.runTransaction },
}));

import { createOrder } from "@/lib/orders/create-order";

describe("minimal checkout persistence", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.transaction.productVariant.updateMany.mockResolvedValue({ count: 1 });
    mocks.transaction.productVariant.findUnique.mockResolvedValue({
      id: "variant-1",
      size: "40",
      color: "Noir",
      product: { name: "Atlas", nameAr: null, slug: "atlas", priceDh: 700 },
    });
    mocks.transaction.order.create.mockResolvedValue({ id: "order-1" });
  });

  it("persists the normalized customer phone and assigns Morocco server-side", async () => {
    await createOrder({
      firstName: "Amina",
      lastName: "El Idrissi",
      phone: "06 12 34 56 78",
      city: "Rabat",
      address: "12 avenue Mohammed V",
      items: [{ variantId: "variant-1", quantity: 1 }],
    });

    expect(mocks.transaction.order.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        customerFirstName: "Amina",
        customerLastName: "El Idrissi",
        customerCity: "Rabat",
        customerAddress: "12 avenue Mohammed V",
        customerPhone: "+212612345678",
        customerRegion: null,
        customerCountry: "Maroc",
      }),
    });
  });
});
