import { describe, expect, it } from "vitest";

import nextConfig from "@/next.config";

describe("Next configuration", () => {
  it("allows product images from a Vercel Blob store subdomain", () => {
    const patterns = nextConfig.images?.remotePatterns ?? [];
    expect(patterns).toContainEqual(expect.objectContaining({
      protocol: "https",
      hostname: "*.public.blob.vercel-storage.com",
      pathname: "/**",
    }));
  });

  it("caps Server Action request bodies", () => {
    expect(nextConfig.experimental?.serverActions?.bodySizeLimit).toBe("5mb");
  });
});
