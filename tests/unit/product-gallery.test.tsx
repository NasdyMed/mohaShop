import React from "react";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ProductGallery, selectProductImages } from "@/components/shop/product-gallery";

vi.mock("next/image", () => ({ default: ({ alt, src }: { alt: string; src: string }) => <span role="img" aria-label={alt} data-src={src} /> }));
afterEach(cleanup);

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
  it("switches the main image from the thumbnail rail", () => {
    render(<ProductGallery images={[images[1], { id: "black-side", url: "https://example.com/black-side.webp", alt: "Botte noire profil", color: "Noir" }]} productName="Botte" selectedColor="Noir" />);
    expect(screen.getByRole("img", { name: "Botte noire" })).toHaveAttribute("data-src", images[1].url);
    fireEvent.click(screen.getByRole("button", { name: "Afficher Botte noire profil" }));
    expect(screen.getByRole("img", { name: "Botte noire profil" })).toHaveAttribute("data-src", "https://example.com/black-side.webp");
  });
  it("lets a single image use the full gallery width", () => {
    const { container } = render(<ProductGallery images={[images[1]]} productName="Botte" selectedColor="Noir" />);
    expect(container.querySelector(".product-gallery")).not.toHaveClass("has-thumbnails");
    expect(container.querySelector(".gallery-thumbnails")).toBeNull();
  });
  it("resets to the first image when the selected color changes", () => {
    const { rerender } = render(<ProductGallery images={images} productName="Botte" selectedColor="Noir" />);
    rerender(<ProductGallery images={images} productName="Botte" selectedColor="Marron" />);
    expect(screen.getByRole("img", { name: "Botte marron" })).toHaveAttribute("data-src", images[2].url);
  });
});
