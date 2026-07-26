import type { Metadata } from "next";

import { Providers } from "@/components/cart/providers";
import { StorefrontShell } from "@/components/shop/storefront-shell";

export const metadata: Metadata = {
  title: "Maison Botte — أحذية في المغرب",
  description: "تشكيلة أنيقة من الأحذية متوفرة في جميع أنحاء المغرب.",
};

export default function ArabicShopLayout({ children }: { children: React.ReactNode }) {
  return <StorefrontShell locale="ar"><Providers>{children}</Providers></StorefrontShell>;
}
