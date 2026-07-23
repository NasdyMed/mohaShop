import Link from "next/link";

export default function NotFound() {
  return <main className="shell error-page"><section className="error-card" aria-labelledby="not-found-title"><p className="eyebrow">Erreur 404</p><h1 id="not-found-title">Cette page est introuvable.</h1><p>Elle a peut-être été déplacée ou n’existe plus.</p><div className="empty-actions"><Link className="primary-link" href="/">Voir la collection</Link><Link className="secondary-link" href="/panier">Voir le panier</Link></div></section></main>;
}
