"use client";

import Link from "next/link";
import { useEffect } from "react";

type CartFeedbackProps = {
  clearNotice: () => void;
  hydrated: boolean;
  itemCount: number;
  notice: { id: number; message: string } | null;
};

export function CartFeedback({ clearNotice, hydrated, itemCount, notice }: CartFeedbackProps) {
  useEffect(() => {
    if (!notice) return;
    const timeout = window.setTimeout(clearNotice, 4000);
    return () => window.clearTimeout(timeout);
  }, [clearNotice, notice]);

  const itemLabel = `${itemCount} ${itemCount > 1 ? "articles" : "article"}`;

  return <>
    {notice ? (
      <aside className="cart-toast" role="status" aria-live="polite">
        <span className="cart-toast-check" aria-hidden="true">✓</span>
        <div><strong>Ajouté au panier</strong><p>{notice.message}</p><Link href="/panier">Voir le panier <span aria-hidden="true">→</span></Link></div>
        <button type="button" aria-label="Fermer la notification" onClick={clearNotice}>×</button>
      </aside>
    ) : null}
    <Link
      className={`floating-cart${notice ? " is-adding" : ""}`}
      href="/panier"
      aria-label={`Ouvrir le panier, ${hydrated ? itemLabel : "chargement"}`}
    >
      <svg aria-hidden="true" viewBox="0 0 24 24"><path d="M3 4h2l2.2 10.1a2 2 0 0 0 2 1.6h7.9a2 2 0 0 0 1.9-1.4L21 8H6.1M10 20a1 1 0 1 1-2 0 1 1 0 0 1 2 0Zm9 0a1 1 0 1 1-2 0 1 1 0 0 1 2 0Z"/></svg>
      {hydrated ? <span className="floating-cart-count" aria-hidden="true">{itemCount}</span> : null}
    </Link>
  </>;
}
