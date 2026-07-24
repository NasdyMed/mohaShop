"use client";

import { useMemo, useState } from "react";

import { useCart } from "@/components/cart/cart-provider";
import { colorSwatch } from "@/lib/catalog/color-swatches";
import type { CatalogVariant } from "@/lib/catalog/queries";

type QuickVariantSelectorProps = {
  product: {
    slug: string;
    name: string;
    imageUrl: string | null;
    unitPriceDh: number;
  };
  variants: CatalogVariant[];
  onColorChange?: (color: string) => void;
};

export function QuickVariantSelector({ product, variants, onColorChange }: QuickVariantSelectorProps) {
  const { dispatch, hydrated } = useCart();
  const groups = useMemo(() => {
    const byColor = new Map<string, CatalogVariant[]>();
    for (const variant of variants) {
      const current = byColor.get(variant.color) ?? [];
      current.push(variant);
      byColor.set(variant.color, current);
    }
    return [...byColor.entries()].map(([color, colorVariants]) => ({
      color,
      variants: colorVariants,
      available: colorVariants.some((variant) => variant.stock > 0),
    }));
  }, [variants]);
  const firstAvailableColor = groups.find((group) => group.available)?.color ?? "";
  const [open, setOpen] = useState(false);
  const [selectedColor, setSelectedColor] = useState(firstAvailableColor);
  const [selectedVariantId, setSelectedVariantId] = useState("");
  const [message, setMessage] = useState("");
  const activeGroup = groups.find((group) => group.color === selectedColor);
  const selectedVariant = activeGroup?.variants.find((variant) => variant.id === selectedVariantId);
  const available = groups.some((group) => group.available);

  function chooseColor(color: string) {
    setSelectedColor(color);
    setSelectedVariantId("");
    setMessage("");
    onColorChange?.(color);
  }

  function addSelected() {
    if (!selectedVariant || selectedVariant.stock < 1 || !hydrated) return;
    dispatch({
      type: "add",
      item: {
        variantId: selectedVariant.id,
        productSlug: product.slug,
        productName: product.name,
        imageUrl: product.imageUrl,
        size: selectedVariant.size,
        color: selectedVariant.color,
        unitPriceDh: product.unitPriceDh,
        availableStock: selectedVariant.stock,
      },
      quantity: 1,
    });
    setMessage(`${product.name}, taille ${selectedVariant.size}, ajouté au panier.`);
  }

  return (
    <div className="quick-variant-panel">
      <fieldset className="quick-color-fieldset">
        <legend>Couleur <span>{selectedColor}</span></legend>
        <div className="quick-color-options">
          {groups.map((group) => {
            const soldOut = !group.available;
            const swatch = colorSwatch(group.color);
            return (
              <label className={`quick-color-option${soldOut ? " is-sold-out" : ""}`} key={group.color}>
                <input
                  className="quick-variant-radio"
                  type="radio"
                  name={`quick-color-${product.slug}`}
                  value={group.color}
                  checked={selectedColor === group.color}
                  disabled={soldOut}
                  aria-label={`${group.color}${soldOut ? " — épuisée" : ""}`}
                  onChange={() => chooseColor(group.color)}
                />
                <span className="quick-color-swatch" data-known-color={swatch.known} style={{ backgroundColor: swatch.background }} aria-hidden="true" />
              </label>
            );
          })}
        </div>
      </fieldset>

      {!available ? <p className="quick-sold-out">Rupture de stock</p> : !open ? (
        <button className="quick-open" type="button" disabled={!hydrated} onClick={() => setOpen(true)}>Choisir une taille</button>
      ) : <><fieldset className="quick-size-fieldset">
        <legend>Pointure</legend>
        <div className="quick-size-options">
          {activeGroup?.variants.map((variant) => {
            const soldOut = variant.stock < 1;
            return (
              <label className={`quick-size-option${soldOut ? " is-sold-out" : ""}`} key={variant.id}>
                <input
                  className="quick-variant-radio"
                  type="radio"
                  name={`quick-size-${product.slug}`}
                  value={variant.id}
                  checked={selectedVariantId === variant.id}
                  disabled={soldOut}
                  aria-label={`Pointure ${variant.size}${soldOut ? " — épuisée" : ""}`}
                  onChange={() => { setSelectedVariantId(variant.id); setMessage(""); }}
                />
                <span aria-hidden="true">{variant.size}</span>
              </label>
            );
          })}
        </div>
      </fieldset>
      <button className="quick-add" type="button" disabled={!hydrated || !selectedVariant} onClick={addSelected}>Ajouter au panier</button>
      <p className="quick-confirmation" role="status" aria-live="polite">{message}</p></>}
    </div>
  );
}
