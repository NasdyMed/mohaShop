import { describe, expect, it } from "vitest";

import {
  buildSuggestedSku,
  buildVariantMatrix,
  productSizes,
  requiresVariantRemovalConfirmation,
  VariantMatrixConflictError,
  variantKey,
} from "@/lib/catalog/variant-matrix";

describe("productSizes", () => {
  it("contains every integer shoe size from 35 through 46 as strings", () => {
    expect(productSizes).toEqual(["35", "36", "37", "38", "39", "40", "41", "42", "43", "44", "45", "46"]);
  });
});

describe("variantKey", () => {
  it("normalizes French casing, Unicode, and whitespace without delimiter collisions", () => {
    expect(variantKey("  ÉCRU   Foncé ", " 38 ")).toBe(variantKey("écru foncé", "38"));
    expect(variantKey("Noir|38", "40")).not.toBe(variantKey("Noir", "38|40"));
  });
});

describe("buildSuggestedSku", () => {
  it("builds an uppercase, diacritic-free SKU", () => {
    expect(buildSuggestedSku("bottine-atlas", "Noir", "38")).toBe("BOTTINE-ATLAS-NOIR-38");
    expect(buildSuggestedSku("bottine atlas", "Cognac foncé", "39")).toBe("BOTTINE-ATLAS-COGNAC-FONCE-39");
  });

  it("uses PRODUIT when the normalized slug is empty", () => {
    expect(buildSuggestedSku(" --- ", "Écru", "40")).toBe("PRODUIT-ECRU-40");
  });

  it("bounds long SKUs to 64 allowed characters with a deterministic hash suffix", () => {
    const sku = buildSuggestedSku(`bottine-${"atlas-".repeat(20)}`, "Cognac foncé", "38");

    expect(sku).toHaveLength(64);
    expect(sku).toMatch(/^[A-Z0-9-]+-[A-F0-9]{8}$/);
  });

  it("keeps long slugs with the same prefix distinct", () => {
    const prefix = `bottine-${"atlas-".repeat(20)}`;

    expect(buildSuggestedSku(`${prefix}alpha`, "Noir", "38")).not.toBe(
      buildSuggestedSku(`${prefix}bravo`, "Noir", "38"),
    );
  });
});

describe("buildVariantMatrix", () => {
  it("builds the color-then-size cartesian product and suggests new variants", () => {
    expect(buildVariantMatrix([], ["Noir", "Cognac"], ["38", "39"], "bottine-atlas")).toEqual([
      { color: "Noir", size: "38", stock: 0, sku: "BOTTINE-ATLAS-NOIR-38" },
      { color: "Noir", size: "39", stock: 0, sku: "BOTTINE-ATLAS-NOIR-39" },
      { color: "Cognac", size: "38", stock: 0, sku: "BOTTINE-ATLAS-COGNAC-38" },
      { color: "Cognac", size: "39", stock: 0, sku: "BOTTINE-ATLAS-COGNAC-39" },
    ]);
  });

  it("preserves the exact matching existing object and all its fields", () => {
    const existing = { id: "variant-1", color: "Noir", size: "38", sku: "CUSTOM", stock: 7, historical: true };
    const result = buildVariantMatrix([existing], [" noir "], [" 38 "], "atlas");

    expect(result[0]).toBe(existing);
    expect(result[0]).toEqual(existing);
  });

  it("deduplicates normalized selections while preserving first-seen order", () => {
    expect(buildVariantMatrix([], [" Cognac ", "Noir", "cognac"], ["39", "38", " 39 "], "atlas")).toEqual([
      { color: "Cognac", size: "39", stock: 0, sku: "ATLAS-COGNAC-39" },
      { color: "Cognac", size: "38", stock: 0, sku: "ATLAS-COGNAC-38" },
      { color: "Noir", size: "39", stock: 0, sku: "ATLAS-NOIR-39" },
      { color: "Noir", size: "38", stock: 0, sku: "ATLAS-NOIR-38" },
    ]);
  });

  it("does not mutate any input", () => {
    const variant = { color: "Noir", size: "38", sku: "N-38", stock: 1 };
    const existing = [variant];
    const colors = ["Noir", "Cognac"];
    const sizes = ["38"];
    const snapshots = structuredClone({ existing, colors, sizes });

    buildVariantMatrix(existing, colors, sizes, "atlas");

    expect({ existing, colors, sizes }).toEqual(snapshots);
  });

  it("throws a typed conflict with useful context for duplicate normalized existing keys without mutation", () => {
    const existing = [
      { id: "one", color: " Noir ", size: "38", sku: "N-38-A", stock: 1 },
      { id: "two", color: "noir", size: " 38 ", sku: "N-38-B", stock: 0 },
    ];
    const snapshot = structuredClone(existing);
    const key = variantKey("Noir", "38");

    expect(() => buildVariantMatrix(existing, ["Noir"], ["38"], "atlas")).toThrowError(
      expect.objectContaining({
        name: "VariantMatrixConflictError",
        conflicts: [{ key, indexes: [0, 1] }],
      }),
    );

    try {
      buildVariantMatrix(existing, ["Noir"], ["38"], "atlas");
    } catch (error) {
      expect(error).toBeInstanceOf(VariantMatrixConflictError);
    }
    expect(existing).toEqual(snapshot);
  });
});

describe("requiresVariantRemovalConfirmation", () => {
  it.each([
    [{ id: "persisted", color: "Noir", size: "38", sku: "N-38", stock: 0 }, true],
    [{ color: "Noir", size: "38", sku: "N-38", stock: 2 }, true],
    [{ color: "Noir", size: "38", sku: "N-38", stock: 0, historical: true }, true],
    [{ color: "Noir", size: "38", sku: "N-38", stock: 0 }, false],
  ])("returns the expected confirmation requirement for %j", (variant, expected) => {
    expect(requiresVariantRemovalConfirmation(variant)).toBe(expected);
  });
});
