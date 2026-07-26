"use client";

import { useMemo, useState } from "react";

import { colorSwatch } from "@/lib/catalog/color-swatches";
import type { CatalogVariant } from "@/lib/catalog/queries";
import { useStorefrontI18n } from "./locale-provider";

type QuickVariantSelectorProps = {
  productSlug: string;
  variants: CatalogVariant[];
  onColorChange?: (color: string) => void;
};

export function QuickVariantSelector({ productSlug, variants, onColorChange }: QuickVariantSelectorProps) {
  const { locale, dictionary } = useStorefrontI18n();
  const groups = useMemo(() => {
    const byColor = new Map<string, CatalogVariant[]>();
    for (const variant of variants) {
      const current = byColor.get(variant.color) ?? [];
      current.push(variant);
      byColor.set(variant.color, current);
    }
    return [...byColor.entries()].map(([color, colorVariants]) => ({
      color,
      available: colorVariants.some((variant) => variant.stock > 0),
    }));
  }, [variants]);
  const firstAvailableColor = groups.find((group) => group.available)?.color ?? groups[0]?.color ?? "";
  const [selectedColor, setSelectedColor] = useState(firstAvailableColor);

  function chooseColor(color: string) {
    setSelectedColor(color);
    onColorChange?.(color);
  }

  return (
    <fieldset className="quick-color-fieldset">
      <legend className="sr-only">{dictionary.product.color}</legend>
      <div className="quick-color-options">
        {groups.map((group) => {
          const soldOut = !group.available;
          const swatch = colorSwatch(group.color);
          return (
            <label className={`quick-color-option${soldOut ? " is-sold-out" : ""}`} key={group.color} title={dictionary.colors[group.color] ?? group.color}>
              <input
                className="quick-variant-radio"
                type="radio"
                name={`quick-color-${productSlug}`}
                value={group.color}
                checked={selectedColor === group.color}
                disabled={soldOut}
                aria-label={`${dictionary.colors[group.color] ?? group.color}${soldOut ? ` — ${locale === "fr" ? "épuisée" : dictionary.stock.outOfStock}` : ""}`}
                onChange={() => chooseColor(group.color)}
              />
              <span className="quick-color-swatch" data-known-color={swatch.known} style={{ backgroundColor: swatch.background }} aria-hidden="true" />
            </label>
          );
        })}
      </div>
    </fieldset>
  );
}
