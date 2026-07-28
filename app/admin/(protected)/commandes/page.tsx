import { OrderStatus } from "@prisma/client";
import Link from "next/link";

import { requireAdmin } from "@/lib/auth/require-admin";
import { listAdminOrders } from "@/lib/orders/admin-queries";
import { orderStatusLabels } from "@/lib/orders/status";

export const dynamic = "force-dynamic";

export default async function AdminOrdersPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; q?: string; page?: string }>;
}) {
  await requireAdmin();
  const params = await searchParams;
  const result = await listAdminOrders({
    status: params.status,
    q: params.q,
    page: Number(params.page),
  });
  const href = (page: number) =>
    `/admin/commandes?${new URLSearchParams({
      ...(result.q ? { q: result.q } : {}),
      ...(result.status ? { status: result.status } : {}),
      page: String(page),
    })}`;

  return (
    <main className="admin-home">
      <p className="eyebrow">Commandes</p>
      <h1>Gestion des commandes</h1>
      <form className="admin-filters">
        <label>
          Recherche
          <input
            name="q"
            defaultValue={result.q}
            maxLength={100}
            placeholder="N° commande ou client"
          />
        </label>
        <label>
          Statut
          <select name="status" defaultValue={result.status ?? ""}>
            <option value="">Tous</option>
            {Object.values(OrderStatus).map((status) => (
              <option value={status} key={status}>
                {orderStatusLabels[status]}
              </option>
            ))}
          </select>
        </label>
        <button>Filtrer</button>
      </form>
      {!result.orders.length ? (
        <div className="empty-state">
          <h2>Aucune commande</h2>
          <p>Aucune commande ne correspond à ces critères.</p>
        </div>
      ) : (
        <div className="admin-orders">
          <table>
            <thead>
              <tr>
                <th>Numéro</th>
                <th>Date</th>
                <th>Client</th>
                <th>Téléphone</th>
                <th>Total</th>
                <th>Statut</th>
              </tr>
            </thead>
            <tbody>
              {result.orders.map((order) => (
                <tr key={order.id}>
                  <td><Link href={`/admin/commandes/${order.id}`}>{order.number}</Link></td>
                  <td>{order.createdAt.toLocaleDateString("fr-FR")}</td>
                  <td>{order.customerFirstName} {order.customerLastName}</td>
                  <td>{order.customerPhone ?? "—"}</td>
                  <td>{order.totalDh.toLocaleString("fr-FR")} DH</td>
                  <td>{orderStatusLabels[order.status]}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <nav className="admin-pagination" aria-label="Pagination">
        {result.page > 1 && <Link href={href(result.page - 1)}>Précédent</Link>}
        <span>Page {result.page} sur {result.pageCount}</span>
        {result.page < result.pageCount && <Link href={href(result.page + 1)}>Suivant</Link>}
      </nav>
    </main>
  );
}
