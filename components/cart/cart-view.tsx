"use client";

import Image from "next/image";
import Link from "next/link";
import { formatPriceDh } from "@/lib/catalog/price";
import { useCart } from "./cart-provider";

export function CartView() {
  const { dispatch, hydrated, itemCount, items, totalDh } = useCart();
  if (!hydrated) return <div className="cart-status" role="status">Chargement de votre panier…</div>;
  if (items.length === 0) return <section className="cart-empty"><p className="eyebrow">Votre sélection</p><h1>Votre panier est vide.</h1><p>Découvrez nos bottes pensées pour vous accompagner longtemps.</p><Link className="primary-link" href="/">Voir la collection</Link></section>;

  return <div className="cart-layout">
    <section className="cart-lines" aria-labelledby="cart-title">
      <div className="cart-heading"><div><p className="eyebrow">Votre sélection</p><h1 id="cart-title">Panier</h1></div><button className="text-button" type="button" onClick={() => { if (window.confirm("Vider tout le panier ?")) dispatch({ type: "clear" }); }}>Tout retirer</button></div>
      {items.map((item) => <article className="cart-line" key={item.variantId}>
        <Link className="cart-line-media" href={`/produits/${item.productSlug}`}>{item.imageUrl ? <Image src={item.imageUrl} alt="" fill sizes="112px" unoptimized /> : <span className="cart-image-fallback" aria-hidden="true">MB</span>}</Link>
        <div className="cart-line-copy"><h2><Link href={`/produits/${item.productSlug}`}>{item.productName}</Link></h2><p>{item.color} · Pointure {item.size}</p><p>{formatPriceDh(item.unitPriceDh)} l’unité</p></div>
        <div className="cart-line-actions"><label htmlFor={`quantity-${item.variantId}`}>Quantité</label><input id={`quantity-${item.variantId}`} type="number" inputMode="numeric" min={1} max={item.availableStock} value={item.quantity} onChange={(event) => dispatch({ type: "setQuantity", variantId: item.variantId, quantity: event.currentTarget.valueAsNumber })} /><button className="text-button" type="button" onClick={() => dispatch({ type: "remove", variantId: item.variantId })}>Retirer <span className="sr-only">{item.productName}, {item.color}, pointure {item.size}</span></button></div>
      </article>)}
    </section>
    <aside className="cart-summary" aria-labelledby="summary-title"><h2 id="summary-title">Récapitulatif</h2><div><span>{itemCount} {itemCount > 1 ? "articles" : "article"}</span><strong>{formatPriceDh(totalDh)}</strong></div><p>Les prix et disponibilités seront confirmés lors de la commande.</p><Link className="primary-link" href="/commander">Continuer vers la commande</Link></aside>
  </div>;
}
