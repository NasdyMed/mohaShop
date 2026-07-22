import { cleanup, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { CartProvider, useCart } from "@/components/cart/cart-provider";

function Probe() {
  const { hydrated, itemCount, items } = useCart();
  return <output>{hydrated ? `${itemCount}:${items[0]?.productName ?? "vide"}` : "chargement"}</output>;
}

beforeEach(() => localStorage.clear());
afterEach(cleanup);

describe("CartProvider storage", () => {
  it("hydrates a valid saved cart without first overwriting it", async () => {
    localStorage.setItem("boots-cart-v1", JSON.stringify([{
      variantId: "v1", productSlug: "atlas", productName: "Atlas", imageUrl: null,
      size: "40", color: "Brun", unitPriceDh: 899, availableStock: 3, quantity: 2,
    }]));

    render(<CartProvider><Probe /></CartProvider>);
    await waitFor(() => expect(screen.getByText("2:Atlas")).toBeInTheDocument());
    expect(JSON.parse(localStorage.getItem("boots-cart-v1") ?? "[]")).toHaveLength(1);
  });

  it.each([
    "not json",
    JSON.stringify([{ variantId: "v1", productSlug: "atlas", productName: "Atlas", imageUrl: null, size: "40", color: "Brun", unitPriceDh: -1, availableStock: 3, quantity: 1 }]),
    JSON.stringify([{ variantId: "v1", productSlug: "atlas", productName: "Atlas", imageUrl: null, size: "40", color: "Brun", unitPriceDh: 899, availableStock: 0, quantity: 1 }]),
  ])("safely rejects malformed storage", async (stored) => {
    localStorage.setItem("boots-cart-v1", stored);
    render(<CartProvider><Probe /></CartProvider>);

    await waitFor(() => expect(screen.getByText("0:vide")).toBeInTheDocument());
    expect(localStorage.getItem("boots-cart-v1")).toBe("[]");
  });
});
