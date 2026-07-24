import { cleanup, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";

import { ProductForm } from "@/components/admin/product-form";

vi.mock("@/app/actions/save-product", () => ({ saveProductAction: vi.fn() }));
vi.mock("@/app/actions/upload-product-image", () => ({ uploadProductImageAction: vi.fn() }));
vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }) }));
vi.mock("next/image", () => ({ default: (props: { alt: string }) => <span role="img" aria-label={props.alt} /> }));

const product = {
  name: "Botte Atlas",
  description: "Une description suffisamment longue pour le formulaire.",
  priceDh: 850,
  slug: "botte-atlas",
  isVisible: false,
  images: [
    { url: "https://example.com/atlas.webp", alt: "Botte Atlas noire", position: 0 },
    { url: "https://example.com/atlas-side.webp", alt: "Botte Atlas de profil", position: 1 },
  ],
  variants: [{ sku: "ATLAS-38", size: "38", color: "Noir", stock: 3 }],
};

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe("Impeccable admin product form", () => {
  it("place les déclinaisons avant les images avec une numérotation cohérente", () => {
    const { container } = render(<ProductForm initialValue={product} />);
    const headings = [...container.querySelectorAll(".admin-section-heading h2")].map((heading) => heading.textContent);
    const indices = [...container.querySelectorAll(".admin-section-index")].map((index) => index.textContent);

    expect(headings).toEqual(["Informations", "Tailles et couleurs", "Images"]);
    expect(indices).toEqual(["01", "02", "03"]);
  });

  it("affiche toute la palette sur une image et désactive les couleurs sans déclinaison", () => {
    render(<ProductForm initialValue={product} />);
    const firstCard = within(screen.getByRole("region", { name: "Images du produit" })).getAllByRole("article")[0];
    const picker = within(firstCard).getByRole("group", { name: /visuel pour/i });

    expect(within(picker).queryByRole("radio", { name: "Toutes les couleurs" })).not.toBeInTheDocument();
    expect(within(picker).getAllByRole("radio")).toHaveLength(8);
    expect(within(picker).getByRole("radio", { name: "Noir" })).toBeChecked();
    expect(within(picker).getByRole("radio", { name: "Noir" })).toBeEnabled();
    expect(within(picker).getByRole("radio", { name: "Cognac" })).toBeDisabled();
  });

  it("présente l’upload comme indisponible tant que Vercel Blob n’est pas configuré", () => {
    render(<ProductForm />);

    expect(screen.getByText(/ajouter des images/i)).toBeVisible();
    expect(screen.getByLabelText(/téléverser des images/i)).toHaveAttribute("multiple");
    expect(screen.getByText(/jpeg, png ou webp/i)).toBeVisible();
  });

  it("affiche les images dans de vraies cartes avec aperçu et actions iconiques accessibles", () => {
    render(<ProductForm initialValue={product} />);
    const gallery = screen.getByRole("region", { name: "Images du produit" });

    expect(within(gallery).getByRole("img", { name: "Botte Atlas noire" })).toBeVisible();
    expect(within(gallery).getByRole("button", { name: "Déplacer l’image 2 vers le haut" })).toBeEnabled();
    expect(within(gallery).getByRole("button", { name: "Déplacer l’image 1 vers le bas" })).toBeEnabled();
    expect(within(gallery).getByRole("button", { name: "Supprimer l’image 1" })).toBeEnabled();
  });

  it("remplace le texte libre de couleur par une palette de pastilles", async () => {
    const user = userEvent.setup();
    render(<ProductForm />);
    await user.click(screen.getByRole("button", { name: /ajouter une déclinaison/i }));

    expect(screen.queryByRole("textbox", { name: "Couleur" })).not.toBeInTheDocument();
    const noir = screen.getByRole("radio", { name: "Noir" });
    const cognac = screen.getByRole("radio", { name: "Cognac" });
    expect(noir).toBeChecked();
    expect(cognac).not.toBeChecked();

    await user.click(cognac);
    expect(cognac).toBeChecked();
  });

  it("migre une ancienne couleur libre vers la palette fixe", () => {
    render(<ProductForm initialValue={{ ...product, variants: [{ ...product.variants[0], color: "Brun" }] }} />);

    expect(within(screen.getByRole("group", { name: "Déclinaisons" })).getByRole("radio", { name: "Marron" })).toBeChecked();
  });

  it("repasse automatiquement en brouillon si la dernière image est supprimée", async () => {
    const user = userEvent.setup();
    render(<ProductForm initialValue={{ ...product, isVisible: true, images: [product.images[0]] }} />);

    expect(screen.getByRole("checkbox", { name: "Produit visible" })).toBeChecked();
    await user.click(screen.getByRole("button", { name: "Supprimer l’image 1" }));

    expect(screen.getByRole("checkbox", { name: "Produit visible" })).not.toBeChecked();
    expect(screen.getByText("Ce produit sera enregistré en brouillon.")).toBeVisible();
  });
});
