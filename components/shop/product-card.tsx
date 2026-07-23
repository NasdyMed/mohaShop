import Image from "next/image";
import Link from "next/link";

import type { CatalogProductCard } from "@/lib/catalog/queries";
import { QuickVariantSelector } from "./quick-variant-selector";

const priceFormatter = new Intl.NumberFormat("fr-MA", { maximumFractionDigits: 0 });

export function formatPriceDh(priceDh: number) {
  return `${priceFormatter.format(priceDh).replace(/\u202f/g, " ")} DH`;
}

export function ProductCard({ product }: { product: CatalogProductCard }) {
  return (
    <article className="product-card">
      <Link className="product-card-media-link" href={`/produits/${product.slug}`} aria-label={`Découvrir ${product.name}`}>
        <div className="product-card-media">
          <span className={`product-card-stock ${product.available ? "is-available" : "is-unavailable"}`}>
            {product.available ? "En stock" : "Épuisé"}
          </span>
          {product.image ? (
            <Image src={product.image.url} alt={product.image.alt} fill sizes="(max-width: 760px) 100vw, (max-width: 1099px) 50vw, 25vw" />
          ) : (
            <div className="image-fallback" role="img" aria-label={`Aperçu indisponible pour ${product.name}`}>
              BB
            </div>
          )}
        </div>
      </Link>
      <div className="product-card-copy">
        <div className="product-card-heading"><Link className="product-card-name" href={`/produits/${product.slug}`}><h2>{product.name}</h2></Link><strong className="product-card-price">{formatPriceDh(product.priceDh)}</strong></div>
        <Link className="product-card-detail" href={`/produits/${product.slug}`}>Voir le modèle <span aria-hidden="true">↗</span></Link>
        <QuickVariantSelector
          product={{
            slug: product.slug,
            name: product.name,
            imageUrl: product.image?.url ?? null,
            unitPriceDh: product.priceDh,
          }}
          variants={product.variants}
        />
      </div>
    </article>
  );
}
