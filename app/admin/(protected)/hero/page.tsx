import { HeroVideoManager } from "@/components/admin/hero-video-manager";
import { listAdminHeroVideos } from "@/lib/hero/admin-mutations";

export const dynamic = "force-dynamic";

export default async function AdminHeroPage() {
  const videos = await listAdminHeroVideos();

  return (
    <main className="admin-home admin-hero-page">
      <div className="admin-hero-heading">
        <div>
          <p className="eyebrow">Vitrine</p>
          <h1>Vidéos du hero</h1>
          <p className="admin-page-intro">
            Composez l’ordre de lecture du hero et choisissez les vidéos publiées.
          </p>
        </div>
      </div>
      <HeroVideoManager initialVideos={videos} />
    </main>
  );
}
