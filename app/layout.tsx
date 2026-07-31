import type { Metadata, Viewport } from "next";
import { headers } from "next/headers";
import { Analytics } from "@vercel/analytics/next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Maison Botte — Bottes au Maroc",
  description: "Une collection de bottes élégantes, disponible au Maroc.",
};
export const viewport: Viewport = { themeColor: "#f4efe6", width: "device-width", initialScale: 1 };

export default async function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const locale = (await headers()).get("x-storefront-locale") === "ar" ? "ar" : "fr";
  return (
    <html lang={locale} dir={locale === "ar" ? "rtl" : "ltr"}>
      <body>
        {children}
        <Analytics />
      </body>
    </html>
  );
}
