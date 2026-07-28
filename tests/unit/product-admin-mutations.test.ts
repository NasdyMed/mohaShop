// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => {
  const tx = {
    product: { create: vi.fn(), findUnique: vi.fn(), update: vi.fn() },
    productVariant: { findMany: vi.fn(), update: vi.fn(), delete: vi.fn(), create: vi.fn() },
    productImage: { deleteMany: vi.fn(), createMany: vi.fn() },
  };
  return { tx, transaction: vi.fn(async (callback: (client: typeof tx) => unknown) => callback(tx)) };
});

vi.mock("server-only", () => ({}));
vi.mock("@/lib/db", () => ({ db: { $transaction: mocks.transaction } }));

import { saveProduct } from "@/lib/catalog/admin-mutations";

const productId = "c123456789012345678901234";
const variantId = "c223456789012345678901234";
const base = {
  name: "Botte Atlas",
  nameAr: null,
  description: "Une description suffisamment longue pour le test.",
  descriptionAr: null,
  priceDh: 850,
  slug: "botte-atlas",
  isVisible: false,
  images: [],
  variants: [],
};

beforeEach(() => {
  vi.clearAllMocks();
  mocks.tx.product.create.mockResolvedValue({ id: productId });
  mocks.tx.product.findUnique.mockResolvedValue({ id: productId, slug: base.slug });
  mocks.tx.productVariant.findMany.mockResolvedValue([]);
});

describe("saveProduct color enforcement", () => {
  it("rejects a forged unknown color on a new variant", async () => {
    await expect(saveProduct({
      ...base,
      variants: [{ sku: "ATLAS-38", size: "38", color: "Rouge", stock: 1 }],
    })).rejects.toMatchObject({ code: "INVALID_COLOR" });
    expect(mocks.tx.productVariant.create).not.toHaveBeenCalled();
  });

  it("preserves an existing legacy color and its matching image", async () => {
    mocks.tx.productVariant.findMany.mockResolvedValue([{
      id: variantId, color: "Rouge", _count: { orderItems: 0 },
    }]);
    await expect(saveProduct({
      ...base,
      id: productId,
      images: [{ url: "https://images.unsplash.com/red.webp", alt: "Botte rouge", color: " rouge ", position: 0 }],
      variants: [{ id: variantId, sku: "ATLAS-38", size: "38", color: " rouge ", stock: 1 }],
    })).resolves.toMatchObject({ id: productId });
    expect(mocks.tx.productVariant.update).toHaveBeenLastCalledWith({
      where: { id: variantId },
      data: { sku: "ATLAS-38", size: "38", color: "Rouge", stock: 1 },
    });
    expect(mocks.tx.productImage.createMany).toHaveBeenCalledWith({
      data: [{ productId, url: "https://images.unsplash.com/red.webp", alt: "Botte rouge", color: "Rouge", position: 0 }],
    });
  });

  it("rejects changing a legacy variant to another unknown color", async () => {
    mocks.tx.productVariant.findMany.mockResolvedValue([{
      id: variantId, color: "Rouge", _count: { orderItems: 0 },
    }]);
    await expect(saveProduct({
      ...base,
      id: productId,
      variants: [{ id: variantId, sku: "ATLAS-38", size: "38", color: "Violet", stock: 1 }],
    })).rejects.toMatchObject({ code: "INVALID_COLOR" });
  });
});
