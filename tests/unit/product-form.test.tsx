import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ProductForm } from "@/components/admin/product-form";

const mocks = vi.hoisted(() => ({
  save: vi.fn(),
  upload: vi.fn(),
  push: vi.fn(),
  refresh: vi.fn(),
}));

vi.mock("@/app/actions/save-product", () => ({ saveProductAction: mocks.save }));
vi.mock("@/app/actions/upload-product-image", () => ({ uploadProductImageAction: mocks.upload }));
vi.mock("next/navigation", () => ({ useRouter: () => ({ push: mocks.push, refresh: mocks.refresh }) }));

const validDraft = {
  name: "Botte Atlas",
  description: "Une description suffisamment longue pour le formulaire.",
  priceDh: 850,
  slug: "botte-atlas",
  isVisible: false,
  images: [{ url: "https://example.com/atlas.webp", alt: "Botte Atlas noire", position: 0 }],
  variants: [{ sku: "ATLAS-38", size: "38", color: "Noir", stock: 3 }],
};

beforeEach(() => vi.clearAllMocks());
afterEach(cleanup);

describe("ProductForm", () => {
  it("explique pourquoi un produit sans image ni déclinaison ne peut pas être visible", () => {
    render(<ProductForm />);
    expect(screen.getByRole("checkbox", { name: /produit visible/i })).toBeDisabled();
    expect(screen.getByText(/ajoutez une image et une déclinaison pour publier/i)).toBeVisible();
  });

  it("verrouille deux soumissions synchrones et conserve les valeurs en cas d'erreur", async () => {
    let resolve!: (value: unknown) => void;
    mocks.save.mockReturnValue(new Promise((done) => { resolve = done; }));
    render(<ProductForm initialValue={validDraft} />);
    const form = screen.getByRole("button", { name: "Enregistrer" }).closest("form")!;
    fireEvent.submit(form);
    fireEvent.submit(form);
    expect(mocks.save).toHaveBeenCalledTimes(1);
    resolve({ ok: false, code: "DUPLICATE_SLUG", message: "Ce slug est déjà utilisé.", fieldErrors: {} });
    expect(await screen.findByRole("alert")).toHaveTextContent("Ce slug est déjà utilisé.");
    expect(screen.getByRole("textbox", { name: "Nom" })).toHaveValue("Botte Atlas");
    expect(screen.getByRole("textbox", { name: "Slug" })).toHaveValue("botte-atlas");
  });

  it("verrouille deux événements de téléversement synchrones et affiche l'erreur", async () => {
    let resolve!: (value: unknown) => void;
    mocks.upload.mockReturnValue(new Promise((done) => { resolve = done; }));
    render(<ProductForm />);
    const input = screen.getByLabelText(/téléverser une image/i);
    const file = new File(["x"], "botte.webp", { type: "image/webp" });
    fireEvent.change(input, { target: { files: [file] } });
    fireEvent.change(input, { target: { files: [file] } });
    expect(mocks.upload).toHaveBeenCalledTimes(1);
    resolve({ ok: false, message: "Le téléversement a échoué." });
    expect(await screen.findByRole("alert")).toHaveTextContent("Le téléversement a échoué.");
    expect(input).toHaveAttribute("accept", "image/jpeg,image/png,image/webp");
  });

  it("affiche l'aperçu et son alt éditable, permet de le retirer et soumet des données conformes", async () => {
    const user = userEvent.setup();
    mocks.save.mockResolvedValue({ ok: true, id: "cm12345678901234567890123", slug: "botte-atlas" });
    render(<ProductForm initialValue={validDraft} />);
    expect(screen.getByRole("link", { name: "Aperçu 1" })).toHaveAttribute("href", validDraft.images[0].url);
    expect(screen.getByRole("textbox", { name: "Texte alternatif" })).toHaveValue("Botte Atlas noire");
    await user.click(screen.getByRole("button", { name: "Enregistrer" }));
    await waitFor(() => expect(mocks.save).toHaveBeenCalledWith(validDraft));
    expect(mocks.push).toHaveBeenCalledWith("/admin/produits/cm12345678901234567890123");
    await user.click(within(screen.getByRole("heading", { name: "Images" }).closest("section")!).getByRole("button", { name: "Retirer" }));
    expect(screen.queryByRole("link", { name: "Aperçu 1" })).not.toBeInTheDocument();
  });
});

describe("VariantEditor through ProductForm", () => {
  it("ajoute, modifie et retire une déclinaison", async () => {
    const user = userEvent.setup();
    render(<ProductForm />);
    await user.click(screen.getByRole("button", { name: /ajouter une déclinaison/i }));
    await user.type(screen.getByRole("textbox", { name: "Pointure" }), "39");
    await user.type(screen.getByRole("textbox", { name: "Couleur" }), "brun");
    await user.type(screen.getByRole("textbox", { name: "SKU" }), "atlas-39");
    expect(screen.getByRole("textbox", { name: "SKU" })).toHaveValue("ATLAS-39");
    await user.click(screen.getByRole("button", { name: "Retirer" }));
    expect(screen.queryByRole("textbox", { name: "Pointure" })).not.toBeInTheDocument();
  });
});
