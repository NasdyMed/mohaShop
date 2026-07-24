import { notFound } from "next/navigation";
import { requireAdmin } from "@/lib/auth/require-admin";
import { getAdminProduct } from "@/lib/catalog/admin-queries";
import { AdminSaveToast } from "@/components/admin/admin-save-toast";
import { ProductForm } from "@/components/admin/product-form";
export const dynamic = "force-dynamic";
export default async function EditProductPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ saved?: string }> }) {
  await requireAdmin(); const { id } = await params; const query = await searchParams; const product = await getAdminProduct(id); if (!product) notFound();
  return <main className="admin-home">{query.saved === "1" ? <AdminSaveToast /> : null}<p className="eyebrow">Catalogue</p><h1>Modifier {product.name}</h1><ProductForm initialValue={{ id: product.id, name: product.name, description: product.description, priceDh: product.priceDh, slug: product.slug, isVisible: product.isVisible, images: product.images.map(({ id: imageId, url, alt, color, position }) => ({ id: imageId, url, alt, color, position })), variants: product.variants.map(({ id: variantId, sku, size, color, stock, _count }) => ({ id: variantId, sku, size, color, stock, historical: _count.orderItems > 0 })) }} /></main>;
}
