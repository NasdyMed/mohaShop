import { LoadingLabel } from "@/components/ui/loading-label";

export default function AdminLoading() {
  return (
    <main className="route-loading" aria-busy="true">
      <LoadingLabel>Chargement de l’administration…</LoadingLabel>
    </main>
  );
}
