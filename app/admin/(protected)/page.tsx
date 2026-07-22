import Link from "next/link";

export default function AdminPage() {
  return (
    <main className="admin-home">
      <p className="eyebrow">Tableau de bord</p>
      <h1>Administration</h1>
      <p>Les outils de gestion seront ajoutés dans les prochaines étapes.</p>
      <Link className="primary-link" href="/admin/commandes">Voir les commandes</Link>
    </main>
  );
}
