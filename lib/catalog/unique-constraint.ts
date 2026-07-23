export type UniqueConstraintCode = "DUPLICATE_SLUG" | "DUPLICATE_SKU" | "DUPLICATE_VARIANT" | "UNKNOWN";
export function mapUniqueConstraintTarget(target: unknown): UniqueConstraintCode {
  const fields = Array.isArray(target) ? target.map(String) : typeof target === "string" ? target.split(/[^A-Za-z]+/).filter(Boolean) : [];
  const normalized = new Set(fields.map((field) => field.toLowerCase()));
  if (normalized.has("slug")) return "DUPLICATE_SLUG";
  if (normalized.has("sku")) return "DUPLICATE_SKU";
  if (normalized.has("productid") && normalized.has("size") && normalized.has("color")) return "DUPLICATE_VARIANT";
  return "UNKNOWN";
}
