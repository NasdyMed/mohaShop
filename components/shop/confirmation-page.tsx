import Link from "next/link";
import { notFound } from "next/navigation";

import { formatPriceDh } from "@/lib/catalog/price";
import { getOrderConfirmation } from "@/lib/orders/queries";
import { getDictionary } from "@/lib/i18n/dictionaries";
import { localizePath, type Locale } from "@/lib/i18n/config";

const statuses = {
  fr: { NEW: "Commande reçue", CONFIRMED: "Confirmée", SHIPPED: "Expédiée", DELIVERED: "Livrée", CANCELLED: "Annulée" },
  ar: { NEW: "تم استلام الطلب", CONFIRMED: "تم التأكيد", SHIPPED: "تم الشحن", DELIVERED: "تم التسليم", CANCELLED: "ملغى" },
} as const;

export async function ConfirmationPageView({ locale, number }: { locale: Locale; number: string }) {
  const order = await getOrderConfirmation(number);
  if (!order) notFound();
  const dictionary = getDictionary(locale);

  return <main><div className="shell confirmation-page"><section className="confirmation-card">
    <p className="success-mark" aria-hidden="true">✓</p>
    <p className="eyebrow">{dictionary.confirmation.eyebrow}</p>
    <h1>{dictionary.confirmation.title}</h1>
    <p className="confirmation-number">{dictionary.confirmation.number} <strong dir="ltr">{order.number}</strong></p>
    <p className="order-status">{dictionary.confirmation.status} : {statuses[locale][order.status]}</p>
    <div className="confirmation-lines">{order.items.map((item, index) => <div key={`${item.productName}-${item.size}-${item.color}-${index}`}><span>{item.productName} · {dictionary.colors[item.color] ?? item.color} · {dictionary.product.size} {item.size} · {item.quantity} × {formatPriceDh(item.unitPriceDh)}</span><strong>{formatPriceDh(item.unitPriceDh * item.quantity)}</strong></div>)}</div>
    <div className="confirmation-total"><span>{dictionary.checkout.total}</span><strong>{formatPriceDh(order.totalDh)}</strong></div>
    <div className="confirmation-note"><h2>{dictionary.checkout.payment}</h2><p>{dictionary.checkout.paymentNote}</p></div>
    <Link className="primary-link" href={localizePath("/", locale)}>{dictionary.confirmation.back}</Link>
  </section></div></main>;
}
