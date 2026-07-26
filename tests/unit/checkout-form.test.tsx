import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { act } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { CartProvider } from "@/components/cart/cart-provider";
import { CheckoutForm } from "@/components/cart/checkout-form";
import { LocaleProvider } from "@/components/shop/locale-provider";

const { createOrderAction, push } = vi.hoisted(() => ({
  createOrderAction: vi.fn(),
  push: vi.fn(),
}));

vi.mock("@/app/actions/create-order", () => ({ createOrderAction }));
vi.mock("next/navigation", () => ({ useRouter: () => ({ push }) }));

const cartItem = {
  variantId: "variant-atlas-40",
  productSlug: "atlas",
  productName: "Atlas",
  imageUrl: null,
  size: "40",
  color: "Brun",
  unitPriceDh: 899,
  availableStock: 3,
  quantity: 2,
};

function renderCheckout(items = [cartItem], locale: "fr" | "ar" = "fr") {
  localStorage.setItem("boots-cart-v1", JSON.stringify(items));
  return render(<LocaleProvider locale={locale}><CartProvider><CheckoutForm /></CartProvider></LocaleProvider>);
}

async function fillValidForm() {
  const user = userEvent.setup();
  await user.type(screen.getByLabelText("Prénom"), "Amine");
  await user.type(screen.getByLabelText("Nom"), "El Idrissi");
  await user.type(screen.getByLabelText("Téléphone"), "0612345678");
  await user.type(screen.getByLabelText("Adresse de livraison"), "12 rue des Fleurs, Rabat");
  await user.type(screen.getByLabelText("Ville"), "Rabat");
  await user.type(screen.getByLabelText("Région"), "Rabat-Salé-Kénitra");
  return user;
}

beforeEach(() => {
  localStorage.clear();
  createOrderAction.mockReset();
  push.mockReset();
});
afterEach(() => { cleanup(); vi.restoreAllMocks(); });

describe("CheckoutForm", () => {
  it("affiche le parcours de livraison en arabe et conserve la route arabe", async () => {
    renderCheckout([cartItem], "ar");
    expect(await screen.findByRole("heading", { name: "معلومات التوصيل" })).toBeVisible();
    expect(screen.getByLabelText("الاسم الأول")).toBeVisible();
    expect(screen.getByRole("button", { name: "تأكيد الطلب" })).toBeVisible();
  });

  it("attend l’hydratation puis affiche un état vide avec retour au catalogue", async () => {
    renderCheckout([]);
    expect(await screen.findByRole("heading", { name: "Votre panier est vide." })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Voir la collection" })).toHaveAttribute("href", "/");
    expect(screen.getByRole("link", { name: "Retour au panier" })).toHaveAttribute("href", "/panier");
  });

  it("affiche les articles, le total et le paiement à la livraison", async () => {
    renderCheckout();
    const summary = await screen.findByRole("complementary", { name: "Récapitulatif de la commande" });
    expect(within(summary).getByText("Atlas")).toBeInTheDocument();
    expect(within(summary).getByText(/Brun · Pointure 40 · Quantité 2/)).toBeInTheDocument();
    expect(within(summary).getAllByText("1.798 DH")).toHaveLength(2);
    expect(within(summary).getByText("Paiement à la livraison")).toBeInTheDocument();
  });

  it("valide les champs requis en français avec des erreurs accessibles", async () => {
    renderCheckout();
    await screen.findByLabelText("Prénom");
    fireEvent.submit(screen.getByRole("button", { name: "Confirmer ma commande" }).closest("form")!);

    expect(await screen.findByRole("alert")).toHaveTextContent("Veuillez corriger les champs indiqués");
    expect(screen.getByText("Le prénom doit contenir au moins 2 caractères.")).toBeInTheDocument();
    expect(screen.getByText("Le nom doit contenir au moins 2 caractères.")).toBeInTheDocument();
    expect(screen.getByText("Le numéro de téléphone marocain est invalide.")).toBeInTheDocument();
    expect(screen.getByText("L’adresse doit contenir au moins 10 caractères.")).toBeInTheDocument();
    expect(screen.getByText("La ville doit contenir au moins 2 caractères.")).toBeInTheDocument();
    expect(screen.getByText("La région doit contenir au moins 2 caractères.")).toBeInTheDocument();
    expect(createOrderAction).not.toHaveBeenCalled();
  });

  it("n’envoie que l’identité des variantes et les quantités avec les champs visibles", async () => {
    createOrderAction.mockResolvedValue({ ok: false, code: "UNKNOWN" });
    renderCheckout();
    const user = await fillValidForm();
    await user.click(screen.getByRole("button", { name: "Confirmer ma commande" }));

    await waitFor(() => expect(createOrderAction).toHaveBeenCalledWith({
      firstName: "Amine",
      lastName: "El Idrissi",
      phone: "0612345678",
      email: "",
      address: "12 rue des Fleurs, Rabat",
      addressComplement: "",
      city: "Rabat",
      region: "Rabat-Salé-Kénitra",
      postalCode: "",
      country: "Maroc",
      deliveryNotes: "",
      items: [{ variantId: "variant-atlas-40", quantity: 2 }],
    }));
    expect(createOrderAction.mock.calls[0][0]).not.toHaveProperty("totalDh");
    expect(createOrderAction.mock.calls[0][0].items[0]).not.toHaveProperty("unitPriceDh");
  });

  it.each([
    ["INVALID", "Certaines informations sont invalides."],
    ["OUT_OF_STOCK", "Un article n’est plus disponible dans la quantité demandée."],
    ["UNKNOWN", "Une erreur inattendue est survenue. Veuillez réessayer."],
  ])("conserve les valeurs et le panier après une erreur %s", async (code, message) => {
    createOrderAction.mockResolvedValue({ ok: false, code });
    renderCheckout();
    const user = await fillValidForm();
    await user.click(screen.getByRole("button", { name: "Confirmer ma commande" }));

    expect(await screen.findByText(message)).toBeInTheDocument();
    expect(screen.getByLabelText("Prénom")).toHaveValue("Amine");
    expect(screen.getByLabelText("Nom")).toHaveValue("El Idrissi");
    expect(screen.getByLabelText("Téléphone")).toHaveValue("0612345678");
    expect(screen.getByLabelText("Adresse de livraison")).toHaveValue("12 rue des Fleurs, Rabat");
    expect(JSON.parse(localStorage.getItem("boots-cart-v1") ?? "[]")).toHaveLength(1);
    expect(push).not.toHaveBeenCalled();
  });

  it("désactive l’envoi pendant la requête et empêche un double envoi", async () => {
    let resolve!: (value: { ok: false; code: "UNKNOWN" }) => void;
    createOrderAction.mockImplementation(() => new Promise((done) => { resolve = done; }));
    renderCheckout();
    const user = await fillValidForm();
    const button = screen.getByRole("button", { name: "Confirmer ma commande" });
    await user.click(button);

    expect(screen.getByRole("button", { name: "Commande en cours…" })).toBeDisabled();
    expect(button.closest("form")).toHaveAttribute("aria-busy", "true");
    expect(screen.getByRole("status")).toHaveTextContent("Commande en cours…");
    fireEvent.click(screen.getByRole("button", { name: "Commande en cours…" }));
    expect(createOrderAction).toHaveBeenCalledTimes(1);
    resolve({ ok: false, code: "UNKNOWN" });
    expect(await screen.findByRole("button", { name: "Confirmer ma commande" })).toBeEnabled();
  });

  it("bloque deux soumissions déclenchées dans le même tour de rendu", async () => {
    let resolve!: (value: { ok: false; code: "UNKNOWN" }) => void;
    createOrderAction.mockImplementation(() => new Promise((done) => { resolve = done; }));
    renderCheckout();
    await fillValidForm();
    const form = screen.getByRole("button", { name: "Confirmer ma commande" }).closest("form")!;

    act(() => {
      form.dispatchEvent(new Event("submit", { bubbles: true, cancelable: true }));
      form.dispatchEvent(new Event("submit", { bubbles: true, cancelable: true }));
    });

    await waitFor(() => expect(createOrderAction).toHaveBeenCalledTimes(1));
    resolve({ ok: false, code: "UNKNOWN" });
    expect(await screen.findByText("Une erreur inattendue est survenue. Veuillez réessayer.")).toBeInTheDocument();
  });

  it("vide le panier une seule fois puis navigue vers la confirmation", async () => {
    createOrderAction.mockResolvedValue({ ok: true, number: "BOT-ABC123DE45" });
    const setItem = vi.spyOn(Storage.prototype, "setItem");
    renderCheckout();
    await waitFor(() => expect(screen.getByLabelText("Prénom")).toBeInTheDocument());
    const writesBeforeSubmit = setItem.mock.calls.length;
    const user = await fillValidForm();
    await user.click(screen.getByRole("button", { name: "Confirmer ma commande" }));

    await waitFor(() => expect(push).toHaveBeenCalledWith("/commande/BOT-ABC123DE45"));
    const clearWrites = setItem.mock.calls.slice(writesBeforeSubmit).filter(([, value]) => value === "[]");
    expect(clearWrites).toHaveLength(1);
  });

  it("préserve le succès et propose un lien direct lorsque la navigation échoue", async () => {
    createOrderAction.mockResolvedValue({ ok: true, number: "BOT-ABC123DE45" });
    push.mockImplementation(() => { throw new Error("navigation indisponible"); });
    const setItem = vi.spyOn(Storage.prototype, "setItem");
    renderCheckout();
    await waitFor(() => expect(screen.getByLabelText("Prénom")).toBeInTheDocument());
    const writesBeforeSubmit = setItem.mock.calls.length;
    const user = await fillValidForm();
    await user.click(screen.getByRole("button", { name: "Confirmer ma commande" }));

    expect(await screen.findByText("BOT-ABC123DE45")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Voir la confirmation de commande" })).toHaveAttribute("href", "/commande/BOT-ABC123DE45");
    expect(screen.getByText(/navigation automatique n’a pas abouti/i)).toBeInTheDocument();
    expect(screen.queryByText("Une erreur inattendue est survenue. Veuillez réessayer.")).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Confirmer ma commande" })).not.toBeInTheDocument();
    expect(createOrderAction).toHaveBeenCalledTimes(1);
    const clearWrites = setItem.mock.calls.slice(writesBeforeSubmit).filter(([, value]) => value === "[]");
    expect(clearWrites).toHaveLength(1);
  });
});
