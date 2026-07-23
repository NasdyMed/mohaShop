import { describe, expect, it } from "vitest";

import { seedProducts } from "../../prisma/seed-products";

describe("catalog seed products", () => {
  it("provides twenty deterministic, purchase-ready products", () => {
    expect(seedProducts).toHaveLength(20);
    expect(new Set(seedProducts.map((product) => product.slug)).size).toBe(20);
    expect(new Set(seedProducts.flatMap((product) => product.variants.map((variant) => variant.sku))).size).toBe(120);

    for (const product of seedProducts) {
      expect(product.priceDh).toBeGreaterThan(0);
      expect(product.description.length).toBeGreaterThan(20);
      expect(product.image).toMatch(/^https:\/\/images\.unsplash\.com\//);
      expect(product.variants).toHaveLength(6);
    }
  });

  it("contains several colors and realistic partial stock-outs", () => {
    const colors = new Set(seedProducts.flatMap((product) => product.variants.map((variant) => variant.color)));
    const stocks = seedProducts.flatMap((product) => product.variants.map((variant) => variant.stock));

    expect(colors.size).toBeGreaterThanOrEqual(6);
    expect(stocks).toContain(0);
    expect(stocks.some((stock) => stock > 0)).toBe(true);
    expect(seedProducts.some((product) => new Set(product.variants.map((variant) => variant.color)).size > 1)).toBe(true);
  });
});
