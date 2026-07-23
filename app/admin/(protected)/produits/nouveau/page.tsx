import { requireAdmin } from "@/lib/auth/require-admin";
import { ProductForm } from "@/components/admin/product-form";
export const dynamic = "force-dynamic";
export default async function NewProductPage() { await requireAdmin(); return <main className="admin-home"><p className="eyebrow">Catalogue</p><h1>Nouveau produit</h1><ProductForm /></main>; }
