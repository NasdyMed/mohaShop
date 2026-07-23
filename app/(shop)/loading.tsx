import { LoadingLabel } from "@/components/ui/loading-label";

export default function ShopLoading() {
  return (
    <main className="route-loading" aria-busy="true">
      <LoadingLabel>Chargement de la boutique…</LoadingLabel>
    </main>
  );
}
