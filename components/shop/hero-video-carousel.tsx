"use client";

import type { ReactNode } from "react";
import { useEffect, useMemo, useRef, useState } from "react";

import type { HeroVideoItem } from "@/lib/hero/types";

function nextAvailableIndex(videos: HeroVideoItem[], failed: ReadonlySet<string>, current: number) {
  for (let offset = 1; offset <= videos.length; offset += 1) {
    const candidate = (current + offset) % videos.length;
    if (!failed.has(videos[candidate].id)) return candidate;
  }
  return -1;
}

export function HeroVideoCarousel({ videos, fallback }: { videos: HeroVideoItem[]; fallback: ReactNode }) {
  const listKey = videos.map(({ id }) => id).join("\u0000");
  const [previousListKey, setPreviousListKey] = useState(listKey);
  const [activeIndex, setActiveIndex] = useState(0);
  const [failedIds, setFailedIds] = useState<Set<string>>(() => new Set());
  const [reducedMotion, setReducedMotion] = useState<boolean | null>(null);
  const videoRefs = useRef(new Map<string, HTMLVideoElement>());

  if (previousListKey !== listKey) {
    setPreviousListKey(listKey);
    setActiveIndex(0);
    setFailedIds(new Set());
  }

  useEffect(() => {
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = (event?: MediaQueryListEvent) => setReducedMotion(event?.matches ?? media.matches);
    update();
    media.addEventListener?.("change", update);
    return () => media.removeEventListener?.("change", update);
  }, []);

  const safeActiveIndex = activeIndex < videos.length && !failedIds.has(videos[activeIndex]?.id)
    ? activeIndex
    : nextAvailableIndex(videos, failedIds, Math.max(-1, activeIndex - 1));
  const nextIndex = safeActiveIndex < 0 ? -1 : nextAvailableIndex(videos, failedIds, safeActiveIndex);
  const renderedIndices = useMemo(
    () => [...new Set([safeActiveIndex, nextIndex].filter((index) => index >= 0))],
    [safeActiveIndex, nextIndex],
  );

  useEffect(() => {
    if (reducedMotion !== false || safeActiveIndex < 0) return;
    for (const [id, element] of videoRefs.current) {
      if (id === videos[safeActiveIndex]?.id) void element.play().catch(() => undefined);
      else element.pause();
    }
  }, [reducedMotion, safeActiveIndex, videos]);

  if (reducedMotion !== false || videos.length === 0 || safeActiveIndex < 0) return fallback;

  const failVideo = (id: string) => {
    const failed = new Set(failedIds);
    failed.add(id);
    setFailedIds(failed);
    const next = nextAvailableIndex(videos, failed, safeActiveIndex);
    if (next >= 0) setActiveIndex(next);
  };

  return <>
    <div className="hero-video-stage">
      {renderedIndices.map((index) => {
        const video = videos[index];
        const active = index === safeActiveIndex;
        return <video
          key={video.id}
          ref={(element) => {
            if (element) videoRefs.current.set(video.id, element);
            else videoRefs.current.delete(video.id);
          }}
          src={video.url}
          aria-label={video.title}
          aria-hidden={active ? undefined : true}
          className={active ? "is-active" : "is-next"}
          data-active={active ? "true" : undefined}
          muted
          playsInline
          preload={active ? "auto" : "metadata"}
          inert={!active}
          onEnded={() => { if (nextIndex >= 0) setActiveIndex(nextIndex); }}
          onError={() => failVideo(video.id)}
        />;
      })}
    </div>
    <p className="hero-video-title">{videos[safeActiveIndex].title}</p>
    {videos.length > 1 ? <div className="hero-video-indicators" aria-label="Sélection des vidéos">
      {videos.map((video, index) => <button
        key={video.id}
        type="button"
        aria-label={`Afficher la vidéo ${index + 1} sur ${videos.length}`}
        aria-current={index === safeActiveIndex ? "true" : undefined}
        disabled={failedIds.has(video.id)}
        onClick={() => setActiveIndex(index)}
      ><span aria-hidden="true" /></button>)}
    </div> : null}
  </>;
}
