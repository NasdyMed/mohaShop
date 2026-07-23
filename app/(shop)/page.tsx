import Link from "next/link";
import { CartLink } from "@/components/cart/cart-link";
import { ProductCard } from "@/components/shop/product-card";
import { listVisibleProducts } from "@/lib/catalog/queries";

export const dynamic = "force-dynamic";

export default async function CatalogPage() {
  const products = await listVisibleProducts();
  return <main>
    <header className="site-header shell"><Link className="brand" href="/">Maison Botte</Link><nav className="header-nav" aria-label="Navigation principale"><span>Conçu pour durer · Maroc</span><CartLink /></nav></header>
    <section className="hero shell" aria-labelledby="catalog-title"><p className="eyebrow">Collection permanente</p><h1 id="catalog-title">Des bottes de caractère, faites pour le quotidien.</h1><p className="hero-copy">Des lignes franches, des tons profonds et le confort d’une paire que l’on garde longtemps.</p></section>
    <section className="catalog shell" aria-labelledby="collection-title">
      <div className="section-heading"><h2 id="collection-title">Nos modèles</h2><span>{products.length} {products.length > 1 ? "modèles" : "modèle"}</span></div>
      <div className="catalog-layout">
        <aside className="catalog-filters" aria-labelledby="filters-title">
          <h2 id="filters-title">Filtrer par</h2>
          <p>Filtres à venir</p>
        </aside>
        <div className="catalog-results">
          {products.length > 0 ? <div className="product-grid">{products.map((product) => <ProductCard key={product.id} product={product} />)}</div> : <div className="empty-state"><p className="eyebrow">La collection se prépare</p><h2>De nouvelles bottes arrivent bientôt.</h2><p>Revenez dans quelques jours pour découvrir nos prochains modèles.</p></div>}
        </div>
      </div>
    </section>
  </main>;
}
