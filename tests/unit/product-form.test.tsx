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
  nameAr: "",
  description: "Une description suffisamment longue pour le formulaire.",
  descriptionAr: "",
  priceDh: 850,
  slug: "botte-atlas",
  isVisible: false,
  images: [{ url: "https://example.com/atlas.webp", alt: "Botte Atlas noire", color: "Noir", position: 0 }],
  variants: [{ sku: "ATLAS-38", size: "38", color: "Noir", stock: 3 }],
};

beforeEach(() => vi.clearAllMocks());
afterEach(cleanup);

describe("ProductForm", () => {
  it("groups an interleaved initial gallery and submits unique global positions", async () => {
    mocks.save.mockResolvedValue({ ok: false, code: "INVALID", message: "stop", fieldErrors: {} });
    const user = userEvent.setup();
    render(<ProductForm initialValue={{ ...validDraft, images: [
      { url: "https://example.com/cognac.webp", alt: "Cognac", color: "Cognac", position: 0 },
      { url: "https://example.com/noir.webp", alt: "Noir", color: "Noir", position: 1 },
      { url: "https://example.com/rose.webp", alt: "Rose", color: "Rose", position: 2 },
    ], variants: [
      validDraft.variants[0],
      { sku: "COGNAC-38", size: "38", color: "Cognac", stock: 2 },
    ] }} />);
    await user.click(screen.getByRole("button", { name: "Enregistrer le produit" }));
    await waitFor(() => expect(mocks.save).toHaveBeenCalled());
    expect(mocks.save.mock.calls[0][0].images.map((image: typeof validDraft.images[0]) => `${image.color}:${image.position}`))
      .toEqual(["Noir:0", "Cognac:1", "Rose:2"]);
  });

  it("permet de saisir les traductions arabes facultatives", () => {
    render(<ProductForm initialValue={validDraft} />);
    expect(screen.getByRole("textbox", { name: "Nom en arabe" })).toHaveAttribute("dir", "rtl");
    expect(screen.getByRole("textbox", { name: "Description en arabe" })).toHaveAttribute("dir", "rtl");
    expect(screen.getByText(/le contenu français sera utilisé/i)).toBeVisible();
  });

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
    await user.upload(screen.getByLabelText(/téléverser des images pour Noir/i), [
      new File(["black"], "noir.webp", { type: "image/webp" }),
      new File(["brown"], "cognac.webp", { type: "image/webp" }),
    ]);
    expect(await screen.findByRole("link", { name: "Ouvrir l’image 1" })).toBeVisible();
    expect(mocks.upload).toHaveBeenCalledTimes(2);
    expect(screen.getByText("2 images sur 6")).toBeVisible();
  });

  it("conserve les uploads réussis quand un fichier suivant échoue", async () => {
    const user = userEvent.setup();
    mocks.upload
      .mockResolvedValueOnce({ ok: true, url: "https://example.com/kept.webp" })
      .mockRejectedValueOnce(new Error("network"));
    render(<ProductForm initialValue={{ ...validDraft, images: [] }} />);
    await user.upload(screen.getByLabelText(/téléverser des images pour Noir/i), [
      new File(["kept"], "kept.webp", { type: "image/webp" }),
      new File(["failed"], "failed.webp", { type: "image/webp" }),
    ]);
    expect(await screen.findByRole("link", { name: "Ouvrir l’image 1" })).toHaveAttribute("href", "https://example.com/kept.webp");
    expect(screen.getByRole("alert")).toHaveTextContent(/l’import a échoué/i);
    expect(screen.getByRole("checkbox", { name: "Noir" })).toBeEnabled();
    expect(mocks.upload).toHaveBeenCalledTimes(2);
  });

  it("verrouille l'éditeur pendant un upload différé", async () => {
    let resolve!: (value: { ok: true; url: string }) => void;
    mocks.upload.mockReturnValue(new Promise((done) => { resolve = done; }));
    const user = userEvent.setup();
    render(<ProductForm initialValue={validDraft} />);
    await user.upload(screen.getByLabelText(/téléverser des images pour Noir/i), new File(["x"], "new.webp", { type: "image/webp" }));
    expect(screen.getByRole("group", { name: "Déclinaisons" })).toHaveAttribute("aria-busy", "true");
    expect(screen.getByRole("checkbox", { name: "Noir" })).toBeDisabled();
    resolve({ ok: true, url: "https://example.com/new.webp" });
    await waitFor(() => expect(screen.getByRole("checkbox", { name: "Noir" })).toBeEnabled());
  });

  it("réassocie une image à la première couleur encore active si la couleur capturée disparaît", async () => {
    let resolve!: (value: { ok: true; url: string }) => void;
    mocks.upload.mockReturnValue(new Promise((done) => { resolve = done; }));
    const user = userEvent.setup();
    render(<ProductForm initialValue={{
      ...validDraft,
      images: [],
      variants: [
        { sku: "NOIR-38", size: "38", color: "Noir", stock: 0 },
        { sku: "COGNAC-38", size: "38", color: "Cognac", stock: 0 },
      ],
    }} />);
    await user.upload(screen.getByLabelText(/téléverser des images pour Noir/i), new File(["x"], "new.webp", { type: "image/webp" }));
    const capturedColor = screen.getByRole("checkbox", { name: "Noir" });
    screen.getByRole("group", { name: "Déclinaisons" }).removeAttribute("disabled");
    await user.click(capturedColor);
    expect(capturedColor).not.toBeChecked();
    resolve({ ok: true, url: "https://example.com/new.webp" });
    await screen.findByRole("region", { name: "Images du produit" });
    expect(screen.getByRole("tab", { name: /Cognac/ })).toHaveAttribute("aria-selected", "true");
  });

  it("does not overflow a full fallback color when the requested color disappears", async () => {
    let resolve!: (value: { ok: true; url: string }) => void;
    mocks.upload.mockReturnValue(new Promise((done) => { resolve = done; }));
    const user = userEvent.setup();
    const cognacImages = Array.from({ length: 6 }, (_, position) => ({
      url: `https://example.com/cognac-${position}.webp`, alt: `Cognac ${position}`, color: "Cognac", position,
    }));
    render(<ProductForm initialValue={{ ...validDraft, images: cognacImages, variants: [
      { sku: "NOIR-38", size: "38", color: "Noir", stock: 1 },
      { sku: "COGNAC-38", size: "38", color: "Cognac", stock: 1 },
    ] }} />);
    await user.upload(screen.getByLabelText(/téléverser des images pour Noir/i), new File(["x"], "late.webp", { type: "image/webp" }));
    screen.getByRole("group", { name: "Déclinaisons" }).removeAttribute("disabled");
    const noir = screen.getByRole("checkbox", { name: "Noir" });
    noir.removeAttribute("disabled");
    fireEvent.click(noir);
    await user.click(screen.getByRole("button", { name: "Confirmer le retrait" }));
    resolve({ ok: true, url: "https://example.com/late.webp" });
    expect(await screen.findByRole("alert")).toHaveTextContent(/maximum 6 images/i);
    await user.click(screen.getByRole("button", { name: "Enregistrer le produit" }));
    await waitFor(() => expect(mocks.save).toHaveBeenCalled());
    expect(mocks.save.mock.calls[0][0].images).toHaveLength(6);
  });

  it("affiche l'erreur serveur de couleur d'une image", async () => {
    mocks.save.mockResolvedValue({ ok: false, code: "INVALID", message: "Erreur.", fieldErrors: {
      "images.0.color": ["Couleur d’image invalide"],
    } });
    render(<ProductForm initialValue={validDraft} />);
    fireEvent.submit(screen.getByRole("button", { name: "Enregistrer le produit" }).closest("form")!);
    expect(await screen.findByText("Couleur d’image invalide")).toBeVisible();
  });
});

describe("ProductForm failures and accessibility",()=>{
 it("déverrouille et permet une nouvelle sauvegarde après une exception",async()=>{mocks.save.mockRejectedValueOnce(new Error("network")).mockResolvedValueOnce({ok:false,code:"UNKNOWN",message:"Réessayez.",fieldErrors:{}});render(<ProductForm initialValue={validDraft}/>);const button=screen.getByRole("button",{name:"Enregistrer le produit"});fireEvent.submit(button.closest("form")!);expect(await screen.findByRole("alert")).toHaveTextContent(/incertain/i);expect(button).not.toBeDisabled();fireEvent.submit(button.closest("form")!);await waitFor(()=>expect(mocks.save).toHaveBeenCalledTimes(2))});
 it("associe les erreurs aux champs produit, image et déclinaison",async()=>{mocks.save.mockResolvedValue({ok:false,code:"INVALID",message:"Erreur.",fieldErrors:{name:["Nom invalide"],priceDh:["Prix invalide"],"images.0.alt":["Alt invalide"],"variants.0.stock":["Stock invalide"]}});render(<ProductForm initialValue={validDraft}/>);fireEvent.submit(screen.getByRole("button",{name:"Enregistrer le produit"}).closest("form")!);await screen.findByText("Nom invalide");expect(screen.getByRole("textbox",{name:"Nom"})).toHaveAttribute("aria-describedby","product-name-error");expect(screen.getByRole("spinbutton",{name:"Prix (DH)"})).toHaveAttribute("aria-invalid","true");expect(screen.getByRole("textbox",{name:"Texte alternatif"})).toHaveAttribute("aria-describedby","product-image-0-alt-error");expect(screen.getByRole("spinbutton",{name:/Stock Noir, pointure/})).toHaveAttribute("aria-describedby","variant-0-stock-error")});
});

describe("VariantEditor through ProductForm", () => {
  it("repasse en brouillon quand le retrait d’une couleur supprime la dernière image", async () => {
    const user = userEvent.setup();
    render(<ProductForm initialValue={{ ...validDraft, isVisible: true, variants: [
      validDraft.variants[0],
      { sku: "COGNAC-38", size: "38", color: "Cognac", stock: 2 },
    ] }} />);
    await user.click(screen.getByRole("checkbox", { name: "Noir" }));
    await user.click(screen.getByRole("button", { name: "Confirmer le retrait" }));
    expect(screen.getByRole("checkbox", { name: "Produit visible" })).not.toBeChecked();
  });

  it("ajoute, modifie et retire une déclinaison", async () => {
    const user = userEvent.setup();
    render(<ProductForm />);
    await user.click(screen.getByRole("checkbox", { name: "Cognac" }));
    await user.click(screen.getByRole("checkbox", { name: "Pointure 39" }));
    await user.click(screen.getByText("SKU avancés"));
    const sku = screen.getByRole("textbox", { name: "SKU Cognac, pointure 39" });
    await user.clear(sku);
    await user.type(sku, "atlas-39");
    expect(sku).toHaveValue("ATLAS-39");
    await user.click(screen.getByRole("checkbox", { name: "Cognac" }));
    expect(screen.queryByRole("textbox", { name: "SKU Cognac, pointure 39" })).not.toBeInTheDocument();
  });

  it("retire les images protégées après confirmation, mais jamais lors d'un retrait de pointure", async () => {
    const user = userEvent.setup();
    render(<ProductForm initialValue={validDraft} />);
    await user.click(screen.getByRole("checkbox", { name: "Pointure 38" }));
    await user.click(screen.getByRole("button", { name: "Confirmer le retrait" }));
    expect(screen.getByText(/aucune couleur active/i)).toBeVisible();
    await user.click(screen.getByRole("checkbox", { name: "Pointure 38" }));
    await user.click(screen.getByRole("checkbox", { name: "Noir" }));
    expect(screen.getByRole("dialog")).toHaveTextContent(/images.*Noir.*retirées du produit/i);
    await user.click(screen.getByRole("button", { name: "Confirmer le retrait" }));
    expect(screen.queryByRole("region", { name: "Images du produit" })).not.toBeInTheDocument();
  });

  it("soumet une variante historique retirée avec stock nul et sans propriété client", async () => {
    const user = userEvent.setup();
    mocks.save.mockResolvedValue({ ok: false, code: "INVALID", message: "stop", fieldErrors: {} });
    render(<ProductForm initialValue={{ ...validDraft, images: [], variants: [{
      id: "v1", historical: true, sku: "KEEP", size: "38", color: "Noir", stock: 4,
    }] }} />);
    await user.click(screen.getByRole("checkbox", { name: "Noir" }));
    await user.click(screen.getByRole("button", { name: "Confirmer le retrait" }));
    await user.click(screen.getByRole("button", { name: "Enregistrer le produit" }));
    await waitFor(() => expect(mocks.save).toHaveBeenCalled());
    expect(mocks.save.mock.calls[0][0].variants).toEqual([{ id: "v1", sku: "KEEP", size: "38", color: "Noir", stock: 0 }]);
    expect(mocks.save.mock.calls[0][0].variants[0]).not.toHaveProperty("removed");
  });
});
