import type { Metadata } from "next";
import { ConfirmationPageView } from "@/components/shop/confirmation-page";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { robots: { index: false, follow: false }, referrer: "no-referrer" };

export default async function ArabicConfirmationPage({ params }: { params: Promise<{ number: string }> }) {
  const { number } = await params;
  return <ConfirmationPageView locale="ar" number={number} />;
}
