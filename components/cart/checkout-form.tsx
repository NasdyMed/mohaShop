"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";

import { createOrderAction } from "@/app/actions/create-order";
import { formatPriceDh } from "@/components/shop/product-card";
import { LoadingLabel } from "@/components/ui/loading-label";
import { checkoutSchema } from "@/lib/validation/checkout";
import { useCart } from "./cart-provider";

type CustomerFields = { firstName: string; lastName: string; phone: string; address: string };
type FieldName = keyof CustomerFields;

const initialFields: CustomerFields = { firstName: "", lastName: "", phone: "", address: "" };

const failureMessages = {
  INVALID: "Certaines informations sont invalides.",
  OUT_OF_STOCK: "Un article n’est plus disponible dans la quantité demandée.",
  RATE_LIMITED: "Trop de commandes ont été tentées. Veuillez réessayer dans quelques minutes.",
  UNKNOWN: "Une erreur inattendue est survenue. Veuillez réessayer.",
} as const;

export function CheckoutForm() {
  const { dispatch, hydrated, itemCount, items, totalDh } = useCart();
  const router = useRouter();
  const [fields, setFields] = useState(initialFields);
  const [fieldErrors, setFieldErrors] = useState<Partial<Record<FieldName, string>>>({});
  const [formError, setFormError] = useState("");
  const [pending, setPending] = useState(false);
  const [completedOrderNumber, setCompletedOrderNumber] = useState<string | null>(null);
  const [navigationFailed, setNavigationFailed] = useState(false);
  const submitLocked = useRef(false);

  if (!hydrated) return <div className="cart-status" role="status">Chargement de votre commande…</div>;
  if (completedOrderNumber) {
    const confirmationHref = `/commande/${completedOrderNumber}`;
    return <section className="cart-empty checkout-handoff" aria-live="polite"><p className="eyebrow">Commande enregistrée</p><h1>Votre commande est confirmée.</h1><p>Numéro de commande <strong>{completedOrderNumber}</strong></p>{navigationFailed && <p>La navigation automatique n’a pas abouti. Votre commande est bien enregistrée&nbsp;: utilisez le lien ci-dessous pour afficher sa confirmation.</p>}<Link className="primary-link" href={confirmationHref}>Voir la confirmation de commande</Link></section>;
  }
  if (items.length === 0) return <section className="cart-empty"><p className="eyebrow">Votre commande</p><h1>Votre panier est vide.</h1><p>Ajoutez une paire à votre panier avant de passer commande.</p><div className="empty-actions"><Link className="primary-link" href="/">Voir la collection</Link><Link className="secondary-link" href="/panier">Retour au panier</Link></div></section>;

  const actionItems = items.map(({ variantId, quantity }) => ({ variantId, quantity }));

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submitLocked.current) return;
    submitLocked.current = true;
    setFormError("");
    setFieldErrors({});
    const parsed = checkoutSchema.safeParse({ ...fields, items: actionItems });
    if (!parsed.success) {
      const flattened = parsed.error.flatten().fieldErrors;
      setFieldErrors({
        firstName: flattened.firstName?.[0], lastName: flattened.lastName?.[0],
        phone: flattened.phone?.[0], address: flattened.address?.[0],
      });
      setFormError("Veuillez corriger les champs indiqués.");
      submitLocked.current = false;
      return;
    }
    setPending(true);
    let succeeded = false;
    try {
      const result = await createOrderAction({ ...fields, items: actionItems });
      if (!result.ok) {
        if (result.code === "INVALID" && result.fieldErrors) {
          setFieldErrors({
            firstName: result.fieldErrors.firstName?.[0], lastName: result.fieldErrors.lastName?.[0],
            phone: result.fieldErrors.phone?.[0], address: result.fieldErrors.address?.[0],
          });
        }
        setFormError(failureMessages[result.code]);
        return;
      }
      setCompletedOrderNumber(result.number);
      succeeded = true;
      dispatch({ type: "clear" });
      try {
        router.push(`/commande/${result.number}`);
      } catch {
        setNavigationFailed(true);
      }
    } catch {
      setFormError(failureMessages.UNKNOWN);
    } finally {
      if (!succeeded) submitLocked.current = false;
      setPending(false);
    }
  }

  function field(name: FieldName, value: string) {
    setFields((current) => ({ ...current, [name]: value }));
    if (fieldErrors[name]) setFieldErrors((current) => ({ ...current, [name]: undefined }));
  }

  return <div className="checkout-layout">
    <section className="checkout-panel" aria-labelledby="checkout-title">
      <p className="eyebrow">Finaliser votre achat</p><h1 id="checkout-title">Vos coordonnées</h1>
      <p className="checkout-intro">Nous les utiliserons uniquement pour préparer et livrer cette commande.</p>
      <form onSubmit={submit} noValidate aria-busy={pending}>
        {formError && <div className="form-error-summary" role="alert" aria-live="assertive">{formError}</div>}
        <div className="checkout-fields">
          <CheckoutField label="Prénom" name="firstName" autoComplete="given-name" value={fields.firstName} error={fieldErrors.firstName} onChange={field} />
          <CheckoutField label="Nom" name="lastName" autoComplete="family-name" value={fields.lastName} error={fieldErrors.lastName} onChange={field} />
          <CheckoutField label="Téléphone" name="phone" autoComplete="tel" inputMode="tel" value={fields.phone} error={fieldErrors.phone} onChange={field} />
          <CheckoutField label="Adresse de livraison" name="address" autoComplete="street-address" value={fields.address} error={fieldErrors.address} onChange={field} multiline />
        </div>
        <button className="checkout-submit" type="submit" disabled={pending}>{pending ? <LoadingLabel>Commande en cours…</LoadingLabel> : "Confirmer ma commande"}</button>
        <p className="submit-note">Aucun paiement en ligne — vous réglerez à la livraison.</p>
      </form>
    </section>
    <aside className="checkout-summary" aria-label="Récapitulatif de la commande">
      <h2>Récapitulatif</h2>
      <div className="checkout-items">{items.map((item) => <div className="checkout-item" key={item.variantId}><div><strong>{item.productName}</strong><span>{item.color} · Pointure {item.size} · Quantité {item.quantity}</span></div><span>{formatPriceDh(item.unitPriceDh * item.quantity)}</span></div>)}</div>
      <div className="checkout-total"><span>Total · {itemCount} {itemCount > 1 ? "articles" : "article"}</span><strong>{formatPriceDh(totalDh)}</strong></div>
      <div className="delivery-payment"><span aria-hidden="true">✓</span><div><strong>Paiement à la livraison</strong><p>Réglez votre commande lors de sa réception.</p></div></div>
    </aside>
  </div>;
}

function CheckoutField({ label, name, autoComplete, value, error, onChange, inputMode, multiline = false }: {
  label: string; name: FieldName; autoComplete: string; value: string; error?: string;
  onChange: (name: FieldName, value: string) => void; inputMode?: "tel"; multiline?: boolean;
}) {
  const errorId = `${name}-error`;
  const common = { id: name, name, autoComplete, value, required: true, "aria-invalid": Boolean(error), "aria-describedby": error ? errorId : undefined, onChange: (event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => onChange(name, event.currentTarget.value) };
  return <div className={`form-field${multiline ? " form-field-wide" : ""}`}><label htmlFor={name}>{label}</label>{multiline ? <textarea {...common} rows={4} /> : <input {...common} inputMode={inputMode} type={name === "phone" ? "tel" : "text"} />}{error && <p className="field-error" id={errorId}>{error}</p>}</div>;
}
