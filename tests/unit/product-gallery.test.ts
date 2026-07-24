import { describe, expect, it } from "vitest";
import { selectProductImages } from "@/components/shop/product-gallery";

const images = [
  { id: "general", url: "https://example.com/general.webp", alt: "Vue générale", color: null },
  { id: "black", url: "https://example.com/black.webp", alt: "Botte noire", color: "Noir" },
  { id: "brown", url: "https://example.com/brown.webp", alt: "Botte marron", color: "Marron" },
];

describe("selectProductImages", () => {
  it("places the selected color before general images", () => {
    expect(selectProductImages(images, "Noir").map(({ id }) => id)).toEqual(["black", "general"]);
  });
  it("uses general images when the color has no visual", () => {
    expect(selectProductImages(images, "Blanc").map(({ id }) => id)).toEqual(["general"]);
  });
  it("falls back to every image if no general image exists", () => {
    expect(selectProductImages(images.slice(1), "Blanc").map(({ id }) => id)).toEqual(["black", "brown"]);
  });
});
