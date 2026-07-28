export type ProductPromotion = {
  discountPercent: number;
  savingsDh: number;
};

export function getProductPromotion(
  priceDh: number,
  compareAtPriceDh: number | null | undefined,
): ProductPromotion | null {
  if (compareAtPriceDh == null || compareAtPriceDh <= priceDh) return null;

  return {
    discountPercent: Math.round(((compareAtPriceDh - priceDh) / compareAtPriceDh) * 100),
    savingsDh: compareAtPriceDh - priceDh,
  };
}
