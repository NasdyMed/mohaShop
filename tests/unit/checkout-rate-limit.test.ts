import { describe, expect, it, vi } from "vitest";

import {
  createCheckoutRateLimiter,
  createInMemoryCheckoutRateLimiter,
  normalizeCheckoutPhone,
  normalizeForwardedIp,
} from "@/lib/security/checkout-rate-limit";

describe("checkout rate limiting", () => {
  it("normalizes bounded IP and phone buckets without retaining arbitrary input", () => {
    expect(normalizeForwardedIp(" 2001:DB8::1 , 10.0.0.2")).toBe("2001:db8::1");
    expect(normalizeForwardedIp("x".repeat(100))).toBe("x".repeat(64));
    expect(normalizeForwardedIp(undefined)).toBe("unknown");
    expect(normalizeCheckoutPhone(" 06 12 34 56 78 ")).toBe("+212612345678");
    expect(normalizeCheckoutPhone({ phone: "+212612345678" })).toBe("invalid");
    expect(normalizeCheckoutPhone("not-a-phone")).toBe("invalid");
  });

  it("limits a phone independently of changing IP addresses", async () => {
    const limiter = createInMemoryCheckoutRateLimiter({ now: () => 1_000 });
    for (let attempt = 0; attempt < 10; attempt += 1) {
      await expect(limiter.allow({ ip: `192.0.2.${attempt}`, phone: "+212612345678" })).resolves.toBe(true);
    }
    await expect(limiter.allow({ ip: "192.0.2.99", phone: "+212612345678" })).resolves.toBe(false);
  });

  it("limits an IP independently of changing phone numbers", async () => {
    const limiter = createInMemoryCheckoutRateLimiter({ now: () => 1_000 });
    for (let attempt = 0; attempt < 10; attempt += 1) {
      await expect(limiter.allow({ ip: "192.0.2.1", phone: `+2126${String(attempt).padStart(8, "0")}` })).resolves.toBe(true);
    }
    await expect(limiter.allow({ ip: "192.0.2.1", phone: "+212699999999" })).resolves.toBe(false);
  });

  it("fails closed in production when configuration is absent", async () => {
    const log = vi.spyOn(console, "error").mockImplementation(() => undefined);
    const limiter = createCheckoutRateLimiter({ environment: "production", url: "", token: "" });
    await expect(limiter.allow({ ip: "192.0.2.1", phone: "+212612345678" })).resolves.toBe(false);
    expect(log).toHaveBeenCalledWith("checkout_rate_limit_failed", { cause: "MISSING_CONFIG" });
    log.mockRestore();
  });

  it("fails closed and emits only a static event when Redis rejects", async () => {
    const log = vi.spyOn(console, "error").mockImplementation(() => undefined);
    const limiter = createCheckoutRateLimiter({
      environment: "production", url: "url", token: "token",
      remoteFactory: () => ({ allow: vi.fn().mockRejectedValue(new TypeError("contains private data")) }),
    });
    await expect(limiter.allow({ ip: "private-ip", phone: "private-phone" })).resolves.toBe(false);
    expect(log).toHaveBeenCalledWith("checkout_rate_limit_failed", { cause: "REMOTE_ERROR" });
    expect(JSON.stringify(log.mock.calls)).not.toContain("private");
    log.mockRestore();
  });
});
