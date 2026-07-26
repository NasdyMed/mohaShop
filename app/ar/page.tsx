import type { Metadata } from "next";
import { CatalogPageView } from "@/components/shop/catalog-page";

export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "Maison Botte — مجموعة الأحذية",
  alternates: { canonical: "/ar", languages: { fr: "/", ar: "/ar" } },
};

export default async function ArabicCatalogPage() {
  return await CatalogPageView({ locale: "ar" });
}
