import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Maison Botte — Bottes au Maroc",
  description: "Une collection de bottes élégantes, disponible au Maroc.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="fr">
      <body>{children}</body>
    </html>
  );
}
