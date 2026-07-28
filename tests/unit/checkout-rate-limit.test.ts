import { describe, expect, it, vi } from "vitest";

import {
  createCheckoutRateLimiter,
  createInMemoryCheckoutRateLimiter,
  normalizeForwardedIp,
} from "@/lib/security/checkout-rate-limit";

describe("checkout rate limiting", () => {
  it("normalizes bounded IP buckets without retaining arbitrary input", () => {
    expect(normalizeForwardedIp(" 2001:DB8::1 , 10.0.0.2")).toBe("2001:db8::1");
    expect(normalizeForwardedIp("x".repeat(100))).toBe("x".repeat(64));
    expect(normalizeForwardedIp(undefined)).toBe("unknown");
  });

  it("limits repeated attempts by IP", async () => {
    const limiter = createInMemoryCheckoutRateLimiter({ now: () => 1_000 });
    for (let attempt = 0; attempt < 10; attempt += 1) {
      await expect(limiter.allow({ ip: "192.0.2.1" })).resolves.toBe(true);
    }
    await expect(limiter.allow({ ip: "192.0.2.1" })).resolves.toBe(false);
  });

  it("fails closed in production when configuration is absent", async () => {
    const log = vi.spyOn(console, "error").mockImplementation(() => undefined);
    const limiter = createCheckoutRateLimiter({ environment: "production", url: "", token: "" });
    await expect(limiter.allow({ ip: "192.0.2.1" })).resolves.toBe(false);
    expect(log).toHaveBeenCalledWith("checkout_rate_limit_failed", { cause: "MISSING_CONFIG" });
    log.mockRestore();
  });

  it("fails closed and emits only a static event when Redis rejects", async () => {
    const log = vi.spyOn(console, "error").mockImplementation(() => undefined);
    const limiter = createCheckoutRateLimiter({
      environment: "production", url: "url", token: "token",
      remoteFactory: () => ({ allow: vi.fn().mockRejectedValue(new TypeError("contains private data")) }),
    });
    await expect(limiter.allow({ ip: "private-ip" })).resolves.toBe(false);
    expect(log).toHaveBeenCalledWith("checkout_rate_limit_failed", { cause: "REMOTE_ERROR" });
    expect(JSON.stringify(log.mock.calls)).not.toContain("private");
    log.mockRestore();
  });
});
