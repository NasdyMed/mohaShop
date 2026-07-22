import { describe, expect, it, vi } from "vitest";

import { authorizeAdmin } from "@/lib/auth/authorize";
import {
  createAuthRateLimiter,
  createInMemoryAuthRateLimiter,
  normalizeAuthEmail,
  normalizeClientIp,
} from "@/lib/security/auth-rate-limit";

describe("auth rate limiting", () => {
  it("normalizes account and forwarded IP keys", () => {
    expect(normalizeAuthEmail("  ADMIN@Example.COM ")).toBe("admin@example.com");
    expect(normalizeClientIp({ "x-forwarded-for": " 2001:DB8::1 , 10.0.0.2" })).toBe(
      "2001:db8::1",
    );
    expect(normalizeClientIp({})).toBe("unknown");
  });

  it("limits an account independently of changing IP addresses", async () => {
    const limiter = createInMemoryAuthRateLimiter({ now: () => 1_000 });
    for (let attempt = 0; attempt < 5; attempt += 1) {
      await expect(limiter.allow({ ip: `192.0.2.${attempt}`, email: "admin@example.com" })).resolves.toBe(true);
    }
    await expect(limiter.allow({ ip: "192.0.2.99", email: "admin@example.com" })).resolves.toBe(false);
  });

  it("limits an IP independently of changing account identifiers", async () => {
    const limiter = createInMemoryAuthRateLimiter({ now: () => 1_000 });
    for (let attempt = 0; attempt < 10; attempt += 1) {
      await expect(limiter.allow({ ip: "192.0.2.1", email: `admin${attempt}@example.com` })).resolves.toBe(true);
    }
    await expect(limiter.allow({ ip: "192.0.2.1", email: "other@example.com" })).resolves.toBe(false);
  });

  it("fails closed in production when remote configuration is absent", async () => {
    const limiter = createAuthRateLimiter({ environment: "production", url: "", token: "" });
    await expect(limiter.allow({ ip: "192.0.2.1", email: "admin@example.com" })).resolves.toBe(false);
  });

  it("does not invoke password verification when a login is limited", async () => {
    const verify = vi.fn();

    await expect(
      authorizeAdmin(
        { email: " ADMIN@example.com ", password: "secret" },
        { "x-forwarded-for": "192.0.2.1, 10.0.0.1" },
        { limiter: { allow: vi.fn().mockResolvedValue(false) }, verify },
      ),
    ).resolves.toBeNull();
    expect(verify).not.toHaveBeenCalled();
  });

  it("returns the same null outcome when the limiter is unavailable", async () => {
    await expect(
      authorizeAdmin(
        { email: "admin@example.com", password: "secret" },
        {},
        {
          limiter: { allow: vi.fn().mockRejectedValue(new Error("redis unavailable")) },
          verify: vi.fn(),
        },
      ),
    ).resolves.toBeNull();
  });
});
