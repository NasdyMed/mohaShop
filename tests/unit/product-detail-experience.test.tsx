import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { CartProvider } from "@/components/cart/cart-provider";
import { ProductDetailExperience } from "@/components/shop/product-detail-experience";

vi.mock("next/image", () => ({ default: ({ alt, src }: { alt: string; src: string }) => <span role="img" aria-label={alt} data-src={src} /> }));
vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn() }) }));

afterEach(cleanup);

const product = {
  slug: "atlas",
  name: "Bottine Atlas",
  description: "Une bottine confortable.",
  priceDh: 1290,
  compareAtPriceDh: 1590,
  image: { id: "cognac", url: "/cognac.jpg", alt: "Atlas cognac", color: "Cognac" },
  images: [
    { id: "cognac", url: "/cognac.jpg", alt: "Atlas cognac", color: "Cognac" },
    { id: "cognac-side", url: "/cognac-side.jpg", alt: "Atlas cognac profil", color: "Cognac" },
  ],
  variants: [
    { id: "c40", sku: "C40", color: "Cognac", size: "40", stock: 3 },
    { id: "c41", sku: "C41", color: "Cognac", size: "41", stock: 0 },
  ],
  available: true,
};

describe("ProductDetailExperience", () => {
  it("uses the reference shopping hierarchy and EU size grid", () => {
    const { container } = render(<CartProvider><ProductDetailExperience product={product} /></CartProvider>);

    expect(screen.getByRole("heading", { name: "Bottine Atlas" })).toBeInTheDocument();
    expect(container.querySelector(".product-info")).toHaveAccessibleName("Commander maintenant Bottine Atlas");
    expect(screen.getByText("Botte")).toBeInTheDocument();
    expect(screen.getByText("EU 40")).toBeInTheDocument();
    expect(screen.getByText("EU 41")).toBeInTheDocument();
    expect(container.querySelector(".size-option-grid")).toBeInTheDocument();
    expect(screen.getByText("1.590 DH").tagName).toBe("DEL");
    expect(screen.getByText("Économisez 300 DH")).toBeVisible();
    expect(screen.queryByText("Botte signature")).toBeNull();
    expect(screen.queryByText("Collection · Maison Botte")).toBeNull();
  });
});
