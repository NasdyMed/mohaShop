import "server-only";

import { db } from "@/lib/db";
import { publicHeroVideoWhere, type HeroVideoItem } from "@/lib/hero/types";

export async function listVisibleHeroVideos(): Promise<HeroVideoItem[]> {
  return db.heroVideo.findMany({
    where: publicHeroVideoWhere,
    orderBy: [{ position: "asc" }, { createdAt: "asc" }],
    select: { id: true, url: true, title: true, position: true },
  });
}
