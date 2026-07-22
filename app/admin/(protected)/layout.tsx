import Link from "next/link";

import { requireAdmin } from "@/lib/auth/require-admin";
import { LogoutButton } from "./logout-button";

export const dynamic = "force-dynamic";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await requireAdmin();

  return (
    <div className="admin-shell">
      <header className="admin-header">
        <Link className="brand" href="/admin">Maison Botte</Link>
        <nav aria-label="Administration">
          <Link href="/admin/produits">Produits</Link>
          <Link href="/admin/commandes">Commandes</Link>
          <span>{session.user.email}</span>
          <LogoutButton />
        </nav>
      </header>
      {children}
    </div>
  );
}
