import { Providers } from "@/components/cart/providers";
import { StorefrontShell } from "@/components/shop/storefront-shell";

export default function ShopLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <StorefrontShell locale="fr"><Providers>{children}</Providers></StorefrontShell>;
}
