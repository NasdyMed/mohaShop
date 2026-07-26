import { CatalogPageView } from "@/components/shop/catalog-page";
import type { Metadata } from "next";

export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  alternates: { canonical: "/", languages: { fr: "/", ar: "/ar" } },
};

export default async function CatalogPage() {
  return await CatalogPageView({ locale: "fr" });
}
