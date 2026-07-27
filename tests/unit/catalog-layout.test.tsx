import { readFileSync } from "node:fs";
import { join } from "node:path";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  products: [{
    id: "product-1",
    slug: "bottine-atlas",
    name: "Bottine Atlas",
    priceDh: 1290,
    image: { id: "image-1", url: "/atlas.jpg", alt: "Bottine Atlas" },
    images: [
      { id: "image-1", url: "/atlas.jpg", alt: "Bottine Atlas", color: "Cognac" },
      { id: "image-2", url: "/atlas-noir.jpg", alt: "Bottine Atlas noire", color: "Noir" },
    ],
    available: true,
    variants: [
      { id: "v1", sku: "ATLAS-40", color: "Cognac", size: "40", stock: 3 },
      { id: "v2", sku: "ATLAS-N-40", color: "Noir", size: "40", stock: 2 },
    ],
  }],
}));

vi.mock("@/lib/catalog/queries", () => ({ listVisibleProducts: vi.fn().mockResolvedValue(mocks.products) }));
vi.mock("@/lib/hero/queries", () => ({ listVisibleHeroVideos: vi.fn().mockResolvedValue([]) }));
vi.mock("@/components/cart/cart-link", () => ({ CartLink: () => <a href="/panier">Panier</a> }));
vi.mock("next/image", () => ({ default: ({ alt, src }: { alt: string; src: string }) => <span role="img" aria-label={alt} data-src={src} /> }));

import CatalogPage from "@/app/(shop)/page";
import { CartProvider } from "@/components/cart/cart-provider";

afterEach(cleanup);

describe("catalog layout", () => {
  it("presents the editorial hero and the three buying guarantees", async () => {
    render(<CartProvider>{await CatalogPage()}</CartProvider>);

    expect(screen.getByRole("link", { name: /Découvrir la collection/ })).toHaveAttribute("href", "#collection");
    expect(screen.getByRole("img", { name: "Bottine Atlas, sélection Maison Botte" })).toBeInTheDocument();
    expect(screen.getByText("Paiement à la livraison")).toBeInTheDocument();
    expect(screen.getByText("Livraison partout au Maroc")).toBeInTheDocument();
    expect(screen.getByText("Commande sans compte")).toBeInTheDocument();
  });

  it("places an empty filter area before compact product results", async () => {
    render(<CartProvider>{await CatalogPage()}</CartProvider>);

    const filters = screen.getByRole("complementary", { name: "Filtrer par" });
    expect(filters).toHaveTextContent("Filtres à venir");
    expect(filters.compareDocumentPosition(screen.getByRole("heading", { name: "Bottine Atlas" })) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });

  it("uses the reference card anatomy without quick-add controls", async () => {
    render(<CartProvider>{await CatalogPage()}</CartProvider>);
    const productLink = screen.getByRole("link", { name: "Découvrir Bottine Atlas" });

    expect(productLink.querySelector("button")).toBeNull();
    expect(screen.getByText("Botte")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Choisir une taille" })).toBeNull();
    expect(screen.queryByText("Voir le modèle")).toBeNull();
    expect(document.querySelector(".product-card-index")).toBeNull();
  });

  it("changes the card image when another available color is selected", async () => {
    render(<CartProvider>{await CatalogPage()}</CartProvider>);

    expect(screen.getByRole("img", { name: "Bottine Atlas" })).toHaveAttribute("data-src", "/atlas.jpg");
    fireEvent.click(screen.getByRole("radio", { name: "Noir" }));
    expect(screen.getByRole("img", { name: "Bottine Atlas noire" })).toHaveAttribute("data-src", "/atlas-noir.jpg");
  });

  it("defines four, two and one-column responsive grids with dedicated product states", () => {
    const css = readFileSync(join(process.cwd(), "app/globals.css"), "utf8");
    expect(css).toMatch(/\.catalog-layout\s*\{[^}]*grid-template-columns:\s*220px\s+minmax\(0,\s*1fr\)/s);
    expect(css).toMatch(/\.product-grid\s*\{[^}]*grid-template-columns:\s*repeat\(4,\s*minmax\(0,\s*1fr\)\)/s);
    expect(css).toMatch(/@media\s*\(max-width:\s*1099px\)[\s\S]*?\.product-grid\s*\{[^}]*repeat\(2,/s);
    expect(css).toMatch(/@media\s*\(max-width:\s*760px\)[\s\S]*?\.product-grid\s*\{[^}]*grid-template-columns:\s*1fr/s);
    expect(css).toContain(".product-card-price");
    expect(css).toContain(".product-availability");
    expect(css).toContain("#collection:target .product-card");
    expect(css).toContain("@keyframes collection-reveal");
  });
});
