import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ findMany: vi.fn() }));

vi.mock("server-only", () => ({}));
vi.mock("@/lib/db", () => ({
  db: { product: { findMany: mocks.findMany } },
}));

import { listVisibleProducts } from "@/lib/catalog/queries";

describe("listVisibleProducts", () => {
  beforeEach(() => mocks.findMany.mockReset());

  it("returns every sorted variant so sold-out choices remain visible", async () => {
    mocks.findMany.mockResolvedValue([
      {
        id: "product-1",
        slug: "atlas",
        name: "Atlas",
        priceDh: 899,
        images: [{ id: "image-1", url: "https://example.com/atlas.webp", alt: "Atlas" }],
        variants: [
          { id: "v1", sku: "ATLAS-40", color: "Cognac", size: "40", stock: 3 },
          { id: "v2", sku: "ATLAS-42", color: "Cognac", size: "42", stock: 0 },
        ],
      },
    ]);

    const result = await listVisibleProducts();

    expect(mocks.findMany).toHaveBeenCalledWith(expect.objectContaining({
      select: expect.objectContaining({
        variants: {
          orderBy: [{ color: "asc" }, { size: "asc" }],
          select: { id: true, sku: true, color: true, size: true, stock: true },
        },
      }),
    }));
    expect(result[0].variants).toHaveLength(2);
    expect(result[0].available).toBe(true);
  });

  it("marks a product unavailable when every variant is sold out", async () => {
    mocks.findMany.mockResolvedValue([
      {
        id: "product-2",
        slug: "rif",
        name: "Rif",
        priceDh: 975,
        images: [],
        variants: [{ id: "v3", sku: "RIF-40", color: "Noir", size: "40", stock: 0 }],
      },
    ]);

    await expect(listVisibleProducts()).resolves.toMatchObject([
      { image: null, available: false, variants: [{ id: "v3", stock: 0 }] },
    ]);
  });
});
