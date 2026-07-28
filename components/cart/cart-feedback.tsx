"use client";

import Link from "next/link";
import { useEffect } from "react";
import { useStorefrontI18n } from "@/components/shop/locale-provider";
import { localizePath } from "@/lib/i18n/config";
import { WhatsAppLink } from "./whatsapp-link";

type CartFeedbackProps = {
  clearNotice: () => void;
  hydrated: boolean;
  itemCount: number;
  notice: { id: number; message: string } | null;
};

export function CartFeedback({ clearNotice, hydrated, itemCount, notice }: CartFeedbackProps) {
  const { locale, dictionary } = useStorefrontI18n();
  useEffect(() => {
    if (!notice) return;
    const timeout = window.setTimeout(clearNotice, 4000);
    return () => window.clearTimeout(timeout);
  }, [clearNotice, notice]);

  const itemLabel = `${itemCount} ${itemCount > 1 ? dictionary.common.products : dictionary.common.product}`;

  return <>
    {notice ? (
      <aside className="cart-toast" role="status" aria-live="polite">
        <span className="cart-toast-check" aria-hidden="true">✓</span>
        <div><strong>{dictionary.cart.added}</strong><p>{notice.message}</p><Link href={localizePath("/panier", locale)}>{dictionary.cart.viewCart} <span aria-hidden="true">→</span></Link></div>
        <button type="button" aria-label={dictionary.common.close} onClick={clearNotice}>×</button>
      </aside>
    ) : null}
    <WhatsAppLink />
    <Link
      className={`floating-cart${notice ? " is-adding" : ""}`}
      href={localizePath("/panier", locale)}
      aria-label={`${locale === "fr" ? "Ouvrir le panier" : dictionary.navigation.cart}, ${hydrated ? itemLabel : dictionary.common.loading}`}
    >
      <svg aria-hidden="true" viewBox="0 0 24 24"><path d="M3 4h2l2.2 10.1a2 2 0 0 0 2 1.6h7.9a2 2 0 0 0 1.9-1.4L21 8H6.1M10 20a1 1 0 1 1-2 0 1 1 0 0 1 2 0Zm9 0a1 1 0 1 1-2 0 1 1 0 0 1 2 0Z"/></svg>
      {hydrated ? <span className="floating-cart-count" aria-hidden="true">{itemCount}</span> : null}
    </Link>
  </>;
}
