import { notFound } from "next/navigation";

import { OrderStatusForm } from "@/components/admin/order-status-form";
import { requireAdmin } from "@/lib/auth/require-admin";
import { getAdminOrder } from "@/lib/orders/admin-queries";
import { allowedTransitions, orderStatusLabels } from "@/lib/orders/status";

export const dynamic = "force-dynamic";

export default async function AdminOrderPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireAdmin();
  const { id } = await params;
  const order = await getAdminOrder(id);
  if (!order) notFound();

  return (
    <main className="admin-home admin-order-detail">
      <p className="eyebrow">Commande {order.number}</p>
      <h1>{orderStatusLabels[order.status]}</h1>
      <section>
        <h2>Client et livraison</h2>
        <p><strong>{order.customerFirstName} {order.customerLastName}</strong></p>
        <p>
          {order.customerPhone ? (
            <a href={`tel:${order.customerPhone}`}>{order.customerPhone}</a>
          ) : "—"}
          {order.customerEmail ? (
            <> · <a href={`mailto:${order.customerEmail}`}>{order.customerEmail}</a></>
          ) : null}
        </p>
        <address>
          {order.customerAddress}<br />
          {order.customerAddressComplement ? <>{order.customerAddressComplement}<br /></> : null}
          {order.customerPostalCode ? `${order.customerPostalCode} ` : ""}
          {order.customerCity}<br />
          {order.customerRegion ? <>{order.customerRegion} · {order.customerCountry}</> : order.customerCountry}
        </address>
        {order.deliveryNotes ? (
          <div className="admin-delivery-note">
            <strong>Instructions de livraison</strong>
            <p>{order.deliveryNotes}</p>
          </div>
        ) : null}
      </section>
      <section>
        <h2>Articles</h2>
        {order.items.map((item) => (
          <div className="admin-order-line" key={item.id}>
            <span>{item.productName}<small>{item.color} · {item.size} · Qté {item.quantity}</small></span>
            <strong>{(item.unitPriceDh * item.quantity).toLocaleString("fr-FR")} DH</strong>
          </div>
        ))}
        <div className="admin-order-line">
          <strong>Total</strong>
          <strong>{order.totalDh.toLocaleString("fr-FR")} DH</strong>
        </div>
      </section>
      <section>
        <h2>Suivi</h2>
        <p>Créée le {order.createdAt.toLocaleString("fr-FR")} · mise à jour le {order.updatedAt.toLocaleString("fr-FR")}</p>
        <OrderStatusForm orderId={order.id} targets={allowedTransitions(order.status)} />
      </section>
    </main>
  );
}
