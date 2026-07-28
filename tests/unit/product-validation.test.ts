import { describe, expect, it } from "vitest";
import { productInputSchema } from "@/lib/validation/product";

const valid = {
  name: "  Bottes Atlas  ", description: "Une botte solide pour toutes les aventures.", priceDh: 899,
  slug: "bottes-atlas", isVisible: true,
  images: [{ url: "https://images.unsplash.com/boot.webp", alt: "Botte Atlas", position: 0, color: "Noir" }],
  variants: [{ sku: " atlas-38-noir ", size: "38", color: "Noir", stock: 4 }],
};

describe("productInputSchema", () => {
  it("normalise les champs et accepte un produit publiable", () => {
    const parsed = productInputSchema.parse(valid);
    expect(parsed.name).toBe("Bottes Atlas");
    expect(parsed.nameAr).toBeNull();
    expect(parsed.descriptionAr).toBeNull();
    expect(parsed.variants[0].sku).toBe("ATLAS-38-NOIR");
  });

  it("normalise les traductions arabes facultatives", () => {
    const parsed = productInputSchema.parse({ ...valid, nameAr: "  حذاء أطلس  ", descriptionAr: "  حذاء مريح وأنيق مناسب للاستعمال اليومي في المغرب.  " });
    expect(parsed.nameAr).toBe("حذاء أطلس");
    expect(parsed.descriptionAr).toBe("حذاء مريح وأنيق مناسب للاستعمال اليومي في المغرب.");
    expect(productInputSchema.safeParse({ ...valid, nameAr: "ا" }).success).toBe(false);
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
    expect(productInputSchema.safeParse({ ...valid, images: [valid.images[0], { ...valid.images[0], url: "https://images.unsplash.com/y" }] }).success).toBe(false);
    expect(productInputSchema.safeParse({ ...valid, variants: [valid.variants[0], { ...valid.variants[0], size: "39" }] }).success).toBe(false);
    expect(productInputSchema.safeParse({ ...valid, variants: [valid.variants[0], { ...valid.variants[0], sku: "OTHER", stock: 1 }] }).success).toBe(false);
  });

  it("applique les bornes numériques et le format du slug/SKU", () => {
    expect(productInputSchema.safeParse({ ...valid, priceDh: 1.5 }).success).toBe(false);
    expect(productInputSchema.safeParse({ ...valid, slug: "Bottes Atlas" }).success).toBe(false);
    expect(productInputSchema.safeParse({ ...valid, variants: [{ ...valid.variants[0], sku: "BAD SKU" }] }).success).toBe(false);
    expect(productInputSchema.safeParse({ ...valid, variants: [{ ...valid.variants[0], stock: Number.MAX_SAFE_INTEGER }] }).success).toBe(false);
  });
  it("rejette les identifiants persistés dupliqués au second chemin", () => {
    const imageId = "cm12345678901234567890123";
    const variantId = "cm22345678901234567890123";
    const result = productInputSchema.safeParse({ ...valid,
      images: [{ ...valid.images[0], id: imageId }, { ...valid.images[0], id: imageId, url: "https://images.unsplash.com/other.webp", position: 1 }],
      variants: [{ ...valid.variants[0], id: variantId }, { ...valid.variants[0], id: variantId, sku: "OTHER", size: "39" }],
    });
    expect(result.success).toBe(false);
    if (!result.success) expect(result.error.issues).toEqual(expect.arrayContaining([
      expect.objectContaining({ path: ["images", 1, "id"] }), expect.objectContaining({ path: ["variants", 1, "id"] }),
    ]));
  });
  it("requires a known variant color for every image", () => {
    expect(productInputSchema.safeParse(valid).success).toBe(true);
    expect(productInputSchema.safeParse({ ...valid, images: [{ ...valid.images[0], color: null }] }).success).toBe(false);
    const result = productInputSchema.safeParse({ ...valid, images: [{ ...valid.images[0], color: "Rose" }] });
    expect(result.success).toBe(false);
    if (!result.success) expect(result.error.issues[0].path).toEqual(["images", 0, "color"]);
  });
  it("accepts six images per color and rejects the seventh at its color path", () => {
    const makeImages = (color: string, count: number, offset = 0) => Array.from({ length: count }, (_, index) => ({
      ...valid.images[0], url: `https://images.unsplash.com/${color}-${index}.webp`, color, position: offset + index,
    }));
    expect(productInputSchema.safeParse({ ...valid, images: makeImages("Noir", 6) }).success).toBe(true);
    const seventh = productInputSchema.safeParse({ ...valid, images: makeImages(" Noir ", 7) });
    expect(seventh.success).toBe(false);
    if (!seventh.success) expect(seventh.error.issues).toContainEqual(expect.objectContaining({
      path: ["images", 6, "color"], message: "Maximum 6 images par couleur.",
    }));
    expect(productInputSchema.safeParse({
      ...valid,
      images: [...makeImages("Noir", 6), ...makeImages("Cognac", 6, 6)],
      variants: [...valid.variants, { sku: "ATLAS-38-COGNAC", size: "38", color: "Cognac", stock: 4 }],
    }).success).toBe(true);
  });

  it("bounds the total image input defensively", () => {
    const images = Array.from({ length: 49 }, (_, position) => ({
      ...valid.images[0], url: `https://images.unsplash.com/${position}.webp`, position,
    }));
    expect(productInputSchema.safeParse({ ...valid, images }).success).toBe(false);
  });
});
