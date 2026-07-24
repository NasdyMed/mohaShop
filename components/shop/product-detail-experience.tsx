"use client";

import { useCallback, useState } from "react";
import { ProductPurchase } from "@/components/cart/product-purchase";
import { ProductGallery } from "@/components/shop/product-gallery";
import { formatPriceDh } from "@/lib/catalog/price";
import type { CatalogImage, CatalogVariant } from "@/lib/catalog/queries";

type Props = {
  product: {
    slug: string;
    name: string;
    description: string;
    priceDh: number;
    image: CatalogImage | null;
    images: CatalogImage[];
    variants: CatalogVariant[];
    available: boolean;
  };
};

export function ProductDetailExperience({ product }: Props) {
  const [selectedColor, setSelectedColor] = useState<string | null>(() => product.variants.find((variant) => variant.stock > 0)?.color ?? null);
  const selectVariant = useCallback((variant: CatalogVariant | null) => setSelectedColor(variant?.color ?? null), []);

  return <article className="product-detail shell">
    <div className="product-gallery-column">
      <ProductGallery images={product.images} productName={product.name} selectedColor={selectedColor}/>
    </div>
    <div className="product-info" aria-label={`Acheter ${product.name}`}>
      <h1>{product.name}</h1>
      <p className="product-detail-category">Botte</p>
      <div className="detail-price-row"><p className="detail-price">{formatPriceDh(product.priceDh)}</p><span>TVA incluse</span></div>
      <p className="description">{product.description}</p>
      {product.available ? <ProductPurchase product={{ slug: product.slug, name: product.name, imageUrl: product.image?.url ?? null, unitPriceDh: product.priceDh }} variants={product.variants} images={product.images} onVariantChange={selectVariant}/> : <p className="sold-out">Rupture de stock</p>}
      <aside className="service-note"><div><span aria-hidden="true">✓</span><p><strong>Paiement à la livraison</strong><small>Réglez à la réception de votre commande.</small></p></div><div><span aria-hidden="true">→</span><p><strong>Livraison partout au Maroc</strong><small>Sans création de compte.</small></p></div></aside>
    </div>
  </article>;
}
