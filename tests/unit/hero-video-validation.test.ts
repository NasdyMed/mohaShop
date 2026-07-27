import { describe, expect, it } from "vitest";

import {
  hasVideoSignature,
  heroVideoInputSchema,
} from "@/lib/hero/validation";

describe("heroVideoInputSchema", () => {
  it("accepts a valid Vercel Blob hero video", () => {
    expect(
      heroVideoInputSchema.safeParse({
        url: "https://shop.public.blob.vercel-storage.com/hero/demo.mp4",
        title: "Campagne été",
        position: 0,
        isVisible: true,
      }).success,
    ).toBe(true);
  });

  it("rejects a video hosted outside the configured Vercel Blob domain", () => {
    expect(
      heroVideoInputSchema.safeParse({
        url: "https://evil.test/demo.mp4",
        title: "Campagne été",
        position: 0,
        isVisible: true,
      }).success,
    ).toBe(false);
  });
});

describe("hasVideoSignature", () => {
  it("recognizes an MP4 signature", () => {
    expect(
      hasVideoSignature(
        "video/mp4",
        new Uint8Array([0, 0, 0, 24, 0x66, 0x74, 0x79, 0x70]),
      ),
    ).toBe(true);
  });

  it("recognizes a WebM signature", () => {
    expect(
      hasVideoSignature(
        "video/webm",
        new Uint8Array([0x1a, 0x45, 0xdf, 0xa3]),
      ),
    ).toBe(true);
  });

  it("rejects a false MP4 signature", () => {
    expect(
      hasVideoSignature(
        "video/mp4",
        new Uint8Array([0, 0, 0, 24, 0x66, 0x61, 0x6b, 0x65]),
      ),
    ).toBe(false);
  });
});
