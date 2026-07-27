import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { useState } from "react";

import { VariantEditor } from "@/components/admin/variant-editor";
import type { EditableVariant } from "@/lib/catalog/variant-matrix";

function Harness({ initial = [], protectedColors = new Set<string>(), disabled = false, errors = {} }: {
  initial?: EditableVariant[]; protectedColors?: ReadonlySet<string>; disabled?: boolean; errors?: Record<string, string[]>;
}) {
  const [value, setValue] = useState(initial);
  return <>
    <VariantEditor productSlug="atlas" value={value} onChange={setValue} disabled={disabled} errors={errors}
      protectedColors={protectedColors} onConfirmedColorRemoval={vi.fn()} />
    <output data-testid="value">{JSON.stringify(value)}</output>
  </>;
}

afterEach(cleanup);

describe("VariantEditor stock matrix", () => {
  it("initializes selections and exposes the full accessible palette and sizes", () => {
    render(<Harness initial={[{ color: "Noir", size: "38", sku: "CUSTOM", stock: 2 }]} />);
    expect(screen.getByRole("checkbox", { name: "Noir" })).toBeChecked();
    expect(screen.getByRole("checkbox", { name: "Pointure 38" })).toBeChecked();
    expect(screen.getAllByRole("checkbox", { name: /Pointure/ })).toHaveLength(12);
    expect(screen.getByRole("spinbutton", { name: "Stock Noir, pointure 38" })).toHaveValue(2);
  });

  it("selecting two colors and sizes yields four variants and updates stock immutably", async () => {
    const user = userEvent.setup();
    render(<Harness />);
    await user.click(screen.getByRole("checkbox", { name: "Noir" }));
    await user.click(screen.getByRole("checkbox", { name: "Cognac" }));
    await user.click(screen.getByRole("checkbox", { name: "Pointure 38" }));
    await user.click(screen.getByRole("checkbox", { name: "Pointure 39" }));
    expect(screen.getAllByRole("spinbutton")).toHaveLength(4);
    await user.clear(screen.getByRole("spinbutton", { name: "Stock Noir, pointure 38" }));
    await user.type(screen.getByRole("spinbutton", { name: "Stock Noir, pointure 38" }), "7");
    expect(JSON.parse(screen.getByTestId("value").textContent!)).toEqual(expect.arrayContaining([
      expect.objectContaining({ color: "Noir", size: "38", stock: 7 }),
    ]));
  });

  it("shows generated and editable SKUs in advanced details", async () => {
    const user = userEvent.setup();
    render(<Harness />);
    await user.click(screen.getByRole("checkbox", { name: "Noir" }));
    await user.click(screen.getByRole("checkbox", { name: "Pointure 38" }));
    await user.click(screen.getByText("SKU avancés"));
    expect(screen.getByRole("textbox", { name: "SKU Noir, pointure 38" })).toHaveValue("ATLAS-NOIR-38");
  });

  it("removes an untouched stock-zero combination immediately", async () => {
    const user = userEvent.setup();
    render(<Harness initial={[{ color: "Noir", size: "38", sku: "N-38", stock: 0 }]} />);
    await user.click(screen.getByRole("checkbox", { name: "Noir" }));
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(JSON.parse(screen.getByTestId("value").textContent!)).toEqual([]);
  });

  it("requires confirmation, supports cancel and Escape with focus restoration", async () => {
    const user = userEvent.setup();
    render(<Harness initial={[{ id: "v1", color: "Noir", size: "38", sku: "N-38", stock: 0 }]} />);
    const noir = screen.getByRole("checkbox", { name: "Noir" });
    await user.click(noir);
    expect(screen.getByRole("dialog")).toBeVisible();
    expect(screen.getByRole("button", { name: "Annuler" })).toHaveFocus();
    await user.keyboard("{Escape}");
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(noir).toHaveFocus();
    expect(JSON.parse(screen.getByTestId("value").textContent!)).toHaveLength(1);
  });

  it("retains historical variants as removed stock zero and reactivates them", async () => {
    const user = userEvent.setup();
    render(<Harness initial={[{ id: "v1", historical: true, color: "Noir", size: "38", sku: "KEEP", stock: 4 }]} />);
    await user.click(screen.getByRole("checkbox", { name: "Noir" }));
    await user.click(screen.getByRole("button", { name: "Confirmer le retrait" }));
    expect(JSON.parse(screen.getByTestId("value").textContent!)[0]).toEqual(expect.objectContaining({ id: "v1", sku: "KEEP", stock: 0, removed: true }));
    await user.click(screen.getByText("SKU avancés"));
    expect(screen.getByText(/Historique désactivée/)).toBeVisible();
    await user.click(screen.getByRole("checkbox", { name: "Noir" }));
    expect(JSON.parse(screen.getByTestId("value").textContent!)[0]).toEqual(expect.objectContaining({ id: "v1", sku: "KEEP", removed: false }));
  });

  it("calls the protected-color callback only after confirmation", async () => {
    const user = userEvent.setup();
    const callback = vi.fn();
    function Protected() {
      const [value, setValue] = useState<EditableVariant[]>([{ color: "Noir", size: "38", sku: "N", stock: 0 }]);
      return <VariantEditor productSlug="atlas" value={value} onChange={setValue} disabled={false} errors={{}}
        protectedColors={new Set(["Noir"])} onConfirmedColorRemoval={callback} />;
    }
    render(<Protected />);
    await user.click(screen.getByRole("checkbox", { name: "Noir" }));
    expect(callback).not.toHaveBeenCalled();
    await user.click(screen.getByRole("button", { name: "Confirmer le retrait" }));
    expect(callback).toHaveBeenCalledWith("Noir");
  });

  it("shows conflict errors without changing variants", () => {
    const variants = [
      { id: "1", color: "Noir", size: "38", sku: "ONE", stock: 1 },
      { id: "2", color: "noir", size: "38", sku: "TWO", stock: 2 },
    ];
    render(<Harness initial={variants} />);
    expect(screen.getByRole("alert")).toHaveTextContent(/conflit/i);
    expect(JSON.parse(screen.getByTestId("value").textContent!)).toEqual(variants);
  });

  it("disables controls and links server errors to stock and SKU", async () => {
    render(<Harness disabled initial={[{ color: "Noir", size: "38", sku: "N", stock: 1 }]}
      errors={{ "variants.0.stock": ["Stock invalide"], "variants.0.sku": ["SKU invalide"] }} />);
    expect(screen.getByRole("checkbox", { name: "Noir" })).toBeDisabled();
    expect(screen.getByRole("spinbutton")).toBeDisabled();
    expect(screen.getByRole("spinbutton")).toHaveAccessibleDescription("Stock invalide");
    expect(screen.getByText("SKU avancés")).toBeVisible();
  });
});
