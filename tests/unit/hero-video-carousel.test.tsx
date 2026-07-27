import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { HeroMedia } from "@/components/shop/hero-media";
import { HeroVideoCarousel } from "@/components/shop/hero-video-carousel";

const videos = [
  { id: "one", url: "/one.mp4", title: "Première", position: 1 },
  { id: "two", url: "/two.mp4", title: "Deuxième", position: 2 },
  { id: "three", url: "/three.mp4", title: "Troisième", position: 3 },
];

let reducedMotion = false;
let motionListener: ((event: MediaQueryListEvent) => void) | undefined;
const removeMotionListener = vi.fn();
const play = vi.fn<() => Promise<void>>();
const pause = vi.fn();

beforeEach(() => {
  reducedMotion = false;
  motionListener = undefined;
  removeMotionListener.mockReset();
  play.mockReset().mockResolvedValue();
  pause.mockReset();
  Object.defineProperty(window, "matchMedia", {
    configurable: true,
    value: vi.fn(() => ({
      matches: reducedMotion,
      media: "(prefers-reduced-motion: reduce)",
      onchange: null,
      addEventListener: (_type: string, listener: (event: MediaQueryListEvent) => void) => {
        motionListener = listener;
      },
      removeEventListener: removeMotionListener,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      dispatchEvent: vi.fn(),
    })),
  });
  Object.defineProperty(HTMLMediaElement.prototype, "play", { configurable: true, value: play });
  Object.defineProperty(HTMLMediaElement.prototype, "pause", { configurable: true, value: pause });
});

afterEach(cleanup);

describe("HeroVideoCarousel", () => {
  it("autoplays the active muted inline video and prepares only the next one", async () => {
    render(<HeroVideoCarousel videos={videos} fallback={<div>fallback</div>} />);

    const rendered = screen.getAllByLabelText(/Première|Deuxième|Troisième/);
    expect(rendered).toHaveLength(2);
    expect((rendered[0] as HTMLVideoElement).muted).toBe(true);
    expect(rendered[0]).toHaveAttribute("playsinline");
    expect(rendered[0]).toHaveAttribute("preload", "auto");
    expect(rendered[0]).toHaveAttribute("data-active", "true");
    expect(rendered[1]).toHaveAttribute("preload", "metadata");
    expect(rendered[1]).toHaveAttribute("aria-hidden", "true");
    expect(rendered[0]).not.toHaveAttribute("loop");
    expect(rendered[0]).not.toHaveAttribute("controls");
    expect(document.querySelectorAll('video[data-active="true"]')).toHaveLength(1);
    expect(screen.getByText("01")).toHaveClass("hero-index");
    await waitFor(() => expect(play).toHaveBeenCalledTimes(1));
  });

  it("moves to the next video when playback ends", async () => {
    render(<HeroVideoCarousel videos={videos} fallback={<div>fallback</div>} />);
    fireEvent.ended(screen.getByLabelText("Première"));
    expect(await screen.findByText("Deuxième")).toBeInTheDocument();
    expect(screen.getByLabelText("Deuxième")).toHaveAttribute("data-active", "true");
    expect(screen.getByText("02")).toHaveClass("hero-index");
  });

  it("selects a video from its accessible indicator", async () => {
    render(<HeroVideoCarousel videos={videos} fallback={<div>fallback</div>} />);
    const button = screen.getByRole("button", { name: "Afficher la vidéo 2 sur 3" });
    fireEvent.click(button);
    expect(await screen.findByText("Deuxième")).toBeInTheDocument();
    expect(button).toHaveAttribute("aria-current", "true");
    expect(screen.getByText("02")).toHaveClass("hero-index");
  });

  it("keeps the active video when the prepared next video fails and skips it on ended", async () => {
    render(<HeroVideoCarousel videos={videos} fallback={<div>fallback</div>} />);
    fireEvent.error(screen.getByLabelText("Deuxième"));
    expect(screen.getByText("Première")).toBeInTheDocument();
    expect(screen.getByLabelText("Première")).toHaveAttribute("data-active", "true");

    fireEvent.ended(screen.getByLabelText("Première"));
    expect(await screen.findByText("Troisième")).toBeInTheDocument();
    expect(screen.getByText("03")).toHaveClass("hero-index");
  });

  it("skips failed videos and falls back after every video fails", async () => {
    render(<HeroVideoCarousel videos={videos} fallback={<div>fallback</div>} />);
    fireEvent.error(screen.getByLabelText("Première"));
    expect(await screen.findByText("Deuxième")).toBeInTheDocument();
    fireEvent.error(screen.getByLabelText("Deuxième"));
    expect(await screen.findByText("Troisième")).toBeInTheDocument();
    fireEvent.error(screen.getByLabelText("Troisième"));
    expect(await screen.findByText("fallback")).toBeInTheDocument();
  });

  it("does not crash when play rejects", async () => {
    play.mockRejectedValueOnce(new Error("blocked"));
    render(<HeroVideoCarousel videos={videos} fallback={<div>fallback</div>} />);
    await waitFor(() => expect(play).toHaveBeenCalled());
    expect(screen.getByText("Première")).toBeInTheDocument();
  });

  it("resets coherently when the video list changes", async () => {
    const { rerender } = render(<HeroVideoCarousel videos={videos} fallback={<div>fallback</div>} />);
    fireEvent.click(screen.getByRole("button", { name: "Afficher la vidéo 3 sur 3" }));
    expect(await screen.findByText("Troisième")).toBeInTheDocument();
    rerender(<HeroVideoCarousel videos={[videos[1]]} fallback={<div>fallback</div>} />);
    expect(await screen.findByText("Deuxième")).toBeInTheDocument();
    expect(screen.getAllByLabelText("Deuxième")).toHaveLength(1);
  });

  it("renders only the static fallback under reduced motion, including changes", async () => {
    reducedMotion = true;
    render(<HeroVideoCarousel videos={videos} fallback={<div>fallback</div>} />);
    expect(await screen.findByText("fallback")).toBeInTheDocument();
    expect(document.querySelector("video")).not.toBeInTheDocument();
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
    expect(play).not.toHaveBeenCalled();

    reducedMotion = false;
    act(() => motionListener?.({ matches: false } as MediaQueryListEvent));
    expect(await screen.findByLabelText("Première")).toBeInTheDocument();
  });

  it("removes its reduced-motion listener on unmount", async () => {
    const { unmount } = render(<HeroVideoCarousel videos={videos} fallback={<div>fallback</div>} />);
    await screen.findByLabelText("Première");
    const listener = motionListener;
    unmount();
    expect(removeMotionListener).toHaveBeenCalledWith("change", listener);
  });
});

describe("HeroMedia", () => {
  it("returns the fallback directly when there are no videos", () => {
    const { container } = render(<HeroMedia videos={[]} fallback={<div>fallback direct</div>} />);
    expect(screen.getByText("fallback direct")).toBeInTheDocument();
    expect(container.querySelector("video")).not.toBeInTheDocument();
  });
});

describe("listVisibleHeroVideos", () => {
  it("filters published non-deleting videos and orders them deterministically", async () => {
    vi.resetModules();
    const findMany = vi.fn().mockResolvedValue([]);
    vi.doMock("@/lib/db", () => ({ db: { heroVideo: { findMany } } }));
    const { listVisibleHeroVideos } = await import("@/lib/hero/queries");

    await listVisibleHeroVideos();

    expect(findMany).toHaveBeenCalledWith({
      where: { isVisible: true, deletingAt: null },
      orderBy: [{ position: "asc" }, { createdAt: "asc" }],
      select: { id: true, url: true, title: true, position: true },
    });
  });
});
