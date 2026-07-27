import Image from "next/image";
import Link from "next/link";

import { HeroMedia } from "@/components/shop/hero-media";
import { ProductCard } from "@/components/shop/product-card";
import { listVisibleProducts } from "@/lib/catalog/queries";
import { listVisibleHeroVideos } from "@/lib/hero/queries";
import { localizePath, type Locale } from "@/lib/i18n/config";
import { getDictionary } from "@/lib/i18n/dictionaries";
import { localizeProduct } from "@/lib/i18n/product";

export async function CatalogPageView({ locale }: { locale: Locale }) {
  const dictionary = getDictionary(locale);
  const [products, heroVideos] = await Promise.all([
    listVisibleProducts(),
    listVisibleHeroVideos(),
  ]);
  const heroProduct = products.find((product) => product.image) ?? products[0];
  const localizedHero = heroProduct ? localizeProduct(heroProduct, locale) : null;

  return <main>
    <section className="hero hero-editorial shell" aria-labelledby="catalog-title">
      <div className="hero-content"><p className="eyebrow">{dictionary.home.eyebrow}</p><h1 id="catalog-title">{dictionary.home.title}</h1><p className="hero-copy">{dictionary.home.intro}</p><Link className="hero-cta" href="#collection">{locale === "fr" ? "Découvrir la collection" : "اكتشف المجموعة"} <span aria-hidden="true">↓</span></Link></div>
      <div className="hero-visual">
        <span className="hero-index" aria-hidden="true">01</span>
        <HeroMedia videos={heroVideos} fallback={<>
          {heroProduct?.image ? <Image src={heroProduct.image.url} alt={`${localizedHero?.name}, ${locale === "fr" ? "sélection " : ""}Maison Botte`} fill priority sizes="(max-width: 760px) 100vw, 45vw" /> : <div className="hero-fallback" role="img" aria-label="Maison Botte">MB</div>}
          <p>{localizedHero?.name ?? "Maison Botte"}</p>
        </>} />
      </div>
    </section>
    <section className="store-promises" aria-label={dictionary.home.allProducts}><div className="shell">
      <article><span>01</span><strong>{dictionary.promises.payment}</strong><p>{dictionary.promises.paymentCopy}</p></article>
      <article><span>02</span><strong>{dictionary.promises.delivery}</strong><p>{dictionary.promises.deliveryCopy}</p></article>
      <article><span>03</span><strong>{dictionary.promises.guest}</strong><p>{dictionary.promises.guestCopy}</p></article>
    </div></section>
    <section className="catalog shell" id="collection" aria-labelledby="collection-title">
      <div className="section-heading"><h2 id="collection-title">{dictionary.home.allProducts}</h2><span>{products.length} {products.length > 1 ? dictionary.home.models : dictionary.home.model}</span></div>
      <div className="catalog-layout">
        <aside className="catalog-filters" aria-labelledby="filters-title"><h2 id="filters-title">{dictionary.home.filters}</h2><p>{dictionary.home.filtersSoon}</p></aside>
        <div className="catalog-results">
          {products.length > 0 ? <div className="product-grid">{products.map((product) => <ProductCard key={product.id} product={product} />)}</div> : <div className="empty-state"><h2>{dictionary.home.empty}</h2><Link href={localizePath("/", locale)}>{dictionary.confirmation.back}</Link></div>}
        </div>
      </div>
    </section>
  </main>;
}
