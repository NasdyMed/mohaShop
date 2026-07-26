"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";

import type { CatalogProductCard } from "@/lib/catalog/queries";
import { formatPriceDh } from "@/lib/catalog/price";
import { localizePath } from "@/lib/i18n/config";
import { localizeProduct } from "@/lib/i18n/product";
import { QuickVariantSelector } from "./quick-variant-selector";
import { useStorefrontI18n } from "./locale-provider";

export function ProductCard({ product }: { product: CatalogProductCard }) {
  const { locale, dictionary } = useStorefrontI18n();
  const localizedProduct = localizeProduct(product, locale);
  const firstColor = product.variants.find((variant) => variant.stock > 0)?.color ?? product.variants[0]?.color ?? null;
  const [selectedColor, setSelectedColor] = useState<string | null>(firstColor);
  const currentImage = product.images.find((image) => image.color === selectedColor)
    ?? product.images.find((image) => image.color === null)
    ?? product.image;

  return (
    <article className="product-card">
      <Link className="product-card-media-link" href={localizePath(`/produits/${product.slug}`, locale)} aria-label={`${locale === "fr" ? "Découvrir" : "اكتشف"} ${localizedProduct.name}`}>
        <div className="product-card-media">
          <span className={`product-card-stock ${product.available ? "is-available" : "is-unavailable"}`}>
            {product.available ? dictionary.stock.available : dictionary.stock.outOfStock}
          </span>
          {currentImage ? (
            <Image key={currentImage.id} src={currentImage.url} alt={currentImage.alt} fill sizes="(max-width: 760px) 100vw, (max-width: 1099px) 50vw, 25vw" />
          ) : (
            <div className="image-fallback" role="img" aria-label={`${dictionary.product.unavailablePreview} ${localizedProduct.name}`}>
              BB
            </div>
          )}
        </div>
      </Link>
      <div className="product-card-copy">
        <QuickVariantSelector
          productSlug={product.slug}
          variants={product.variants}
          onColorChange={setSelectedColor}
        />
        <Link className="product-card-name" href={localizePath(`/produits/${product.slug}`, locale)}><h2>{localizedProduct.name}</h2></Link>
        <p className="product-card-category">{dictionary.product.category}</p>
        <strong className="product-card-price">{formatPriceDh(product.priceDh)}</strong>
      </div>
    </article>
  );
}
