import Link from "next/link";
import { requireAdmin } from "@/lib/auth/require-admin";
import { listAdminProducts } from "@/lib/catalog/admin-queries";
export const dynamic = "force-dynamic";
export default async function AdminProductsPage() {
  await requireAdmin(); const products = await listAdminProducts();
  return <main className="admin-home"><div className="admin-title-row"><div><p className="eyebrow">Catalogue</p><h1>Produits</h1></div><Link className="primary-link" href="/admin/produits/nouveau">Nouveau produit</Link></div>
    {!products.length ? <div className="empty-state"><h2>Aucun produit</h2><p>Créez votre premier produit.</p></div> : <div className="admin-orders"><table><thead><tr><th>Nom</th><th>Visibilité</th><th>Prix</th><th>Stock total</th><th></th></tr></thead><tbody>{products.map((product) => <tr key={product.id}><td>{product.name}</td><td>{product.isVisible ? "Visible" : "Brouillon"}</td><td>{product.priceDh.toLocaleString("fr-FR")} DH</td><td>{product.variants.reduce((sum, variant) => sum + variant.stock, 0)}</td><td><Link href={`/admin/produits/${product.id}`}>Modifier</Link></td></tr>)}</tbody></table></div>}
  </main>;
}
