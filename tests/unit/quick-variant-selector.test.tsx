import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { QuickVariantSelector } from "@/components/shop/quick-variant-selector";

const variants = [
  { id: "cognac-40", sku: "ATLAS-C-40", color: "Cognac", size: "40", stock: 3 },
  { id: "cognac-42", sku: "ATLAS-C-42", color: "Cognac", size: "42", stock: 0 },
  { id: "noir-40", sku: "ATLAS-N-40", color: "Noir", size: "40", stock: 0 },
  { id: "noir-41", sku: "ATLAS-N-41", color: "Noir", size: "41", stock: 0 },
];

function renderSelector(items = variants, onColorChange = vi.fn()) {
  return render(<QuickVariantSelector productSlug="atlas" variants={items} onColorChange={onColorChange} />);
}

afterEach(cleanup);

describe("QuickVariantSelector", () => {
  it("shows every color but prevents sold-out color selection", () => {
    renderSelector();
    expect(screen.getByRole("radio", { name: "Cognac" })).toBeChecked();
    expect(screen.getByRole("radio", { name: "Noir — épuisée" })).toBeDisabled();
    expect(screen.queryByRole("button")).toBeNull();
    expect(screen.queryByText("Pointure")).toBeNull();
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

  it("keeps all sold-out colors visible without an add action", () => {
    renderSelector(variants.map((variant) => ({ ...variant, stock: 0 })));
    expect(screen.getByRole("radio", { name: "Cognac — épuisée" })).toBeDisabled();
    expect(screen.getByRole("radio", { name: "Noir — épuisée" })).toBeDisabled();
    expect(screen.queryByRole("button")).toBeNull();
  });
});
