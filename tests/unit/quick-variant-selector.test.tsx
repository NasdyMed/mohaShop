import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { CartProvider, useCart } from "@/components/cart/cart-provider";
import { QuickVariantSelector } from "@/components/shop/quick-variant-selector";

const product = {
  slug: "atlas",
  name: "Bottine Atlas",
  imageUrl: "https://example.com/atlas.webp",
  unitPriceDh: 1290,
};

const variants = [
  { id: "cognac-40", sku: "ATLAS-C-40", color: "Cognac", size: "40", stock: 3 },
  { id: "cognac-42", sku: "ATLAS-C-42", color: "Cognac", size: "42", stock: 0 },
  { id: "noir-40", sku: "ATLAS-N-40", color: "Noir", size: "40", stock: 0 },
  { id: "noir-41", sku: "ATLAS-N-41", color: "Noir", size: "41", stock: 0 },
];

function CartProbe() {
  const { hydrated, items } = useCart();
  return <output data-testid="cart-probe">{hydrated ? JSON.stringify(items) : "loading"}</output>;
}

function renderSelector(items = variants, onColorChange = vi.fn()) {
  return render(
    <CartProvider>
      <QuickVariantSelector product={product} variants={items} onColorChange={onColorChange} />
      <CartProbe />
    </CartProvider>,
  );
}

beforeEach(() => localStorage.clear());
afterEach(cleanup);

describe("QuickVariantSelector", () => {
  it("shows sold-out colors and sizes but prevents their selection", async () => {
    renderSelector();
    expect(screen.getByRole("radio", { name: "Cognac" })).toBeChecked();
    expect(screen.getByRole("radio", { name: "Noir — épuisée" })).toBeDisabled();
    const open = screen.getByRole("button", { name: "Choisir une taille" });
    await waitFor(() => expect(open).toBeEnabled());
    fireEvent.click(open);

    expect(screen.getByRole("radio", { name: "Cognac" })).toBeChecked();
    expect(screen.getByRole("radio", { name: "Noir — épuisée" })).toBeDisabled();
    expect(screen.getByRole("radio", { name: "Pointure 42 — épuisée" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Ajouter au panier" })).toBeDisabled();
  });

  it("notifies the card when an available color is selected", () => {
    const onColorChange = vi.fn();
    renderSelector([
      variants[0],
      { id: "beige-40", sku: "ATLAS-B-40", color: "Beige", size: "40", stock: 2 },
    ], onColorChange);

    fireEvent.click(screen.getByRole("radio", { name: "Beige" }));
    expect(onColorChange).toHaveBeenLastCalledWith("Beige");
  });

  it("adds the exact selected color and size with quantity one", async () => {
    renderSelector();
    const open = screen.getByRole("button", { name: "Choisir une taille" });
    await waitFor(() => expect(open).toBeEnabled());
    fireEvent.click(open);
    fireEvent.click(screen.getByRole("radio", { name: "Pointure 40" }));
    fireEvent.click(screen.getByRole("button", { name: "Ajouter au panier" }));

    await waitFor(() => expect(screen.getByTestId("cart-probe")).toHaveTextContent("cognac-40"));
    const cart = JSON.parse(screen.getByTestId("cart-probe").textContent ?? "[]");
    expect(cart).toEqual([expect.objectContaining({
      variantId: "cognac-40",
      color: "Cognac",
      size: "40",
      availableStock: 3,
      quantity: 1,
    })]);
    expect(screen.getByText("Bottine Atlas, taille 40, ajouté au panier.")).toHaveAttribute("aria-live", "polite");
  });

  it("does not offer quick add when every color is sold out", async () => {
    renderSelector(variants.map((variant) => ({ ...variant, stock: 0 })));
    await waitFor(() => expect(screen.getByTestId("cart-probe")).not.toHaveTextContent("loading"));
    expect(screen.getByText("Rupture de stock")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Choisir une taille" })).not.toBeInTheDocument();
  });
});
