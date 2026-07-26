"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";

import { createOrderAction } from "@/app/actions/create-order";
import { formatPriceDh } from "@/lib/catalog/price";
import { LoadingLabel } from "@/components/ui/loading-label";
import { checkoutSchema } from "@/lib/validation/checkout";
import { useCart } from "./cart-provider";
import { localizePath } from "@/lib/i18n/config";
import { useStorefrontI18n } from "@/components/shop/locale-provider";

type CustomerFields = {
  firstName: string; lastName: string; phone: string; email: string; address: string;
  addressComplement: string; city: string; region: string; postalCode: string;
  country: "Maroc"; deliveryNotes: string;
};
type FieldName = keyof CustomerFields;

const initialFields: CustomerFields = {
  firstName: "", lastName: "", phone: "", email: "", address: "", addressComplement: "",
  city: "", region: "", postalCode: "", country: "Maroc", deliveryNotes: "",
};

const failureMessages = {
  INVALID: "Certaines informations sont invalides.",
  OUT_OF_STOCK: "Un article n’est plus disponible dans la quantité demandée.",
  RATE_LIMITED: "Trop de commandes ont été tentées. Veuillez réessayer dans quelques minutes.",
  UNKNOWN: "Une erreur inattendue est survenue. Veuillez réessayer.",
} as const;

export function CheckoutForm() {
  const { locale, dictionary } = useStorefrontI18n();
  const ar = locale === "ar";
  const labels = ar ? {
    heading: "معلومات التوصيل", eyebrow: "إتمام طلبك", intro: "سنستخدم هذه المعلومات فقط لتحضير طلبك وتوصيله.",
    contact: "معلوماتك", firstName: "الاسم الأول", lastName: "النسب", phone: "الهاتف", email: "البريد الإلكتروني",
    addressGroup: "عنوان التوصيل", address: "عنوان التوصيل", complement: "الشقة أو الطابق أو علامة مميزة", city: "المدينة",
    region: "الجهة", postalCode: "الرمز البريدي", country: "البلد", notes: "تعليمات التوصيل", optional: "اختياري",
    pending: "جارٍ تسجيل الطلب…", submit: dictionary.checkout.submit, invalid: "يرجى تصحيح الحقول المشار إليها.",
    empty: dictionary.cart.empty, viewCollection: "عرض المجموعة", backCart: "العودة إلى السلة",
  } : {
    heading: "Livraison", eyebrow: "Finaliser votre achat", intro: "Nous les utiliserons uniquement pour préparer et livrer cette commande.",
    contact: "Vos coordonnées", firstName: "Prénom", lastName: "Nom", phone: "Téléphone", email: "E-mail",
    addressGroup: "Adresse de livraison", address: "Adresse de livraison", complement: "Appartement, étage ou repère", city: "Ville",
    region: "Région", postalCode: "Code postal", country: "Pays", notes: "Instructions de livraison", optional: "Facultatif",
    pending: "Commande en cours…", submit: "Confirmer ma commande", invalid: "Veuillez corriger les champs indiqués.",
    empty: "Votre panier est vide.", viewCollection: "Voir la collection", backCart: "Retour au panier",
  };
  const { dispatch, hydrated, itemCount, items, totalDh } = useCart();
  const router = useRouter();
  const [fields, setFields] = useState(initialFields);
  const [fieldErrors, setFieldErrors] = useState<Partial<Record<FieldName, string>>>({});
  const [formError, setFormError] = useState("");
  const [pending, setPending] = useState(false);
  const [completedOrderNumber, setCompletedOrderNumber] = useState<string | null>(null);
  const [navigationFailed, setNavigationFailed] = useState(false);
  const submitLocked = useRef(false);

  if (!hydrated) return <div className="cart-status" role="status">{dictionary.common.loading}</div>;
  if (completedOrderNumber) {
    const confirmationHref = localizePath(`/commande/${completedOrderNumber}`, locale);
    return <section className="cart-empty checkout-handoff" aria-live="polite"><p className="eyebrow">Commande enregistrée</p><h1>Votre commande est confirmée.</h1><p>Numéro de commande <strong>{completedOrderNumber}</strong></p>{navigationFailed && <p>La navigation automatique n’a pas abouti. Votre commande est bien enregistrée&nbsp;: utilisez le lien ci-dessous pour afficher sa confirmation.</p>}<Link className="primary-link" href={confirmationHref}>Voir la confirmation de commande</Link></section>;
  }
  if (items.length === 0) return <section className="cart-empty"><p className="eyebrow">{dictionary.checkout.summary}</p><h1>{labels.empty}</h1><div className="empty-actions"><Link className="primary-link" href={localizePath("/", locale)}>{labels.viewCollection}</Link><Link className="secondary-link" href={localizePath("/panier", locale)}>{labels.backCart}</Link></div></section>;

  const actionItems = items.map(({ variantId, quantity }) => ({ variantId, quantity }));

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submitLocked.current) return;
    submitLocked.current = true;
    setFormError("");
    setFieldErrors({});
    const localizedInput = locale === "ar" ? { ...fields, items: actionItems, locale } : { ...fields, items: actionItems };
    const parsed = checkoutSchema.safeParse(localizedInput);
    if (!parsed.success) {
      const flattened = parsed.error.flatten().fieldErrors;
      setFieldErrors({
        firstName: flattened.firstName?.[0], lastName: flattened.lastName?.[0],
        phone: flattened.phone?.[0], email: flattened.email?.[0], address: flattened.address?.[0],
        addressComplement: flattened.addressComplement?.[0], city: flattened.city?.[0],
        region: flattened.region?.[0], postalCode: flattened.postalCode?.[0],
        country: flattened.country?.[0], deliveryNotes: flattened.deliveryNotes?.[0],
      });
      setFormError(labels.invalid);
      submitLocked.current = false;
      return;
    }
    setPending(true);
    let succeeded = false;
    try {
      const result = await createOrderAction(localizedInput);
      if (!result.ok) {
        if (result.code === "INVALID" && result.fieldErrors) {
          setFieldErrors({
            firstName: result.fieldErrors.firstName?.[0], lastName: result.fieldErrors.lastName?.[0],
            phone: result.fieldErrors.phone?.[0], email: result.fieldErrors.email?.[0],
            address: result.fieldErrors.address?.[0], addressComplement: result.fieldErrors.addressComplement?.[0],
            city: result.fieldErrors.city?.[0], region: result.fieldErrors.region?.[0],
            postalCode: result.fieldErrors.postalCode?.[0], country: result.fieldErrors.country?.[0],
            deliveryNotes: result.fieldErrors.deliveryNotes?.[0],
          });
        }
        setFormError(failureMessages[result.code]);
        return;
      }
      setCompletedOrderNumber(result.number);
      succeeded = true;
      dispatch({ type: "clear" });
      try {
        router.push(localizePath(`/commande/${result.number}`, locale));
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
      <p className="eyebrow">{labels.eyebrow}</p><h1 id="checkout-title">{labels.heading}</h1>
      <p className="checkout-intro">{labels.intro}</p>
      <form onSubmit={submit} noValidate aria-busy={pending}>
        {formError && <div className="form-error-summary" role="alert" aria-live="assertive">{formError}</div>}
        <fieldset className="checkout-fieldset"><legend>{labels.contact}</legend><div className="checkout-fields">
          <CheckoutField label={labels.firstName} name="firstName" autoComplete="given-name" value={fields.firstName} error={fieldErrors.firstName} onChange={field} />
          <CheckoutField label={labels.lastName} name="lastName" autoComplete="family-name" value={fields.lastName} error={fieldErrors.lastName} onChange={field} />
          <CheckoutField label={labels.phone} name="phone" autoComplete="tel" inputMode="tel" value={fields.phone} error={fieldErrors.phone} onChange={field} />
          <CheckoutField label={labels.email} name="email" autoComplete="email" inputMode="email" value={fields.email} error={fieldErrors.email} onChange={field} optional optionalLabel={labels.optional} />
        </div></fieldset>
        <fieldset className="checkout-fieldset"><legend>{labels.addressGroup}</legend><div className="checkout-fields">
          <CheckoutField label={labels.address} name="address" autoComplete="street-address" value={fields.address} error={fieldErrors.address} onChange={field} multiline />
          <CheckoutField label={labels.complement} name="addressComplement" autoComplete="address-line2" value={fields.addressComplement} error={fieldErrors.addressComplement} onChange={field} optional optionalLabel={labels.optional} />
          <CheckoutField label={labels.city} name="city" autoComplete="address-level2" value={fields.city} error={fieldErrors.city} onChange={field} />
          <CheckoutField label={labels.region} name="region" autoComplete="address-level1" value={fields.region} error={fieldErrors.region} onChange={field} />
          <CheckoutField label={labels.postalCode} name="postalCode" autoComplete="postal-code" inputMode="numeric" value={fields.postalCode} error={fieldErrors.postalCode} onChange={field} optional optionalLabel={labels.optional} />
          <CheckoutField label={labels.country} name="country" autoComplete="country-name" value={fields.country} error={fieldErrors.country} onChange={field} readOnly />
          <CheckoutField label={labels.notes} name="deliveryNotes" autoComplete="off" value={fields.deliveryNotes} error={fieldErrors.deliveryNotes} onChange={field} multiline optional optionalLabel={labels.optional} />
        </div></fieldset>
        <button className="checkout-submit" type="submit" disabled={pending}>{pending ? <LoadingLabel>{labels.pending}</LoadingLabel> : labels.submit}</button>
        <p className="submit-note">{dictionary.checkout.paymentNote}</p>
      </form>
    </section>
    <aside className="checkout-summary" aria-label={locale === "fr" ? "Récapitulatif de la commande" : dictionary.checkout.summary}>
      <h2>{dictionary.cart.summary}</h2>
      <div className="checkout-items">{items.map((item) => <div className="checkout-item" key={item.variantId}><div><strong>{item.productName}</strong><span>{dictionary.colors[item.color] ?? item.color} · {dictionary.product.size} {item.size} · {dictionary.cart.quantity} {item.quantity}</span></div><span>{formatPriceDh(item.unitPriceDh * item.quantity)}</span></div>)}</div>
      <div className="checkout-total"><span>{dictionary.checkout.total} · {itemCount} {itemCount > 1 ? dictionary.common.products : dictionary.common.product}</span><strong>{formatPriceDh(totalDh)}</strong></div>
      <div className="delivery-payment"><span aria-hidden="true">✓</span><div><strong>{dictionary.checkout.payment}</strong><p>{dictionary.checkout.paymentNote}</p></div></div>
    </aside>
  </div>;
}

function CheckoutField({ label, name, autoComplete, value, error, onChange, inputMode, multiline = false, optional = false, optionalLabel = "Facultatif", readOnly = false }: {
  label: string; name: FieldName; autoComplete: string; value: string; error?: string;
  onChange: (name: FieldName, value: string) => void; inputMode?: "tel" | "email" | "numeric";
  multiline?: boolean; optional?: boolean; optionalLabel?: string; readOnly?: boolean;
}) {
  const errorId = `${name}-error`;
  const common = { id: name, name, autoComplete, value, required: !optional, readOnly, "aria-invalid": Boolean(error), "aria-describedby": error ? errorId : undefined, onChange: (event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => onChange(name, event.currentTarget.value) };
  const type = name === "phone" ? "tel" : name === "email" ? "email" : "text";
  return <div className={`form-field${multiline ? " form-field-wide" : ""}`}><label htmlFor={name}>{label}{optional ? <span>{optionalLabel}</span> : null}</label>{multiline ? <textarea {...common} rows={name === "deliveryNotes" ? 3 : 4} /> : <input {...common} inputMode={inputMode} type={type} />}{error && <p className="field-error" id={errorId}>{error}</p>}</div>;
}
