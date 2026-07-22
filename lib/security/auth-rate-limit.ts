import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

type LoginKey = { ip: string; email: string };

export type AuthRateLimiter = {
  allow(key: LoginKey): Promise<boolean>;
};

type AuthRateLimiterOptions = {
  environment: string | undefined;
  url: string | undefined;
  token: string | undefined;
  remoteFactory?: (url: string, token: string) => AuthRateLimiter;
};

const WINDOW_MS = 15 * 60 * 1_000;

export function normalizeAuthEmail(value: unknown) {
  if (typeof value !== "string") return "unknown";
  return value.trim().toLowerCase().slice(0, 254) || "unknown";
}

export function normalizeClientIp(headers: Record<string, string | string[] | undefined>) {
  const forwarded = headers["x-forwarded-for"];
  const value = Array.isArray(forwarded) ? forwarded[0] : forwarded;
  return value?.split(",", 1)[0]?.trim().toLowerCase().slice(0, 64) || "unknown";
}

export function createInMemoryAuthRateLimiter({ now = Date.now }: { now?: () => number } = {}) {
  const attempts = new Map<string, { count: number; resetAt: number }>();

  function consume(key: string, limit: number) {
    const timestamp = now();
    const current = attempts.get(key);
    const entry = !current || current.resetAt <= timestamp
      ? { count: 0, resetAt: timestamp + WINDOW_MS }
      : current;
    entry.count += 1;
    attempts.set(key, entry);
    return entry.count <= limit;
  }

  return {
    async allow({ ip, email }: LoginKey) {
      const ipAllowed = consume(`ip:${ip}`, 10);
      const accountAllowed = consume(`account:${email}`, 5);
      return ipAllowed && accountAllowed;
    },
  } satisfies AuthRateLimiter;
}

function createRemoteAuthRateLimiter(url: string, token: string): AuthRateLimiter {
  const redis = new Redis({ url, token });
  const ip = new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(10, "15 m"),
    prefix: "auth-login-ip",
  });
  const account = new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(5, "15 m"),
    prefix: "auth-login-account",
  });

  return {
    async allow(key) {
      const [ipResult, accountResult] = await Promise.all([
        ip.limit(key.ip),
        account.limit(key.email),
      ]);
      return ipResult.success && accountResult.success;
    },
  };
}

const failClosedLimiter: AuthRateLimiter = { async allow() { return false; } };

export function createAuthRateLimiter(options: AuthRateLimiterOptions): AuthRateLimiter {
  if (options.environment !== "production") return createInMemoryAuthRateLimiter();
  if (!options.url || !options.token) return failClosedLimiter;
  try {
    return (options.remoteFactory ?? createRemoteAuthRateLimiter)(options.url, options.token);
  } catch {
    return failClosedLimiter;
  }
}

let runtimeLimiter: AuthRateLimiter | undefined;

export function getAuthRateLimiter() {
  runtimeLimiter ??= createAuthRateLimiter({
    environment: process.env.NODE_ENV,
    url: process.env.UPSTASH_REDIS_REST_URL,
    token: process.env.UPSTASH_REDIS_REST_TOKEN,
  });
  return runtimeLimiter;
}
