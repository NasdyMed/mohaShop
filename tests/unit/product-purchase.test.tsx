import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { CartProvider, useCart } from "@/components/cart/cart-provider";
import { ProductPurchase } from "@/components/cart/product-purchase";

vi.mock("next/image", () => ({ default: ({ alt, src }: { alt: string; src: string }) => <span role="img" aria-label={alt} data-src={src} /> }));

function CartProbe() {
  const { items } = useCart();
  return <output data-testid="cart-items">{JSON.stringify(items)}</output>;
}

beforeEach(() => localStorage.clear());
afterEach(cleanup);

describe("ProductPurchase", () => {
  it("resets quantity when the selected variant changes", () => {
    render(<CartProvider><ProductPurchase product={{ slug: "atlas", name: "Atlas", imageUrl: null, unitPriceDh: 899 }} variants={[
      { id: "brun-40", sku: "B40", color: "Brun", size: "40", stock: 3 },
      { id: "noir-40", sku: "N40", color: "Noir", size: "40", stock: 3 },
    ]} /></CartProvider>);

    fireEvent.click(screen.getByRole("radio", { name: "Brun" }));
    fireEvent.click(screen.getByRole("radio", { name: "40" }));
    fireEvent.change(screen.getByLabelText("Quantité"), { target: { value: "2" } });
    expect(screen.getByLabelText("Quantité")).toHaveValue(2);

    fireEvent.click(screen.getByRole("radio", { name: "Noir" }));

    expect(screen.getByLabelText("Quantité")).toHaveValue(1);
  });

  it("passes product images to the color selector", () => {
    render(<CartProvider><ProductPurchase
      product={{ slug: "atlas", name: "Atlas", imageUrl: "/cognac.jpg", unitPriceDh: 899 }}
      images={[{ id: "cognac", url: "/cognac.jpg", alt: "Atlas cognac", color: "Cognac" }]}
      variants={[{ id: "cognac-40", sku: "C40", color: "Cognac", size: "40", stock: 3 }]}
    /></CartProvider>);

    expect(screen.getByRole("radio", { name: "Cognac" }).closest("label")?.querySelector('[role="img"]')).toHaveAttribute("data-src", "/cognac.jpg");
  });

  it("stores the image matching the selected color in the cart", async () => {
    render(<CartProvider>
      <ProductPurchase
        product={{ slug: "atlas", name: "Atlas", imageUrl: "/default.jpg", unitPriceDh: 899 }}
        images={[
          { id: "cognac", url: "/cognac.jpg", alt: "Atlas cognac", color: "Cognac" },
          { id: "noir", url: "/noir.jpg", alt: "Atlas noire", color: "Noir" },
        ]}
        variants={[
          { id: "cognac-40", sku: "C40", color: "Cognac", size: "40", stock: 3 },
          { id: "noir-40", sku: "N40", color: "Noir", size: "40", stock: 3 },
        ]}
      />
      <CartProbe />
    </CartProvider>);

    fireEvent.click(screen.getByRole("radio", { name: "Noir" }));
    fireEvent.click(screen.getByRole("button", { name: "Ajouter au panier" }));

    await waitFor(() => expect(screen.getByTestId("cart-items")).toHaveTextContent('"imageUrl":"/noir.jpg"'));
  });
});
