import type { ReactNode } from "react";

import { HeroVideoCarousel } from "@/components/shop/hero-video-carousel";
import type { HeroVideoItem } from "@/lib/hero/types";

export function HeroMedia({ videos, fallback }: { videos: HeroVideoItem[]; fallback: ReactNode }) {
  if (videos.length === 0) return fallback;
  return <HeroVideoCarousel key={videos.map(({ id }) => id).join("\u0000")} videos={videos} fallback={fallback} />;
}
