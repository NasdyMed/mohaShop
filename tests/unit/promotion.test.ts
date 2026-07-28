import { describe, expect, it } from "vitest";
import { getProductPromotion } from "@/lib/catalog/promotion";

describe("getProductPromotion", () => {
  it("returns no promotion without a higher reference price", () => {
    expect(getProductPromotion(700, null)).toBeNull();
    expect(getProductPromotion(700, 700)).toBeNull();
    expect(getProductPromotion(700, 650)).toBeNull();
  });

  it("calculates the rounded discount and exact savings", () => {
    expect(getProductPromotion(749, 999)).toEqual({
      discountPercent: 25,
      savingsDh: 250,
    });
  });
});
