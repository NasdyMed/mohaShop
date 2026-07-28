import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { CartProvider, useCart } from "@/components/cart/cart-provider";

function Probe() {
  const { dispatch, hydrated, itemCount, items } = useCart();
  return <><output>{hydrated ? `${itemCount}:${items[0]?.productName ?? "vide"}` : "chargement"}</output><button onClick={() => dispatch({ type: "add", item: { variantId: "v2", productSlug: "nora", productName: "Nora", imageUrl: null, size: "39", color: "Noir", unitPriceDh: 700, availableStock: 2 }, quantity: 1 })}>Ajouter</button></>;
}

beforeEach(() => localStorage.clear());
afterEach(() => { cleanup(); vi.restoreAllMocks(); });

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

  it("finishes hydration when reading storage throws", async () => {
    vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => { throw new Error("storage blocked"); });

    render(<CartProvider><Probe /></CartProvider>);

    await waitFor(() => expect(screen.getByText("0:vide")).toBeInTheDocument());
    fireEvent.click(screen.getByRole("button", { name: "Ajouter" }));
    expect(screen.getByText("1:Nora")).toBeInTheDocument();
  });

  it("keeps the cart usable when persisting storage throws", async () => {
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => { throw new Error("quota exceeded"); });

    render(<CartProvider><Probe /></CartProvider>);
    await waitFor(() => expect(screen.getByText("0:vide")).toBeInTheDocument());
    fireEvent.click(screen.getByRole("button", { name: "Ajouter" }));

    expect(screen.getByText("1:Nora")).toBeInTheDocument();
  });

  it("shows global cart feedback and a floating cart shortcut after an addition", async () => {
    render(<CartProvider><Probe /></CartProvider>);
    await waitFor(() => expect(screen.getByText("0:vide")).toBeInTheDocument());

    expect(screen.getByRole("link", { name: "Ouvrir le panier, 0 article" })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Ajouter" }));

    expect(screen.getByText("Nora a été ajouté au panier.")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Ouvrir le panier, 1 article" })).toBeInTheDocument();
    expect(screen.getByText("1", { selector: ".floating-cart-count" })).toBeInTheDocument();
  });

  it("shows a separate floating WhatsApp contact shortcut", async () => {
    render(<CartProvider><Probe /></CartProvider>);
    await waitFor(() => expect(screen.getByText("0:vide")).toBeInTheDocument());

    const whatsapp = screen.getByRole("link", { name: "Discuter avec nous sur WhatsApp" });
    expect(whatsapp).toHaveAttribute("href", "https://wa.me/212645194705");
    expect(whatsapp).toHaveAttribute("target", "_blank");
    expect(whatsapp).toHaveAttribute("rel", "noopener noreferrer");
    expect(whatsapp).toHaveClass("floating-whatsapp");
    expect(whatsapp).not.toHaveClass("floating-cart");
  });

  it("does not show an addition notification while hydrating a stored cart", async () => {
    localStorage.setItem("boots-cart-v1", JSON.stringify([{
      variantId: "v1", productSlug: "atlas", productName: "Atlas", imageUrl: null,
      size: "40", color: "Brun", unitPriceDh: 899, availableStock: 3, quantity: 2,
    }]));

    render(<CartProvider><Probe /></CartProvider>);
    await waitFor(() => expect(screen.getByText("2:Atlas")).toBeInTheDocument());

    expect(screen.queryByText("Ajouté au panier")).not.toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Ouvrir le panier, 2 articles" })).toBeInTheDocument();
  });
});
