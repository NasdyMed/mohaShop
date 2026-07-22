import Image from "next/image";
import Link from "next/link";

import type { CatalogProductCard } from "@/lib/catalog/queries";

const priceFormatter = new Intl.NumberFormat("fr-MA", { maximumFractionDigits: 0 });

export function formatPriceDh(priceDh: number) {
  return `${priceFormatter.format(priceDh).replace(/\u202f/g, " ")} DH`;
}

export function ProductCard({ product }: { product: CatalogProductCard }) {
  return (
    <article className="product-card">
      <Link href={`/produits/${product.slug}`} aria-label={`Découvrir ${product.name}`}>
        <div className="product-card-media">
          {product.image ? (
            <Image src={product.image.url} alt={product.image.alt} fill sizes="(max-width: 720px) 100vw, 50vw" />
          ) : (
            <div className="image-fallback" role="img" aria-label={`Aperçu indisponible pour ${product.name}`}>
              BB
            </div>
          )}
        </div>
        <div className="product-card-copy">
          <div>
            <h2>{product.name}</h2>
            <p className={product.available ? "available" : "unavailable"}>
              {product.available ? "Disponible" : "Rupture de stock"}
            </p>
          </div>
          <strong>{formatPriceDh(product.priceDh)}</strong>
        </div>
      </Link>
    </article>
  );
}
