import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Maison Botte — Bottes au Maroc",
  description: "Une collection de bottes élégantes, disponible au Maroc.",
};
export const viewport: Viewport = { themeColor: "#f4efe6", width: "device-width", initialScale: 1 };

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="fr">
      <body>{children}</body>
    </html>
  );
}
