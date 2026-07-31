import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { CartProvider, useCart } from "@/components/cart/cart-provider";
import { ProductPurchase } from "@/components/cart/product-purchase";
import { LocaleProvider } from "@/components/shop/locale-provider";

const { push } = vi.hoisted(() => ({ push: vi.fn() }));

vi.mock("next/navigation", () => ({ useRouter: () => ({ push }) }));

vi.mock("next/image", () => ({ default: ({ alt, src }: { alt: string; src: string }) => <span role="img" aria-label={alt} data-src={src} /> }));

function CartProbe() {
  const { items } = useCart();
  return <output data-testid="cart-items">{JSON.stringify(items)}</output>;
}

beforeEach(() => {
  localStorage.clear();
  push.mockReset();
});
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

  it("orders the selected color and quantity, then opens checkout", async () => {
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
    fireEvent.click(screen.getByRole("radio", { name: "40" }));
    fireEvent.change(screen.getByLabelText("Quantité"), { target: { value: "2" } });
    fireEvent.click(screen.getByRole("button", { name: "Commander maintenant" }));

    await waitFor(() => expect(screen.getByTestId("cart-items")).toHaveTextContent('"variantId":"noir-40"'));
    expect(screen.getByTestId("cart-items")).toHaveTextContent('"imageUrl":"/noir.jpg"');
    expect(screen.getByTestId("cart-items")).toHaveTextContent('"quantity":2');
    expect(push).toHaveBeenCalledOnce();
    expect(push).toHaveBeenCalledWith("/commander");
  });

  it("preserves hydrated cart items when ordering a different variant", async () => {
    localStorage.setItem("boots-cart-v1", JSON.stringify([{
      variantId: "saved-39", productSlug: "nora", productName: "Nora", imageUrl: "/nora.jpg",
      size: "39", color: "Brun", unitPriceDh: 700, availableStock: 2, quantity: 1,
    }]));

    render(<CartProvider>
      <ProductPurchase
        product={{ slug: "atlas", name: "Atlas", imageUrl: "/atlas.jpg", unitPriceDh: 899 }}
        variants={[{ id: "noir-40", sku: "N40", color: "Noir", size: "40", stock: 3 }]}
      />
      <CartProbe />
    </CartProvider>);

    await waitFor(() => expect(screen.getByTestId("cart-items")).toHaveTextContent('"variantId":"saved-39"'));
    fireEvent.click(screen.getByRole("radio", { name: "Noir" }));
    fireEvent.click(screen.getByRole("radio", { name: "40" }));
    fireEvent.click(screen.getByRole("button", { name: "Commander maintenant" }));

    await waitFor(() => expect(screen.getByTestId("cart-items")).toHaveTextContent('"variantId":"noir-40"'));
    const items = JSON.parse(screen.getByTestId("cart-items").textContent ?? "[]") as Array<{ variantId: string }>;
    expect(items.map(({ variantId }) => variantId)).toEqual(["saved-39", "noir-40"]);
  });

  it("ignores a duplicate direct-order click", async () => {
    render(<CartProvider>
      <ProductPurchase
        product={{ slug: "atlas", name: "Atlas", imageUrl: null, unitPriceDh: 899 }}
        variants={[{ id: "noir-40", sku: "N40", color: "Noir", size: "40", stock: 3 }]}
      />
      <CartProbe />
    </CartProvider>);

    fireEvent.click(screen.getByRole("radio", { name: "Noir" }));
    fireEvent.click(screen.getByRole("radio", { name: "40" }));
    const orderButton = screen.getByRole("button", { name: "Commander maintenant" });
    fireEvent.click(orderButton);
    fireEvent.click(orderButton);

    await waitFor(() => expect(screen.getByTestId("cart-items")).toHaveTextContent('"quantity":1'));
    expect(push).toHaveBeenCalledOnce();
  });

  it("retries navigation without adding the direct order twice", async () => {
    push.mockImplementationOnce(() => { throw new Error("navigation failed"); });
    render(<CartProvider>
      <ProductPurchase
        product={{ slug: "atlas", name: "Atlas", imageUrl: null, unitPriceDh: 899 }}
        variants={[{ id: "noir-40", sku: "N40", color: "Noir", size: "40", stock: 3 }]}
      />
      <CartProbe />
    </CartProvider>);

    fireEvent.click(screen.getByRole("radio", { name: "Noir" }));
    fireEvent.click(screen.getByRole("radio", { name: "40" }));
    fireEvent.click(screen.getByRole("button", { name: "Commander maintenant" }));
    await waitFor(() => expect(screen.getByRole("button", { name: "Commander maintenant" })).toBeEnabled());

    fireEvent.click(screen.getByRole("button", { name: "Commander maintenant" }));

    await waitFor(() => expect(push).toHaveBeenCalledTimes(2));
    expect(push).toHaveBeenLastCalledWith("/commander");
    expect(screen.getByTestId("cart-items")).toHaveTextContent('"quantity":1');
  });

  it("opens the localized checkout route in Arabic", () => {
    render(<LocaleProvider locale="ar"><CartProvider>
      <ProductPurchase
        product={{ slug: "atlas", name: "Atlas", imageUrl: null, unitPriceDh: 899 }}
        variants={[{ id: "noir-40", sku: "N40", color: "أسود", size: "40", stock: 3 }]}
      />
    </CartProvider></LocaleProvider>);

    fireEvent.click(screen.getByRole("radio", { name: "أسود" }));
    fireEvent.click(screen.getByRole("radio", { name: "40" }));
    fireEvent.click(screen.getByRole("button", { name: "اطلب الآن" }));

    expect(push).toHaveBeenCalledWith("/ar/commander");
  });
});
