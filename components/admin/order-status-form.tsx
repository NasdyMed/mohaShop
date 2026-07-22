"use client";
import { OrderStatus } from "@prisma/client";
import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { updateOrderStatusAction } from "@/app/actions/update-order-status";
import { orderStatusLabels } from "@/lib/orders/status";

export function OrderStatusForm({ orderId, targets }: { orderId: string; targets: OrderStatus[] }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const locked = useRef(false);
  const [message, setMessage] = useState("");
  if (!targets.length) return <p>Aucun changement de statut disponible.</p>;

  return <form onSubmit={(event) => {
    event.preventDefault();
    if (locked.current) return;
    const target = new FormData(event.currentTarget).get("target") as OrderStatus;
    if (target === OrderStatus.CANCELLED && !window.confirm("Confirmer l’annulation ? Le stock des articles sera restauré.")) return;
    locked.current = true;
    setMessage("");
    startTransition(async () => {
      try {
        const result = await updateOrderStatusAction({ orderId, target });
        setMessage(result.ok ? "Statut mis à jour." : result.message);
        if (result.ok) router.refresh();
      } catch {
        setMessage("La mise à jour a peut-être échoué. Actualisez la page avant de réessayer.");
      } finally {
        locked.current = false;
      }
    });
  }} className="admin-status-form">
    <label htmlFor="target">Nouveau statut</label>
    <select id="target" name="target" disabled={pending}>{targets.map((status) => <option key={status} value={status}>{orderStatusLabels[status]}</option>)}</select>
    <button disabled={pending} type="submit">{pending ? "Mise à jour…" : "Mettre à jour"}</button>
    <p aria-live="polite">{message}</p>
  </form>;
}
