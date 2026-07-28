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
  firstName: string; lastName: string; address: string; city: string;
};
type FieldName = keyof CustomerFields;

const initialFields: CustomerFields = {
  firstName: "", lastName: "", address: "", city: "",
};

const failureMessages = {
  INVALID: "Certaines informations sont invalides.",
  OUT_OF_STOCK: "Un article n’est plus disponible dans la quantité demandée.",
  RATE_LIMITED: "Trop de commandes ont été tentées. Veuillez réessayer dans quelques minutes.",
  UNKNOWN: "Une erreur inattendue est survenue. Veuillez réessayer.",
} as const;

const failureMessagesAr = {
  INVALID: "بعض المعلومات غير صالحة.",
  OUT_OF_STOCK: "أحد المنتجات لم يعد متوفراً بالكمية المطلوبة.",
  RATE_LIMITED: "تمت محاولات كثيرة. يرجى المحاولة بعد بضع دقائق.",
  UNKNOWN: "حدث خطأ غير متوقع. يرجى المحاولة مرة أخرى.",
} as const;

export function CheckoutForm() {
  const { locale, dictionary } = useStorefrontI18n();
  const ar = locale === "ar";
  const labels = ar ? {
    heading: "معلومات التوصيل", eyebrow: "إتمام طلبك", intro: "سنستخدم هذه المعلومات فقط لتحضير طلبك وتوصيله.",
    contact: "معلومات التوصيل", firstName: "الاسم الأول", lastName: "النسب",
    address: "عنوان التوصيل", city: "المدينة",
    pending: "جارٍ تسجيل الطلب…", submit: dictionary.checkout.submit, invalid: "يرجى تصحيح الحقول المشار إليها.",
    empty: dictionary.cart.empty, viewCollection: "عرض المجموعة", backCart: "العودة إلى السلة",
  } : {
    heading: "Livraison", eyebrow: "Finaliser votre achat", intro: "Nous les utiliserons uniquement pour préparer et livrer cette commande.",
    contact: "Informations de livraison", firstName: "Prénom", lastName: "Nom",
    address: "Adresse de livraison", city: "Ville",
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
  const localizedFailureMessages = ar ? failureMessagesAr : failureMessages;
  const displayFieldError = (error?: string) =>
    ar && error ? "يرجى التحقق من هذا الحقل." : error;

  if (!hydrated) return <div className="cart-status" role="status">{dictionary.common.loading}</div>;
  if (completedOrderNumber) {
    const confirmationHref = localizePath(`/commande/${completedOrderNumber}`, locale);
    return <section className="cart-empty checkout-handoff" aria-live="polite"><p className="eyebrow">{ar ? "تم تسجيل الطلب" : "Commande enregistrée"}</p><h1>{ar ? "تم تأكيد طلبك." : "Votre commande est confirmée."}</h1><p>{ar ? "رقم الطلب" : "Numéro de commande"} <strong>{completedOrderNumber}</strong></p>{navigationFailed && <p>{ar ? "تعذر الانتقال تلقائياً. طلبك مسجل، استخدم الرابط أدناه لعرض التأكيد." : "La navigation automatique n’a pas abouti. Votre commande est bien enregistrée : utilisez le lien ci-dessous pour afficher sa confirmation."}</p>}<Link className="primary-link" href={confirmationHref}>{ar ? "عرض تأكيد الطلب" : "Voir la confirmation de commande"}</Link></section>;
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
        address: flattened.address?.[0], city: flattened.city?.[0],
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
            address: result.fieldErrors.address?.[0], city: result.fieldErrors.city?.[0],
          });
        }
        setFormError(localizedFailureMessages[result.code]);
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
      setFormError(localizedFailureMessages.UNKNOWN);
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
          <CheckoutField label={labels.firstName} name="firstName" autoComplete="given-name" value={fields.firstName} error={displayFieldError(fieldErrors.firstName)} onChange={field} />
          <CheckoutField label={labels.lastName} name="lastName" autoComplete="family-name" value={fields.lastName} error={displayFieldError(fieldErrors.lastName)} onChange={field} />
          <CheckoutField label={labels.address} name="address" autoComplete="street-address" value={fields.address} error={displayFieldError(fieldErrors.address)} onChange={field} multiline />
          <CheckoutField label={labels.city} name="city" autoComplete="address-level2" value={fields.city} error={displayFieldError(fieldErrors.city)} onChange={field} />
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

function CheckoutField({ label, name, autoComplete, value, error, onChange, multiline = false }: {
  label: string; name: FieldName; autoComplete: string; value: string; error?: string;
  onChange: (name: FieldName, value: string) => void;
  multiline?: boolean;
}) {
  const errorId = `${name}-error`;
  const common = { id: name, name, autoComplete, value, required: true, "aria-invalid": Boolean(error), "aria-describedby": error ? errorId : undefined, onChange: (event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => onChange(name, event.currentTarget.value) };
  return <div className={`form-field${multiline ? " form-field-wide" : ""}`}><label htmlFor={name}>{label}</label>{multiline ? <textarea {...common} rows={4} /> : <input {...common} type="text" />}{error && <p className="field-error" id={errorId}>{error}</p>}</div>;
}
