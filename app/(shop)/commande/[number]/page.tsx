import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";

import { formatPriceDh } from "@/components/shop/product-card";
import { getOrderConfirmation } from "@/lib/orders/queries";

export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  robots: { index: false, follow: false },
  referrer: "no-referrer",
};

const statusLabels = { NEW: "Commande reçue", CONFIRMED: "Confirmée", SHIPPED: "Expédiée", DELIVERED: "Livrée", CANCELLED: "Annulée" } as const;

export default async function ConfirmationPage({ params }: { params: Promise<{ number: string }> }) {
  const { number } = await params;
  const order = await getOrderConfirmation(number);
  if (!order) notFound();
  return <main><header className="site-header shell"><Link className="brand" href="/">Maison Botte</Link><nav className="header-nav" aria-label="Navigation principale"><Link href="/">Collection</Link></nav></header><div className="shell confirmation-page"><section className="confirmation-card"><p className="success-mark" aria-hidden="true">✓</p><p className="eyebrow">Commande enregistrée</p><h1>Merci pour votre commande.</h1><p className="confirmation-number">Numéro de commande <strong>{order.number}</strong></p><p className="order-status">Statut : {statusLabels[order.status]}</p><div className="confirmation-lines">{order.items.map((item, index) => <div key={`${item.productName}-${item.size}-${item.color}-${index}`}><span>{item.productName} · {item.color} · Pointure {item.size} · {item.quantity} × {formatPriceDh(item.unitPriceDh)}</span><strong>{formatPriceDh(item.unitPriceDh * item.quantity)}</strong></div>)}</div><div className="confirmation-total"><span>Total</span><strong>{formatPriceDh(order.totalDh)}</strong></div><div className="confirmation-note"><h2>Paiement à la livraison</h2><p>Conservez votre numéro de commande. Le règlement s’effectuera à la réception.</p></div><Link className="primary-link" href="/">Retour à la collection</Link></section></div></main>;
}
