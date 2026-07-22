"use client";

import { useEffect, useState } from "react";

export type CatalogVariant = {
  id: string;
  sku: string;
  color: string;
  size: string;
  stock: number;
};

type VariantPickerProps = {
  variants: readonly CatalogVariant[];
  onSelect?: (variant: CatalogVariant | null) => void;
};

export function VariantPicker({ variants, onSelect }: VariantPickerProps) {
  const [chosenColor, setColor] = useState<string | null>(null);
  const [chosenSize, setSize] = useState<string | null>(null);
  const colors = [...new Set(variants.map((variant) => variant.color))];
  const sizes = [...new Set(variants.map((variant) => variant.size))];
  const color = chosenColor && colors.includes(chosenColor) ? chosenColor : null;
  const size = chosenSize && variants.some(
    (variant) => variant.color === color && variant.size === chosenSize && variant.stock > 0,
  ) ? chosenSize : null;
  const selected = variants.find(
    (variant) => variant.color === color && variant.size === size && variant.stock > 0,
  );
  const selectedCombination = variants.find(
    (variant) => variant.color === color && variant.size === size,
  );

  useEffect(() => {
    if (chosenColor !== color || chosenSize !== size) {
      onSelect?.(null);
    }
  }, [chosenColor, chosenSize, color, onSelect, size]);

  function chooseColor(nextColor: string) {
    setColor(nextColor);
    const next = variants.find(
      (variant) => variant.color === nextColor && variant.size === size && variant.stock > 0,
    );
    if (!next) setSize(null);
    onSelect?.(next ?? null);
  }

  function chooseSize(nextSize: string) {
    setSize(nextSize);
    const next = variants.find(
      (variant) => variant.color === color && variant.size === nextSize && variant.stock > 0,
    );
    onSelect?.(next ?? null);
  }

  return (
    <div className="variant-picker">
      <fieldset>
        <legend>Couleur</legend>
        <div className="option-row">
          {colors.map((option) => {
            const available = variants.some((variant) => variant.color === option && variant.stock > 0);
            return (
              <label className="variant-option" key={option}>
                <input
                  type="radio"
                  name="color"
                  value={option}
                  checked={color === option}
                  disabled={!available}
                  onChange={() => chooseColor(option)}
                />
                <span>{option}</span>
              </label>
            );
          })}
        </div>
      </fieldset>

      <fieldset>
        <legend>Pointure</legend>
        <div className="option-row">
          {sizes.map((option) => {
            const matching = color
              ? variants.find((variant) => variant.color === color && variant.size === option)
              : undefined;
            const available = Boolean(matching && matching.stock > 0);
            const soldOut = Boolean(matching && matching.stock === 0);
            return (
              <label className="variant-option" key={option}>
                <input
                  type="radio"
                  name="size"
                  value={option}
                  checked={size === option}
                  disabled={!available}
                  aria-label={soldOut ? `${option} — Rupture de stock` : option}
                  onChange={() => chooseSize(option)}
                />
                <span>
                  {option}
                  {soldOut ? <small>Rupture de stock</small> : null}
                </span>
              </label>
            );
          })}
        </div>
      </fieldset>

      <p className="stock-cue" aria-live="polite">
        {selected
          ? selected.stock <= 3
            ? `Plus que ${selected.stock} en stock`
            : `${selected.stock} disponibles`
          : selectedCombination?.stock === 0
            ? "Rupture de stock"
            : color
              ? "Choisissez maintenant une pointure."
            : "Choisissez une couleur et une pointure disponibles."}
      </p>
      <button className="purchase-placeholder" type="button" disabled>
        Sélectionnez une variante pour continuer
      </button>
    </div>
  );
}
