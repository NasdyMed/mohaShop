import Link from "next/link";
import { requireAdmin } from "@/lib/auth/require-admin";
import { listAdminProducts } from "@/lib/catalog/admin-queries";

export const dynamic = "force-dynamic";

export default async function AdminProductsPage() {
  await requireAdmin();
  const products = await listAdminProducts();
  return <main className="admin-home">
    <div className="admin-title-row"><div><p className="eyebrow">Catalogue</p><h1>Produits</h1><p className="admin-page-intro">Pilotez les prix, la visibilité et le stock de votre collection.</p></div><Link className="primary-link admin-create-link" href="/admin/produits/nouveau"><span aria-hidden="true">＋</span> Nouveau produit</Link></div>
    {!products.length ? <div className="empty-state"><h2>Aucun produit</h2><p>Créez votre premier produit.</p></div> :
      <div className="admin-product-grid">{products.map((product, index) => {
        const stock = product.variants.reduce((sum, variant) => sum + variant.stock, 0);
        return <article className="admin-product-card" aria-label={product.name} key={product.id}>
          <div className="admin-product-card-top"><span className="admin-product-number">{String(index + 1).padStart(2, "0")}</span><span className={`admin-product-state ${product.isVisible ? "is-visible" : "is-draft"}`}>{product.isVisible ? "Visible" : "Brouillon"}</span></div>
          <h2>{product.name}</h2>
          <div className="admin-product-metrics"><div><span>Prix</span><strong>{product.priceDh.toLocaleString("fr-FR")} DH</strong></div><div><span>Disponibilité</span><strong>{stock} en stock</strong></div></div>
          <Link className="admin-card-action" href={`/admin/produits/${product.id}`} aria-label={`Modifier ${product.name}`}>Modifier le produit <span aria-hidden="true">→</span></Link>
        </article>;
      })}</div>}
  </main>;
}
