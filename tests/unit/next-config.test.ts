import { describe, expect, it } from "vitest";

import nextConfig from "@/next.config";

describe("Next image hosts", () => {
  it("allows product images from a single Vercel Blob store subdomain", () => {
    const imageUrl = new URL("https://demo.public.blob.vercel-storage.com/products/x.webp");
    const patterns = nextConfig.images?.remotePatterns ?? [];

    expect(patterns).toContainEqual(
      expect.objectContaining({
        protocol: imageUrl.protocol.slice(0, -1),
        hostname: "*.public.blob.vercel-storage.com",
        pathname: "/**",
      }),
    );
  });
});
