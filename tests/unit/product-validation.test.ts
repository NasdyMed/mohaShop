import { describe, expect, it } from "vitest";
import { productInputSchema } from "@/lib/validation/product";

const valid = {
  name: "  Bottes Atlas  ", description: "Une botte solide pour toutes les aventures.", priceDh: 899,
  slug: "bottes-atlas", isVisible: true,
  images: [{ url: "https://example.com/boot.webp", alt: "Botte Atlas", position: 0 }],
  variants: [{ sku: " atlas-38-noir ", size: "38", color: "Noir", stock: 4 }],
};

describe("productInputSchema", () => {
  it("normalise les champs et accepte un produit publiable", () => {
    const parsed = productInputSchema.parse(valid);
    expect(parsed.name).toBe("Bottes Atlas");
    expect(parsed.variants[0].sku).toBe("ATLAS-38-NOIR");
  });

  it("interdit la publication sans image ou déclinaison", () => {
    expect(productInputSchema.safeParse({ ...valid, images: [] }).success).toBe(false);
    expect(productInputSchema.safeParse({ ...valid, variants: [] }).success).toBe(false);
    expect(productInputSchema.safeParse({ ...valid, isVisible: false, images: [], variants: [] }).success).toBe(true);
  });

  it("rejette contrôles, champs inconnus, URL non HTTPS et doublons", () => {
    expect(productInputSchema.safeParse({ ...valid, name: "Mauvais\u0000nom" }).success).toBe(false);
    expect(productInputSchema.safeParse({ ...valid, secret: true }).success).toBe(false);
    expect(productInputSchema.safeParse({ ...valid, images: [{ ...valid.images[0], url: "http://example.com/x" }] }).success).toBe(false);
    expect(productInputSchema.safeParse({ ...valid, images: [valid.images[0], { ...valid.images[0], url: "https://example.com/y" }] }).success).toBe(false);
    expect(productInputSchema.safeParse({ ...valid, variants: [valid.variants[0], { ...valid.variants[0], size: "39" }] }).success).toBe(false);
    expect(productInputSchema.safeParse({ ...valid, variants: [valid.variants[0], { ...valid.variants[0], sku: "OTHER", stock: 1 }] }).success).toBe(false);
  });

  it("applique les bornes numériques et le format du slug/SKU", () => {
    expect(productInputSchema.safeParse({ ...valid, priceDh: 1.5 }).success).toBe(false);
    expect(productInputSchema.safeParse({ ...valid, slug: "Bottes Atlas" }).success).toBe(false);
    expect(productInputSchema.safeParse({ ...valid, variants: [{ ...valid.variants[0], sku: "BAD SKU" }] }).success).toBe(false);
    expect(productInputSchema.safeParse({ ...valid, variants: [{ ...valid.variants[0], stock: Number.MAX_SAFE_INTEGER }] }).success).toBe(false);
  });
});
