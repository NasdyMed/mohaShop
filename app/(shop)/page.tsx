import { CatalogPageView } from "@/components/shop/catalog-page";

export const dynamic = "force-dynamic";

export default async function CatalogPage() {
  return await CatalogPageView({ locale: "fr" });
}
