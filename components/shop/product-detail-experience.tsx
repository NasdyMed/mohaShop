"use client";

import { useCallback, useState } from "react";
import { ProductPurchase } from "@/components/cart/product-purchase";
import { ProductGallery } from "@/components/shop/product-gallery";
import type { CatalogImage, CatalogVariant } from "@/lib/catalog/queries";
import { localizeProduct } from "@/lib/i18n/product";
import { useStorefrontI18n } from "./locale-provider";
import { ProductPrice } from "./product-price";

type Props = {
  product: {
    slug: string;
    name: string;
    nameAr: string | null;
    description: string;
    descriptionAr: string | null;
    priceDh: number;
    compareAtPriceDh: number | null;
    image: CatalogImage | null;
    images: CatalogImage[];
    variants: CatalogVariant[];
    available: boolean;
  };
};

export function ProductDetailExperience({ product }: Props) {
  const { locale, dictionary } = useStorefrontI18n();
  const localizedProduct = localizeProduct(product, locale);
  const [selectedColor, setSelectedColor] = useState<string | null>(() => product.variants.find((variant) => variant.stock > 0)?.color ?? null);
  const selectVariant = useCallback((variant: CatalogVariant | null) => setSelectedColor(variant?.color ?? null), []);

  return <article className="product-detail shell">
    <div className="product-gallery-column">
      <ProductGallery images={product.images} productName={localizedProduct.name} selectedColor={selectedColor}/>
    </div>
    <div className="product-info" aria-label={`${dictionary.product.orderNow} ${localizedProduct.name}`}>
      <h1>{localizedProduct.name}</h1>
      <p className="product-detail-category">{dictionary.product.category}</p>
      <div className="detail-price-row"><ProductPrice priceDh={product.priceDh} compareAtPriceDh={product.compareAtPriceDh} savingsLabel={dictionary.product.savings} variant="detail"/><span>{dictionary.product.vatIncluded}</span></div>
      <p className="description">{localizedProduct.description}</p>
      {product.available ? <ProductPurchase product={{ slug: product.slug, name: localizedProduct.name, imageUrl: product.image?.url ?? null, unitPriceDh: product.priceDh }} variants={product.variants} images={product.images} onVariantChange={selectVariant}/> : <p className="sold-out">{dictionary.product.soldOut}</p>}
      <aside className="service-note"><div><span aria-hidden="true">✓</span><p><strong>{dictionary.promises.payment}</strong><small>{dictionary.promises.paymentCopy}</small></p></div><div><span aria-hidden="true">→</span><p><strong>{dictionary.promises.delivery}</strong><small>{dictionary.promises.guestCopy}</small></p></div></aside>
    </div>
  </article>;
}
