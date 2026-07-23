import { Providers } from "@/components/cart/providers";

export default function ShopLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <Providers>{children}</Providers>;
}
