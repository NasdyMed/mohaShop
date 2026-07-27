export type EditableVariant = {
  id?: string;
  sku: string;
  size: string;
  color: string;
  stock: number;
  historical?: boolean;
  removed?: boolean;
};

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
  const fullSku = [slug, skuPart(color), skuPart(size)].filter(Boolean).join("-");
  if (fullSku.length <= 64) return fullSku;

  const hash = fnv1a(fullSku);
  const prefix = fullSku.slice(0, 64 - hash.length - 1).replace(/-+$/g, "");
  return `${prefix}-${hash}`;
}

function fnv1a(value: string) {
  let hash = 0x811c9dc5;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193);
  }
  return (hash >>> 0).toString(16).toUpperCase().padStart(8, "0");
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

export type VariantMatrixConflict = {
  key: string;
  indexes: number[];
};

export class VariantMatrixConflictError extends Error {
  readonly conflicts: VariantMatrixConflict[];

  constructor(conflicts: VariantMatrixConflict[]) {
    super(`Conflicting existing variant keys at indexes: ${conflicts.map(({ indexes }) => indexes.join(",")).join("; ")}`);
    this.name = "VariantMatrixConflictError";
    this.conflicts = conflicts;
  }
}

function indexExistingVariants(existing: readonly EditableVariant[]) {
  const indexesByKey = new Map<string, number[]>();
  existing.forEach((variant, index) => {
    const key = variantKey(variant.color, variant.size);
    indexesByKey.set(key, [...(indexesByKey.get(key) ?? []), index]);
  });

  const conflicts = [...indexesByKey]
    .filter(([, indexes]) => indexes.length > 1)
    .map(([key, indexes]) => ({ key, indexes }));
  if (conflicts.length > 0) throw new VariantMatrixConflictError(conflicts);

  return new Map(existing.map((variant) => [variantKey(variant.color, variant.size), variant]));
}

export function buildVariantMatrix(
  existing: readonly EditableVariant[],
  selectedColors: readonly string[],
  selectedSizes: readonly string[],
  productSlug: string,
): EditableVariant[] {
  const existingByKey = indexExistingVariants(existing);
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
