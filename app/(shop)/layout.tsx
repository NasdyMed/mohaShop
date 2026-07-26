import { Providers } from "@/components/cart/providers";
import { StorefrontShell } from "@/components/shop/storefront-shell";

export default function ShopLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <Providers><StorefrontShell locale="fr">{children}</StorefrontShell></Providers>;
}
