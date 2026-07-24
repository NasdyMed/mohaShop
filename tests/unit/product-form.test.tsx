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
  images: [{ url: "https://example.com/atlas.webp", alt: "Botte Atlas noire", color: "Noir", position: 0 }],
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
    const form = screen.getByRole("button", { name: "Enregistrer le produit" }).closest("form")!;
    fireEvent.submit(form);
    fireEvent.submit(form);
    expect(mocks.save).toHaveBeenCalledTimes(1);
    expect(form).toHaveAttribute("aria-busy", "true");
    expect(screen.getByRole("status")).toHaveTextContent("Enregistrement…");
    expect(screen.getByRole("button", { name: "Enregistrement…" })).toBeDisabled();
    resolve({ ok: false, code: "DUPLICATE_SLUG", message: "Ce slug est déjà utilisé.", fieldErrors: {} });
    expect(await screen.findByRole("alert")).toHaveTextContent("Ce slug est déjà utilisé.");
    expect(screen.getByRole("textbox", { name: "Nom" })).toHaveValue("Botte Atlas");
    expect(screen.getByRole("textbox", { name: "Slug" })).toHaveValue("botte-atlas");
  });

  it("affiche les erreurs simples, imbriquées et de publication près des champs", async () => {
    mocks.save.mockResolvedValue({ ok: false, code: "INVALID", message: "Vérifiez les champs du produit.", fieldErrors: {
      priceDh: ["Prix invalide."], description: ["Description invalide."], images: ["Ajoutez une image."], variants: ["Ajoutez une déclinaison."],
      "images.0.alt": ["Alt invalide."], "variants.0.stock": ["Stock invalide."],
    } });
    render(<ProductForm initialValue={validDraft} />);
    fireEvent.submit(screen.getByRole("button", { name: "Enregistrer le produit" }).closest("form")!);
    for (const error of ["Prix invalide.", "Description invalide.", "Ajoutez une image.", "Ajoutez une déclinaison.", "Alt invalide.", "Stock invalide."]) expect(await screen.findByText(error)).toBeVisible();
  });

  it("affiche l'aperçu et son alt éditable, permet de le retirer et soumet des données conformes", async () => {
    const user = userEvent.setup();
    mocks.save.mockResolvedValue({ ok: true, id: "cm12345678901234567890123", slug: "botte-atlas" });
    render(<ProductForm initialValue={validDraft} />);
    expect(screen.getByRole("link", { name: "Ouvrir l’image 1" })).toHaveAttribute("href", validDraft.images[0].url);
    expect(screen.getByRole("textbox", { name: "Texte alternatif" })).toHaveValue("Botte Atlas noire");
    await user.click(screen.getByRole("button", { name: "Enregistrer le produit" }));
    await waitFor(() => expect(mocks.save).toHaveBeenCalledWith(validDraft));
    expect(mocks.push).toHaveBeenCalledWith("/admin/produits/cm12345678901234567890123?saved=1");
    await user.click(within(screen.getByRole("heading", { name: "Images" }).closest("section")!).getByRole("button", { name: "Supprimer l’image 1" }));
    expect(screen.queryByRole("link", { name: "Ouvrir l’image 1" })).not.toBeInTheDocument();
  });
  it("imports multiple images and associates one with a color", async () => {
    const user = userEvent.setup();
    mocks.upload
      .mockResolvedValueOnce({ ok: true, url: "https://shop.public.blob.vercel-storage.com/noir.webp" })
      .mockResolvedValueOnce({ ok: true, url: "https://shop.public.blob.vercel-storage.com/cognac.webp" });
    render(<ProductForm initialValue={{ ...validDraft, images: [] }} />);
    await user.upload(screen.getByLabelText(/téléverser des images/i), [
      new File(["black"], "noir.webp", { type: "image/webp" }),
      new File(["brown"], "cognac.webp", { type: "image/webp" }),
    ]);
    expect(await screen.findByRole("link", { name: "Ouvrir l’image 1" })).toBeVisible();
    expect(mocks.upload).toHaveBeenCalledTimes(2);
    const images = screen.getByRole("region", { name: "Images du produit" });
    expect(within(images).getAllByRole("radio", { name: "Noir" })).toHaveLength(2);
    expect(within(images).getAllByRole("radio", { name: "Noir" }).every((radio) => radio.hasAttribute("checked"))).toBe(true);
  });
});

describe("ProductForm failures and accessibility",()=>{
 it("déverrouille et permet une nouvelle sauvegarde après une exception",async()=>{mocks.save.mockRejectedValueOnce(new Error("network")).mockResolvedValueOnce({ok:false,code:"UNKNOWN",message:"Réessayez.",fieldErrors:{}});render(<ProductForm initialValue={validDraft}/>);const button=screen.getByRole("button",{name:"Enregistrer le produit"});fireEvent.submit(button.closest("form")!);expect(await screen.findByRole("alert")).toHaveTextContent(/incertain/i);expect(button).not.toBeDisabled();fireEvent.submit(button.closest("form")!);await waitFor(()=>expect(mocks.save).toHaveBeenCalledTimes(2))});
 it("associe les erreurs aux champs produit, image et déclinaison",async()=>{mocks.save.mockResolvedValue({ok:false,code:"INVALID",message:"Erreur.",fieldErrors:{name:["Nom invalide"],priceDh:["Prix invalide"],"images.0.alt":["Alt invalide"],"variants.0.stock":["Stock invalide"]}});render(<ProductForm initialValue={validDraft}/>);fireEvent.submit(screen.getByRole("button",{name:"Enregistrer le produit"}).closest("form")!);await screen.findByText("Nom invalide");expect(screen.getByRole("textbox",{name:"Nom"})).toHaveAttribute("aria-describedby","product-name-error");expect(screen.getByRole("spinbutton",{name:"Prix (DH)"})).toHaveAttribute("aria-invalid","true");expect(screen.getByRole("textbox",{name:"Texte alternatif"})).toHaveAttribute("aria-describedby","product-image-0-alt-error");expect(screen.getByRole("spinbutton",{name:"Stock"})).toHaveAttribute("aria-describedby","variant-0-stock-error")});
});

describe("VariantEditor through ProductForm", () => {
  it("ajoute, modifie et retire une déclinaison", async () => {
    const user = userEvent.setup();
    render(<ProductForm />);
    await user.click(screen.getByRole("button", { name: /ajouter une déclinaison/i }));
    await user.type(screen.getByRole("textbox", { name: "Pointure" }), "39");
    await user.click(screen.getByRole("radio", { name: "Cognac" }));
    await user.type(screen.getByRole("textbox", { name: "SKU" }), "atlas-39");
    expect(screen.getByRole("textbox", { name: "SKU" })).toHaveValue("ATLAS-39");
    await user.click(screen.getByRole("button", { name: "Supprimer" }));
    expect(screen.queryByRole("textbox", { name: "Pointure" })).not.toBeInTheDocument();
  });
});
