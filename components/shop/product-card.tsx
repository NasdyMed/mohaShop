"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";

import type { CatalogProductCard } from "@/lib/catalog/queries";
import { QuickVariantSelector } from "./quick-variant-selector";

const priceFormatter = new Intl.NumberFormat("fr-MA", { maximumFractionDigits: 0 });

export function formatPriceDh(priceDh: number) {
  return `${priceFormatter.format(priceDh).replace(/\u202f/g, " ")} DH`;
}

export function ProductCard({ product }: { product: CatalogProductCard }) {
  const firstColor = product.variants.find((variant) => variant.stock > 0)?.color ?? product.variants[0]?.color ?? null;
  const [selectedColor, setSelectedColor] = useState<string | null>(firstColor);
  const currentImage = product.images.find((image) => image.color === selectedColor)
    ?? product.images.find((image) => image.color === null)
    ?? product.image;

  return (
    <article className="product-card">
      <Link className="product-card-media-link" href={`/produits/${product.slug}`} aria-label={`Découvrir ${product.name}`}>
        <div className="product-card-media">
          <span className={`product-card-stock ${product.available ? "is-available" : "is-unavailable"}`}>
            {product.available ? "En stock" : "Épuisé"}
          </span>
          {currentImage ? (
            <Image key={currentImage.id} src={currentImage.url} alt={currentImage.alt} fill sizes="(max-width: 760px) 100vw, (max-width: 1099px) 50vw, 25vw" />
          ) : (
            <div className="image-fallback" role="img" aria-label={`Aperçu indisponible pour ${product.name}`}>
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
        <Link className="product-card-name" href={`/produits/${product.slug}`}><h2>{product.name}</h2></Link>
        <p className="product-card-category">Botte</p>
        <strong className="product-card-price">{formatPriceDh(product.priceDh)}</strong>
      </div>
    </article>
  );
}
