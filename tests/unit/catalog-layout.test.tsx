import { readFileSync } from "node:fs";
import { join } from "node:path";
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  products: [{
    id: "product-1",
    slug: "bottine-atlas",
    name: "Bottine Atlas",
    priceDh: 1290,
    image: null,
    available: true,
    variants: [{ id: "v1", sku: "ATLAS-40", color: "Cognac", size: "40", stock: 3 }],
  }],
}));

vi.mock("@/lib/catalog/queries", () => ({ listVisibleProducts: vi.fn().mockResolvedValue(mocks.products) }));
vi.mock("@/components/cart/cart-link", () => ({ CartLink: () => <a href="/panier">Panier</a> }));
vi.mock("next/image", () => ({ default: (props: React.ImgHTMLAttributes<HTMLImageElement>) => <img {...props} /> }));

import CatalogPage from "@/app/(shop)/page";
import { CartProvider } from "@/components/cart/cart-provider";

afterEach(cleanup);

describe("catalog layout", () => {
  it("places an empty filter area before compact product results", async () => {
    render(<CartProvider>{await CatalogPage()}</CartProvider>);

    const filters = screen.getByRole("complementary", { name: "Filtrer par" });
    expect(filters).toHaveTextContent("Filtres à venir");
    expect(filters.compareDocumentPosition(screen.getByRole("heading", { name: "Bottine Atlas" })) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });

  it("keeps quick-add controls outside the product link", async () => {
    render(<CartProvider>{await CatalogPage()}</CartProvider>);
    const productLink = screen.getByRole("link", { name: "Découvrir Bottine Atlas" });

    expect(productLink.querySelector("button")).toBeNull();
    expect(await screen.findByRole("button", { name: "Choisir une taille" })).toBeInTheDocument();
  });

  it("defines four, two and one-column responsive grids with dedicated product states", () => {
    const css = readFileSync(join(process.cwd(), "app/globals.css"), "utf8");
    expect(css).toMatch(/\.catalog-layout\s*\{[^}]*grid-template-columns:\s*220px\s+minmax\(0,\s*1fr\)/s);
    expect(css).toMatch(/\.product-grid\s*\{[^}]*grid-template-columns:\s*repeat\(4,\s*minmax\(0,\s*1fr\)\)/s);
    expect(css).toMatch(/@media\s*\(max-width:\s*1099px\)[\s\S]*?\.product-grid\s*\{[^}]*repeat\(2,/s);
    expect(css).toMatch(/@media\s*\(max-width:\s*760px\)[\s\S]*?\.product-grid\s*\{[^}]*grid-template-columns:\s*1fr/s);
    expect(css).toContain(".product-card-price");
    expect(css).toContain(".product-availability");
  });
});
