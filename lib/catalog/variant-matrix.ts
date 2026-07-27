import type { EditableVariant } from "@/components/admin/variant-editor";

export const productSizes = [
  "35",
  "36",
  "37",
  "38",
  "39",
  "40",
  "41",
  "42",
  "43",
  "44",
  "45",
  "46",
] as const;

function normalizeWhitespace(value: string) {
  return value.normalize("NFC").trim().replace(/\s+/g, " ");
}

function normalizeKeyPart(value: string) {
  return normalizeWhitespace(value).toLocaleLowerCase("fr");
}

export function variantKey(color: string, size: string) {
  return JSON.stringify([normalizeKeyPart(color), normalizeKeyPart(size)]);
}

function skuPart(value: string) {
  return value
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function buildSuggestedSku(productSlug: string, color: string, size: string) {
  const slug = skuPart(productSlug) || "PRODUIT";
  return [slug, skuPart(color), skuPart(size)].filter(Boolean).join("-");
}

function uniqueSelections(values: readonly string[]) {
  const seen = new Set<string>();
  const unique: string[] = [];

  for (const value of values) {
    const displayValue = normalizeWhitespace(value);
    const key = normalizeKeyPart(displayValue);
    if (seen.has(key)) continue;
    seen.add(key);
    unique.push(displayValue);
  }

  return unique;
}

export function buildVariantMatrix(
  existing: readonly EditableVariant[],
  selectedColors: readonly string[],
  selectedSizes: readonly string[],
  productSlug: string,
): EditableVariant[] {
  const existingByKey = new Map(existing.map((variant) => [variantKey(variant.color, variant.size), variant]));
  const colors = uniqueSelections(selectedColors);
  const sizes = uniqueSelections(selectedSizes);

  return colors.flatMap((color) =>
    sizes.map((size) =>
      existingByKey.get(variantKey(color, size)) ?? {
        color,
        size,
        stock: 0,
        sku: buildSuggestedSku(productSlug, color, size),
      },
    ),
  );
}

export function requiresVariantRemovalConfirmation(variant: EditableVariant) {
  return Boolean(variant.id) || variant.stock > 0 || variant.historical === true;
}
