"use client";

import { useCallback, useState } from "react";
import { VariantPicker, type CatalogVariant } from "@/components/shop/variant-picker";
import { AddToCart, type ProductSnapshot } from "./add-to-cart";

export function ProductPurchase({ product, variants, onVariantChange }: { product: ProductSnapshot; variants: readonly CatalogVariant[]; onVariantChange?: (variant: CatalogVariant | null) => void }) {
  const [variant, setVariant] = useState<CatalogVariant | null>(null);
  const pickerKey = variants.map(({ id, stock }) => `${id}:${stock}`).join("|");
  const selectVariant = useCallback((next: CatalogVariant | null) => { setVariant(next); onVariantChange?.(next); }, [onVariantChange]);
  return <><VariantPicker key={pickerKey} variants={variants} onSelect={selectVariant} /><AddToCart key={variant?.id ?? "unselected"} product={product} variant={variant} /></>;
}
