import { describe, expect, it } from "vitest";

import {
  cartReducer,
  selectItemCount,
  selectTotal,
} from "@/components/cart/cart-reducer";
import type { CartItemInput } from "@/components/cart/cart-types";

const atlas: CartItemInput = {
  variantId: "v1",
  productSlug: "atlas",
  productName: "Atlas",
  imageUrl: "/atlas.jpg",
  size: "40",
  color: "Brun",
  unitPriceDh: 899,
  availableStock: 3,
};

describe("cartReducer", () => {
  it("adds a new line without mutating the existing state", () => {
    const state = [];
    const next = cartReducer(state, { type: "add", item: atlas, quantity: 2 });

    expect(next).toEqual([{ ...atlas, quantity: 2 }]);
    expect(state).toEqual([]);
  });

  it("merges the same variant and caps its quantity at available stock", () => {
    const state = [{ ...atlas, quantity: 2 }];
    const next = cartReducer(state, { type: "add", item: atlas, quantity: 5 });

    expect(next).toEqual([{ ...atlas, quantity: 3 }]);
    expect(next[0]).not.toBe(state[0]);
    expect(state[0].quantity).toBe(2);
  });

  it("keeps different variants as separate lines", () => {
    const noir = { ...atlas, variantId: "v2", color: "Noir", size: "41" };
    const next = cartReducer([{ ...atlas, quantity: 1 }], {
      type: "add",
      item: noir,
      quantity: 2,
    });

    expect(next).toEqual([{ ...atlas, quantity: 1 }, { ...noir, quantity: 2 }]);
  });

  it("clamps setQuantity to one through the stock snapshot", () => {
    const state = [{ ...atlas, quantity: 2 }];

    expect(cartReducer(state, { type: "setQuantity", variantId: "v1", quantity: -4 })[0].quantity).toBe(1);
    expect(cartReducer(state, { type: "setQuantity", variantId: "v1", quantity: 99 })[0].quantity).toBe(3);
    expect(cartReducer(state, { type: "setQuantity", variantId: "v1", quantity: 2.8 })[0].quantity).toBe(2);
  });

  it("ignores additions with zero stock or unusable quantities", () => {
    expect(cartReducer([], { type: "add", item: { ...atlas, availableStock: 0 }, quantity: 1 })).toEqual([]);
    expect(cartReducer([], { type: "add", item: atlas, quantity: Number.NaN })).toEqual([]);
    expect(cartReducer([], { type: "add", item: atlas, quantity: 0 })).toEqual([]);
  });

  it("removes a line and removes stale zero-stock lines on updates", () => {
    const state = [{ ...atlas, quantity: 1 }, { ...atlas, variantId: "v2", availableStock: 0, quantity: 1 }];

    expect(cartReducer(state, { type: "remove", variantId: "v1" })).toEqual([]);
    expect(cartReducer(state, { type: "setQuantity", variantId: "v2", quantity: 1 })).toEqual([{ ...atlas, quantity: 1 }]);
  });

  it("clears all lines", () => {
    expect(cartReducer([{ ...atlas, quantity: 1 }], { type: "clear" })).toEqual([]);
  });

  it("sanitizes hydrated lines and clamps quantity to stock", () => {
    const valid = { ...atlas, quantity: 2 };
    const overStock = { ...atlas, variantId: "v2", quantity: 99 };
    const incoming = [
      valid,
      overStock,
      { ...atlas, variantId: "v3", unitPriceDh: 0, quantity: 1 },
      { ...atlas, variantId: "v4", availableStock: -1, quantity: 1 },
      { ...atlas, variantId: "v5", quantity: Number.NaN },
      { ...atlas, variantId: "v6", quantity: 0 },
      { ...atlas, variantId: "", quantity: 1 },
    ];

    const next = cartReducer([], { type: "hydrate", items: incoming });

    expect(next).toEqual([valid, { ...overStock, quantity: 3 }]);
    expect(next[0]).not.toBe(valid);
    expect(next[1]).not.toBe(overStock);
    expect(incoming[1].quantity).toBe(99);
  });

  it("rejects non-integer prices, stocks, and quantities during hydration", () => {
    const items = [
      { ...atlas, unitPriceDh: 10.5, quantity: 1 },
      { ...atlas, availableStock: 2.5, quantity: 1 },
      { ...atlas, quantity: 1.5 },
      { ...atlas, productSlug: "", quantity: 1 },
      { ...atlas, productName: "", quantity: 1 },
      { ...atlas, color: "", quantity: 1 },
      { ...atlas, size: "", quantity: 1 },
    ];

    expect(cartReducer([], { type: "hydrate", items })).toEqual([]);
  });

  it("keeps the first valid snapshot for duplicate variant IDs", () => {
    const first = { ...atlas, quantity: 1 };
    const conflicting = { ...atlas, productName: "Conflicting", quantity: 2 };

    expect(cartReducer([], { type: "hydrate", items: [first, conflicting] })).toEqual([first]);
  });

  it("rejects unsafe and oversized hydrated numbers", () => {
    const items = [
      { ...atlas, unitPriceDh: Number.MAX_SAFE_INTEGER + 1, quantity: 1 },
      { ...atlas, unitPriceDh: 1_000_001, quantity: 1 },
      { ...atlas, availableStock: Number.MAX_SAFE_INTEGER + 1, quantity: 1 },
      { ...atlas, availableStock: 1_000_001, quantity: 1 },
      { ...atlas, quantity: Number.MAX_SAFE_INTEGER + 1 },
    ];

    expect(cartReducer([], { type: "hydrate", items })).toEqual([]);
  });

  it("caps hydration at thirty unique valid lines", () => {
    const items = Array.from({ length: 35 }, (_, index) => ({ ...atlas, variantId: `v${index}`, quantity: 1 }));

    const next = cartReducer([], { type: "hydrate", items });

    expect(next).toHaveLength(30);
    expect(next.map((item) => item.variantId)).toEqual(items.slice(0, 30).map((item) => item.variantId));
  });
});

describe("cart selectors", () => {
  const state = [
    { ...atlas, quantity: 2 },
    { ...atlas, variantId: "v2", unitPriceDh: 500, quantity: 3 },
  ];

  it("calculates the display total", () => {
    expect(selectTotal(state)).toBe(3298);
  });

  it("counts all units", () => {
    expect(selectItemCount(state)).toBe(5);
  });
});
