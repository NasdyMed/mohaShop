import Link from "next/link";
import { notFound } from "next/navigation";

import { formatPriceDh } from "@/components/shop/product-card";
import { ProductGallery } from "@/components/shop/product-gallery";
import { VariantPicker } from "@/components/shop/variant-picker";
import { getVisibleProduct } from "@/lib/catalog/queries";

export const dynamic = "force-dynamic";

export default async function ProductPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const product = await getVisibleProduct(slug);
  if (!product) notFound();

  return (
    <main>
      <header className="site-header shell"><Link className="brand" href="/">Maison Botte</Link><Link href="/">← Retour à la collection</Link></header>
      <article className="product-detail shell">
        <ProductGallery images={product.images} productName={product.name} />
        <div className="product-info">
          <p className="eyebrow">Botte signature</p>
          <h1>{product.name}</h1>
          <p className="detail-price">{formatPriceDh(product.priceDh)}</p>
          <p className="description">{product.description}</p>
          {product.available ? <VariantPicker variants={product.variants} /> : <p className="sold-out">Rupture de stock</p>}
          <aside className="service-note"><strong>Paiement à la livraison</strong><span>Partout au Maroc, en toute simplicité.</span></aside>
        </div>
      </article>
    </main>
  );
}
