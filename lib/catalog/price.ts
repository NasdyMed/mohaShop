const priceFormatter = new Intl.NumberFormat("fr-MA", { maximumFractionDigits: 0 });

export function formatPriceDh(priceDh: number) {
  return `${priceFormatter.format(priceDh).replace(/\u202f/g, " ")} DH`;
}
