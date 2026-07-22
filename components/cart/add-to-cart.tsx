"use client";

import Link from "next/link";
import { useState } from "react";
import type { CatalogVariant } from "@/components/shop/variant-picker";
import { useCart } from "./cart-provider";

export type ProductSnapshot = { slug: string; name: string; imageUrl: string | null; unitPriceDh: number };

export function AddToCart({ product, variant }: { product: ProductSnapshot; variant: CatalogVariant | null }) {
  const { dispatch } = useCart();
  const [quantity, setQuantity] = useState(1);
  const [confirmation, setConfirmation] = useState<{ variantId: string; message: string } | null>(null);
  const available = Boolean(variant && variant.stock > 0);
  const safeQuantity = Math.min(quantity, variant?.stock ?? 1);

  function add() {
    if (!variant || variant.stock < 1) return;
    dispatch({ type: "add", item: { variantId: variant.id, productSlug: product.slug, productName: product.name, imageUrl: product.imageUrl, size: variant.size, color: variant.color, unitPriceDh: product.unitPriceDh, availableStock: variant.stock }, quantity: safeQuantity });
    setConfirmation({ variantId: variant.id, message: `${safeQuantity} ${safeQuantity > 1 ? "articles ajoutés" : "article ajouté"} au panier.` });
  }

  return <div className="add-to-cart">
    <label htmlFor="product-quantity">Quantité</label>
    <input id="product-quantity" type="number" inputMode="numeric" min={1} max={variant?.stock ?? 1} value={safeQuantity} disabled={!available} onChange={(event) => setQuantity(Math.min(Math.max(Math.floor(event.currentTarget.valueAsNumber || 1), 1), variant?.stock ?? 1))} />
    <button type="button" disabled={!available} onClick={add}>{available ? "Ajouter au panier" : "Sélectionnez une variante"}</button>
    <p className="cart-confirmation" aria-live="polite">{confirmation && confirmation.variantId === variant?.id ? <>{confirmation.message} <Link href="/panier">Voir le panier</Link></> : null}</p>
  </div>;
}
