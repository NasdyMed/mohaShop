import { notFound } from "next/navigation";
import { requireAdmin } from "@/lib/auth/require-admin";
import { getAdminProduct } from "@/lib/catalog/admin-queries";
import { ProductForm } from "@/components/admin/product-form";
export const dynamic = "force-dynamic";
export default async function EditProductPage({ params }: { params: Promise<{ id: string }> }) {
  await requireAdmin(); const { id } = await params; const product = await getAdminProduct(id); if (!product) notFound();
  return <main className="admin-home"><p className="eyebrow">Catalogue</p><h1>Modifier {product.name}</h1><ProductForm initialValue={{ id: product.id, name: product.name, description: product.description, priceDh: product.priceDh, slug: product.slug, isVisible: product.isVisible, images: product.images.map(({ id: imageId, url, alt, position }) => ({ id: imageId, url, alt, position })), variants: product.variants.map(({ id: variantId, sku, size, color, stock, _count }) => ({ id: variantId, sku, size, color, stock, historical: _count.orderItems > 0 })) }} /></main>;
}
