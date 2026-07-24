"use client";

import { useCallback, useState } from "react";
import { VariantPicker, type CatalogVariant } from "@/components/shop/variant-picker";
import type { CatalogImage } from "@/lib/catalog/queries";
import { AddToCart, type ProductSnapshot } from "./add-to-cart";

export function ProductPurchase({ product, variants, images = [], onVariantChange }: { product: ProductSnapshot; variants: readonly CatalogVariant[]; images?: readonly CatalogImage[]; onVariantChange?: (variant: CatalogVariant | null) => void }) {
  const [variant, setVariant] = useState<CatalogVariant | null>(null);
  const pickerKey = variants.map(({ id, stock }) => `${id}:${stock}`).join("|");
  const selectVariant = useCallback((next: CatalogVariant | null) => { setVariant(next); onVariantChange?.(next); }, [onVariantChange]);
  const selectedImage = images.find((image) => image.color === variant?.color)
    ?? images.find((image) => image.color === null);
  const selectedProduct = { ...product, imageUrl: selectedImage?.url ?? product.imageUrl };
  return <><VariantPicker key={pickerKey} variants={variants} images={images} onSelect={selectVariant} /><AddToCart key={variant?.id ?? "unselected"} product={selectedProduct} variant={variant} /></>;
}
