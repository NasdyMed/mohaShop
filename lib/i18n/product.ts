import type { Locale } from "./config";

type TranslatableProduct = {
  name: string;
  description: string;
  nameAr?: string | null;
  descriptionAr?: string | null;
};

export function localizeProduct<T extends TranslatableProduct>(product: T, locale: Locale): T {
  if (locale === "fr") return product;
  return {
    ...product,
    name: product.nameAr?.trim() || product.name,
    description: product.descriptionAr?.trim() || product.description,
  };
}
