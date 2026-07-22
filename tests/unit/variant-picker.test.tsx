import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";

import { VariantPicker, type CatalogVariant } from "@/components/shop/variant-picker";

const variants = [
  { id: "cognac-40", sku: "COG-40", color: "Cognac", size: "40", stock: 2 },
  { id: "cognac-41", sku: "COG-41", color: "Cognac", size: "41", stock: 0 },
  { id: "noir-41", sku: "NOI-41", color: "Noir", size: "41", stock: 4 },
] satisfies CatalogVariant[];

afterEach(cleanup);

describe("VariantPicker", () => {
  it("selects an available variant and returns the typed variant", () => {
    const onSelect = vi.fn<(variant: CatalogVariant | null) => void>();
    render(<VariantPicker variants={variants} onSelect={onSelect} />);

    fireEvent.click(screen.getByRole("radio", { name: "Cognac" }));
    fireEvent.click(screen.getByRole("radio", { name: "40" }));

    expect(onSelect).toHaveBeenLastCalledWith(variants[0]);
    expect(screen.getByText("Plus que 2 en stock")).toBeInTheDocument();
  });

  it("disables an unavailable combination and exposes its stock status", () => {
    render(<VariantPicker variants={variants} onSelect={vi.fn()} />);

    fireEvent.click(screen.getByRole("radio", { name: "Cognac" }));

    expect(screen.getByRole("radio", { name: "41 — Rupture de stock" })).toBeDisabled();
    expect(screen.getByText("Choisissez maintenant une pointure.")).toBeInTheDocument();
    expect(screen.getByText("Rupture de stock")).toBeInTheDocument();
  });

  it("keeps color and size coherent when combinations differ", () => {
    const onSelect = vi.fn<(variant: CatalogVariant | null) => void>();
    render(<VariantPicker variants={variants} onSelect={onSelect} />);

    expect(screen.getByRole("radio", { name: "40" })).toBeDisabled();
    expect(screen.getByRole("radio", { name: "41" })).toBeDisabled();
    expect(onSelect).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole("radio", { name: "Noir" }));
    expect(screen.getByRole("radio", { name: "40" })).toBeDisabled();
    expect(screen.getByRole("radio", { name: "41" })).toBeEnabled();

    fireEvent.click(screen.getByRole("radio", { name: "41" }));
    expect(onSelect).toHaveBeenLastCalledWith(variants[2]);

    fireEvent.click(screen.getByRole("radio", { name: "Cognac" }));
    expect(onSelect).toHaveBeenLastCalledWith(null);
    expect(screen.getByRole("radio", { name: /41/ })).not.toBeChecked();
  });

  it("resets a selected variant when the available variants change", () => {
    const onSelect = vi.fn<(variant: CatalogVariant | null) => void>();
    const { rerender } = render(<VariantPicker variants={variants} onSelect={onSelect} />);
    fireEvent.click(screen.getByRole("radio", { name: "Noir" }));
    fireEvent.click(screen.getByRole("radio", { name: "41" }));

    rerender(<VariantPicker variants={[variants[0]]} onSelect={onSelect} />);

    expect(onSelect).toHaveBeenLastCalledWith(null);
    expect(screen.getByText("Choisissez une couleur et une pointure disponibles.")).toBeInTheDocument();
  });

  it("supports keyboard selection through native radio controls", async () => {
    const user = userEvent.setup();
    const onSelect = vi.fn<(variant: CatalogVariant | null) => void>();
    render(<VariantPicker variants={variants} onSelect={onSelect} />);

    await user.tab();
    await user.keyboard("{ArrowRight}");
    expect(screen.getByRole("radio", { name: "Noir" })).toBeChecked();
    await user.tab();
    await user.keyboard(" ");

    expect(onSelect).toHaveBeenLastCalledWith(variants[2]);
  });
});
