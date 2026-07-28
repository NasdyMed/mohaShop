import { formatPriceDh } from "@/lib/catalog/price";
import { getProductPromotion } from "@/lib/catalog/promotion";

type Props = {
  priceDh: number;
  compareAtPriceDh: number | null;
  savingsLabel?: string;
  variant: "card" | "detail";
};

export function ProductPrice({ priceDh, compareAtPriceDh, savingsLabel, variant }: Props) {
  const promotion = getProductPromotion(priceDh, compareAtPriceDh);

  return (
    <div className={`product-price product-price-${variant}`}>
      <div className="product-price-values">
        <strong>{formatPriceDh(priceDh)}</strong>
        {promotion && compareAtPriceDh ? <del>{formatPriceDh(compareAtPriceDh)}</del> : null}
      </div>
      {promotion && savingsLabel ? (
        <p className="product-price-savings">{savingsLabel.replace("{amount}", formatPriceDh(promotion.savingsDh))}</p>
      ) : null}
    </div>
  );
}
