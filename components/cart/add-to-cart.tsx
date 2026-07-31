"use client";

import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import type { CatalogVariant } from "@/components/shop/variant-picker";
import { useCart } from "./cart-provider";
import { localizePath } from "@/lib/i18n/config";
import { useStorefrontI18n } from "@/components/shop/locale-provider";

export type ProductSnapshot = { slug: string; name: string; imageUrl: string | null; unitPriceDh: number };

export function AddToCart({ product, variant }: { product: ProductSnapshot; variant: CatalogVariant | null }) {
  const { locale, dictionary } = useStorefrontI18n();
  const router = useRouter();
  const { dispatch } = useCart();
  const [quantity, setQuantity] = useState(1);
  const [pending, setPending] = useState(false);
  const submitLocked = useRef(false);
  const addedRequest = useRef<string | null>(null);
  const available = Boolean(variant && variant.stock > 0);
  const safeQuantity = Math.min(quantity, variant?.stock ?? 1);

  function order() {
    if (!variant || variant.stock < 1 || submitLocked.current) return;

    submitLocked.current = true;
    setPending(true);
    const requestKey = `${variant.id}:${safeQuantity}`;

    try {
      if (addedRequest.current !== requestKey) {
        dispatch({ type: "add", item: { variantId: variant.id, productSlug: product.slug, productName: product.name, imageUrl: product.imageUrl, size: variant.size, color: variant.color, unitPriceDh: product.unitPriceDh, availableStock: variant.stock }, quantity: safeQuantity });
        addedRequest.current = requestKey;
      }
      router.push(localizePath("/commander", locale));
    } catch {
      submitLocked.current = false;
      setPending(false);
    }
  }

  return <div className="add-to-cart">
    <label htmlFor="product-quantity">{dictionary.cart.quantity}</label>
    <input id="product-quantity" type="number" inputMode="numeric" min={1} max={variant?.stock ?? 1} value={safeQuantity} disabled={!available} onChange={(event) => setQuantity(Math.min(Math.max(Math.floor(event.currentTarget.valueAsNumber || 1), 1), variant?.stock ?? 1))} />
    <button type="button" disabled={!available || pending} onClick={order}>{!available ? dictionary.product.selectVariant : pending ? dictionary.product.redirecting : dictionary.product.orderNow}</button>
  </div>;
}
