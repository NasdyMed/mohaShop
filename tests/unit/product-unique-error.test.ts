import { describe, expect, it } from "vitest";
import { mapUniqueConstraintTarget } from "@/lib/catalog/unique-constraint";
describe("mapUniqueConstraintTarget", () => {
  it.each([[["slug"], "DUPLICATE_SLUG"], ["Product_slug_key", "DUPLICATE_SLUG"], [["sku"], "DUPLICATE_SKU"], ["ProductVariant_sku_key", "DUPLICATE_SKU"], [["productId", "size", "color"], "DUPLICATE_VARIANT"], ["ProductVariant_productId_size_color_key", "DUPLICATE_VARIANT"], [undefined, "UNKNOWN"], [["other"], "UNKNOWN"]] as const)("mappe %j sans deviner", (target, expected) => expect(mapUniqueConstraintTarget(target)).toBe(expected));
});
