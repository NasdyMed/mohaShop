"use client";

import { useEffect, useState } from "react";

import { colorSwatch } from "@/lib/catalog/color-swatches";

export type CatalogVariant = { id: string; sku: string; color: string; size: string; stock: number };
type VariantPickerProps = { variants: readonly CatalogVariant[]; onSelect?: (variant: CatalogVariant | null) => void };

export function VariantPicker({ variants, onSelect }: VariantPickerProps) {
  const initial = variants.find((variant) => variant.stock > 0) ?? null;
  const [chosenColor, setColor] = useState<string | null>(() => initial?.color ?? null);
  const [chosenSize, setSize] = useState<string | null>(() => initial?.size ?? null);
  const colors = [...new Set(variants.map((variant) => variant.color))];
  const sizes = [...new Set(variants.map((variant) => variant.size))];
  const stateSelected = variants.find((variant) => variant.color === chosenColor && variant.size === chosenSize && variant.stock > 0) ?? null;
  const selected = stateSelected ?? variants.find((variant) => variant.stock > 0) ?? null;
  const effectiveColor = selected?.color ?? null;
  const effectiveSize = selected?.size ?? null;
  const selectedCombination = variants.find((variant) => variant.color === effectiveColor && variant.size === effectiveSize);

  useEffect(() => {
    onSelect?.(selected);
  }, [onSelect, selected, variants]);

  function chooseColor(nextColor: string) {
    const next = variants.find((variant) => variant.color === nextColor && variant.stock > 0) ?? null;
    setColor(next?.color ?? null);
    setSize(next?.size ?? null);
  }

  function chooseSize(nextSize: string) {
    setSize(nextSize);
  }

  return <div className="variant-picker">
    <fieldset>
      <legend>Couleur <strong>{effectiveColor}</strong></legend>
      <div className="option-row color-option-row">{colors.map((option) => {
        const available = variants.some((variant) => variant.color === option && variant.stock > 0);
        return <label className={`variant-color-option${available ? "" : " is-sold-out"}`} key={option} title={option}>
          <input type="radio" name="color" value={option} aria-label={available ? option : `${option} — Rupture de stock`} checked={effectiveColor === option} disabled={!available} onChange={() => chooseColor(option)}/>
          <span style={{ backgroundColor: colorSwatch(option).background }} aria-hidden="true"/>
        </label>;
      })}</div>
    </fieldset>
    <fieldset>
      <legend>Pointure <strong>{effectiveSize}</strong></legend>
      <div className="option-row">{sizes.map((option) => {
        const matching = effectiveColor ? variants.find((variant) => variant.color === effectiveColor && variant.size === option) : undefined;
        const available = Boolean(matching && matching.stock > 0);
        const soldOut = !matching || matching.stock === 0;
        return <label className="variant-option" key={option}><input type="radio" name="size" value={option} checked={effectiveSize === option} disabled={!available} aria-label={soldOut ? `${option} — Rupture de stock` : option} onChange={() => chooseSize(option)}/><span>{option}{soldOut ? <small>Rupture de stock</small> : null}</span></label>;
      })}</div>
    </fieldset>
    <p className="stock-cue" aria-live="polite">{selected ? selected.stock <= 3 ? `Plus que ${selected.stock} en stock` : `${selected.stock} disponibles` : selectedCombination?.stock === 0 ? "Rupture de stock" : "Aucune combinaison disponible."}</p>
  </div>;
}
