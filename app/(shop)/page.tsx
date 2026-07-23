import Image from "next/image";
import Link from "next/link";
import { CartLink } from "@/components/cart/cart-link";
import { ProductCard } from "@/components/shop/product-card";
import { listVisibleProducts } from "@/lib/catalog/queries";

export const dynamic = "force-dynamic";

export default async function CatalogPage() {
  const products = await listVisibleProducts();
  const heroProduct = products.find((product) => product.image) ?? products[0];
  return <main>
    <header className="site-header shell"><Link className="brand" href="/">Maison Botte</Link><nav className="header-nav" aria-label="Navigation principale"><span>Conçu pour durer · Maroc</span><CartLink /></nav></header>
    <section className="hero hero-editorial shell" aria-labelledby="catalog-title">
      <div className="hero-content"><p className="eyebrow">Collection permanente · 2026</p><h1 id="catalog-title">Des bottes de caractère, pensées pour durer.</h1><p className="hero-copy">Des lignes franches, des tons profonds et le confort d’une paire que l’on garde longtemps.</p><Link className="hero-cta" href="#collection">Découvrir la collection <span aria-hidden="true">↓</span></Link></div>
      <div className="hero-visual">
        <span className="hero-index" aria-hidden="true">01</span>
        {heroProduct?.image ? <Image src={heroProduct.image.url} alt={`${heroProduct.name}, sélection Maison Botte`} fill priority sizes="(max-width: 760px) 100vw, 45vw" /> : <div className="hero-fallback" role="img" aria-label="Sélection Maison Botte">MB</div>}
        <p>{heroProduct?.name ?? "La collection Maison Botte"}</p>
      </div>
    </section>
    <section className="store-promises" aria-label="Nos engagements"><div className="shell">
      <article><span>01</span><strong>Paiement à la livraison</strong><p>Réglez uniquement à la réception.</p></article>
      <article><span>02</span><strong>Livraison partout au Maroc</strong><p>Votre paire arrive directement chez vous.</p></article>
      <article><span>03</span><strong>Commande sans compte</strong><p>Quelques informations suffisent.</p></article>
    </div></section>
    <section className="catalog shell" id="collection" aria-labelledby="collection-title">
      <div className="section-heading"><h2 id="collection-title">Nos modèles</h2><span>{products.length} {products.length > 1 ? "modèles" : "modèle"}</span></div>
      <div className="catalog-layout">
        <aside className="catalog-filters" aria-labelledby="filters-title">
          <h2 id="filters-title">Filtrer par</h2>
          <p>Filtres à venir</p>
        </aside>
        <div className="catalog-results">
          {products.length > 0 ? <div className="product-grid">{products.map((product, index) => <ProductCard key={product.id} product={product} position={index + 1} />)}</div> : <div className="empty-state"><p className="eyebrow">La collection se prépare</p><h2>De nouvelles bottes arrivent bientôt.</h2><p>Revenez dans quelques jours pour découvrir nos prochains modèles.</p></div>}
        </div>
      </div>
    </section>
  </main>;
}
