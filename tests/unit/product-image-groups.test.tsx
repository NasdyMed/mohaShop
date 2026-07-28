import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";

import { ProductImageGroups } from "@/components/admin/product-image-groups";
import {
  groupImagesByColor,
  moveImageWithinColor,
  normalizeImagePositions,
} from "@/lib/catalog/product-image-groups";

const images = [
  { url: "https://example.com/cognac-2.webp", alt: "Cognac 2", color: "Cognac", position: 3 },
  { url: "https://example.com/noir-2.webp", alt: "Noir 2", color: "Noir", position: 2 },
  { url: "https://example.com/noir-1.webp", alt: "Noir 1", color: "Noir", position: 0 },
  { url: "https://example.com/cognac-1.webp", alt: "Cognac 1", color: "Cognac", position: 1 },
];

afterEach(cleanup);

describe("product image group helpers", () => {
  it("groups in selected color order and stably sorts positions without mutation", () => {
    const original = structuredClone(images);
    const groups = groupImagesByColor(images, ["Noir", "Cognac"]);
    expect(groups.map((group) => [group.color, group.images.map((image) => image.alt)])).toEqual([
      ["Noir", ["Noir 1", "Noir 2"]],
      ["Cognac", ["Cognac 1", "Cognac 2"]],
    ]);
    expect(images).toEqual(original);
  });

  it("normalizes unique global positions and moves only inside one color", () => {
    const normalized = normalizeImagePositions(groupImagesByColor(images, ["Noir", "Cognac"]).flatMap((group) => group.images));
    expect(normalized.map((image) => image.position)).toEqual([0, 1, 2, 3]);
    const moved = moveImageWithinColor(normalized, ["Noir", "Cognac"], "Noir", 1, -1);
    expect(moved.map((image) => `${image.color}:${image.alt}`)).toEqual([
      "Noir:Noir 2", "Noir:Noir 1", "Cognac:Cognac 1", "Cognac:Cognac 2",
    ]);
    expect(moved.map((image) => image.position)).toEqual([0, 1, 2, 3]);
  });

  it("returns an unchanged copy for an invalid source index", () => {
    const mixed = [
      { url: "u1", alt: "Unknown 1", color: "Rose", position: 0 },
      { url: "n1", alt: "Noir", color: "Noir", position: 2 },
      { url: "u2", alt: "Unknown 2", color: null, position: 1 },
    ];
    const ordered = moveImageWithinColor(mixed, ["Noir"], "Noir", 8, -1);
    expect(ordered).toEqual(mixed);
    expect(ordered).not.toBe(mixed);
  });

  it("keeps unknown colors stable at the end after a valid move", () => {
    const mixed = [
      { url: "u1", alt: "Unknown 1", color: "Rose", position: 0 },
      { url: "n2", alt: "Noir 2", color: "Noir", position: 2 },
      { url: "u2", alt: "Unknown 2", color: null, position: 1 },
      { url: "n1", alt: "Noir 1", color: "Noir", position: 0 },
    ];
    const moved = moveImageWithinColor(mixed, ["Noir"], "Noir", 1, -1);
    expect(moved.map((image) => image.alt)).toEqual(["Noir 2", "Noir 1", "Unknown 1", "Unknown 2"]);
  });
});

describe("ProductImageGroups", () => {
  it("shows tabs, per-color counts and a primary badge for each group", async () => {
    const user = userEvent.setup();
    render(<ProductImageGroups colors={["Noir", "Cognac"]} images={images} errors={{}}
      onUploadFiles={vi.fn()} onChangeAlt={vi.fn()} onMoveWithinColor={vi.fn()} onDelete={vi.fn()} />);
    expect(screen.getByRole("tab", { name: /Noir/ })).toHaveAttribute("aria-selected", "true");
    expect(screen.getByText("2 images sur 6")).toBeVisible();
    expect(screen.getByText("Principale")).toBeVisible();
    expect(screen.getAllByRole("textbox", { name: "Texte alternatif" })[0]).toHaveValue("Noir 1");
    await user.click(screen.getByRole("tab", { name: /Cognac/ }));
    expect(screen.getAllByRole("textbox", { name: "Texte alternatif" })[0]).toHaveValue("Cognac 1");
    expect(screen.getByText("Principale")).toBeVisible();
  });

  it("uploads only the remaining capacity and disables upload at six", async () => {
    const upload = vi.fn();
    const six = Array.from({ length: 6 }, (_, position) => ({
      url: `https://example.com/${position}.webp`, alt: `Noir ${position}`, color: "Noir", position,
    }));
    const user = userEvent.setup();
    const { rerender } = render(<ProductImageGroups colors={["Noir"]} images={[]} errors={{}}
      onUploadFiles={upload} onChangeAlt={vi.fn()} onMoveWithinColor={vi.fn()} onDelete={vi.fn()} />);
    const files = Array.from({ length: 7 }, (_, index) => new File(["x"], `${index}.webp`, { type: "image/webp" }));
    await user.upload(screen.getByLabelText(/téléverser des images pour Noir/i), files);
    expect(upload).toHaveBeenCalledWith("Noir", files.slice(0, 6));
    rerender(<ProductImageGroups colors={["Noir"]} images={six} errors={{}}
      onUploadFiles={upload} onChangeAlt={vi.fn()} onMoveWithinColor={vi.fn()} onDelete={vi.fn()} />);
    expect(screen.getByRole("button", { name: /ajouter des images/i })).toBeDisabled();
  });

  it("resets the active color and shows nested errors and empty states", async () => {
    const { rerender } = render(<ProductImageGroups colors={["Noir", "Cognac"]} images={images} errors={{ "images.0.alt": ["Alt invalide."] }}
      onUploadFiles={vi.fn()} onChangeAlt={vi.fn()} onMoveWithinColor={vi.fn()} onDelete={vi.fn()} />);
    await userEvent.click(screen.getByRole("tab", { name: /Cognac/ }));
    rerender(<ProductImageGroups colors={["Noir"]} images={[]} errors={{}}
      onUploadFiles={vi.fn()} onChangeAlt={vi.fn()} onMoveWithinColor={vi.fn()} onDelete={vi.fn()} />);
    expect(screen.getByRole("tab", { name: /Noir/ })).toHaveAttribute("aria-selected", "true");
    expect(screen.getByText(/aucune image pour Noir/i)).toBeVisible();
  });

  it("implements roving tabs with keyboard navigation and linked tabpanels", async () => {
    const user = userEvent.setup();
    render(<ProductImageGroups colors={["Noir", "Cognac"]} images={images} errors={{}}
      onUploadFiles={vi.fn()} onChangeAlt={vi.fn()} onMoveWithinColor={vi.fn()} onDelete={vi.fn()} />);
    const noir = screen.getByRole("tab", { name: /Noir/ });
    const cognac = screen.getByRole("tab", { name: /Cognac/ });
    expect(noir).toHaveAttribute("tabindex", "0");
    expect(cognac).toHaveAttribute("tabindex", "-1");
    expect(noir).toHaveAttribute("aria-controls", expect.stringMatching(/panel/));
    const panel = screen.getByRole("tabpanel");
    expect(panel).toHaveAttribute("aria-labelledby", noir.id);
    noir.focus();
    await user.keyboard("{ArrowRight}");
    expect(cognac).toHaveFocus();
    expect(cognac).toHaveAttribute("aria-selected", "true");
    expect(screen.getByRole("tabpanel")).toHaveAttribute("aria-labelledby", cognac.id);
    await user.keyboard("{Home}");
    expect(noir).toHaveFocus();
  });
});
