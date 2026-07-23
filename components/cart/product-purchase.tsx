"use client";

import { useState } from "react";
import { VariantPicker, type CatalogVariant } from "@/components/shop/variant-picker";
import { AddToCart, type ProductSnapshot } from "./add-to-cart";

export function ProductPurchase({ product, variants }: { product: ProductSnapshot; variants: readonly CatalogVariant[] }) {
  const [variant, setVariant] = useState<CatalogVariant | null>(null);
  const pickerKey = variants.map(({ id, stock }) => `${id}:${stock}`).join("|");
  return <><VariantPicker key={pickerKey} variants={variants} onSelect={setVariant} /><AddToCart key={variant?.id ?? "unselected"} product={product} variant={variant} /></>;
}
