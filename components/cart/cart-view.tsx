"use client";

import Image from "next/image";
import Link from "next/link";
import { formatPriceDh } from "@/lib/catalog/price";
import { useCart } from "./cart-provider";
import { localizePath } from "@/lib/i18n/config";
import { useStorefrontI18n } from "@/components/shop/locale-provider";

export function CartView() {
  const { locale, dictionary } = useStorefrontI18n();
  const ar = locale === "ar";
  const { dispatch, hydrated, itemCount, items, totalDh } = useCart();
  if (!hydrated) return <div className="cart-status" role="status">{dictionary.common.loading}</div>;
  if (items.length === 0) return <section className="cart-empty"><h1>{dictionary.cart.empty}</h1><Link className="primary-link" href={localizePath("/", locale)}>{dictionary.cart.continueShopping}</Link></section>;

  return <div className="cart-layout">
    <section className="cart-lines" aria-labelledby="cart-title">
      <div className="cart-heading"><div><h1 id="cart-title">{dictionary.cart.title}</h1></div><button className="text-button" type="button" onClick={() => { if (window.confirm(ar ? "هل تريد إفراغ السلة؟" : "Vider tout le panier ?")) dispatch({ type: "clear" }); }}>{ar ? "حذف الكل" : "Tout retirer"}</button></div>
      {items.map((item) => <article className="cart-line" key={item.variantId}>
        <Link className="cart-line-media" href={localizePath(`/produits/${item.productSlug}`, locale)}>{item.imageUrl ? <Image src={item.imageUrl} alt="" fill sizes="112px" unoptimized /> : <span className="cart-image-fallback" aria-hidden="true">MB</span>}</Link>
        <div className="cart-line-copy"><h2><Link href={localizePath(`/produits/${item.productSlug}`, locale)}>{item.productName}</Link></h2><p>{dictionary.colors[item.color] ?? item.color} · {dictionary.product.size} {item.size}</p><p>{formatPriceDh(item.unitPriceDh)} {dictionary.cart.unitPrice}</p></div>
        <div className="cart-line-actions"><label htmlFor={`quantity-${item.variantId}`}>{dictionary.cart.quantity}</label><input id={`quantity-${item.variantId}`} type="number" inputMode="numeric" min={1} max={item.availableStock} value={item.quantity} onChange={(event) => dispatch({ type: "setQuantity", variantId: item.variantId, quantity: event.currentTarget.valueAsNumber })} /><button className="text-button" type="button" onClick={() => dispatch({ type: "remove", variantId: item.variantId })}>{dictionary.cart.remove} <span className="sr-only">{item.productName}, {item.color}, {dictionary.product.size} {item.size}</span></button></div>
      </article>)}
    </section>
    <aside className="cart-summary" aria-labelledby="summary-title"><h2 id="summary-title">{dictionary.cart.summary}</h2><div><span>{itemCount} {itemCount > 1 ? dictionary.common.products : dictionary.common.product}</span><strong>{formatPriceDh(totalDh)}</strong></div><Link className="primary-link" href={localizePath("/commander", locale)}>{dictionary.cart.checkout}</Link></aside>
  </div>;
}
