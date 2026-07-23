import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import { CartProvider } from "@/components/cart/cart-provider";
import { ProductPurchase } from "@/components/cart/product-purchase";

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
});
