import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";
import { normalizeMoroccanPhone, validMoroccanPhone } from "@/lib/validation/checkout";

type CheckoutKey = { ip: string; phone: string };
export type CheckoutRateLimiter = { allow(key: CheckoutKey): Promise<boolean> };
type Options = { environment: string | undefined; url: string | undefined; token: string | undefined; remoteFactory?: (url: string, token: string) => CheckoutRateLimiter };
const WINDOW_MS = 10 * 60 * 1_000;
const LIMIT = 10;

export function normalizeForwardedIp(value: string | null | undefined) {
  return value?.split(",", 1)[0]?.trim().toLowerCase().slice(0, 64) || "unknown";
}
export function normalizeCheckoutPhone(value: unknown) {
  return typeof value === "string" && validMoroccanPhone(value) ? normalizeMoroccanPhone(value) : "invalid";
}
export function createInMemoryCheckoutRateLimiter({ now = Date.now }: { now?: () => number } = {}) {
  const attempts = new Map<string, { count: number; resetAt: number }>();
  function consume(key: string) {
    const timestamp = now();
    const current = attempts.get(key);
    const entry = !current || current.resetAt <= timestamp ? { count: 0, resetAt: timestamp + WINDOW_MS } : current;
    entry.count += 1;
    attempts.set(key, entry);
    return entry.count <= LIMIT;
  }
  return { async allow({ ip, phone }: CheckoutKey) {
    // Consume both dimensions on each attempt so neither can be bypassed by rotating the other.
    const ipAllowed = consume(`ip:${ip}`);
    const phoneAllowed = consume(`phone:${phone}`);
    return ipAllowed && phoneAllowed;
  } } satisfies CheckoutRateLimiter;
}
function createRemote(url: string, token: string): CheckoutRateLimiter {
  const redis = new Redis({ url, token });
  const ip = new Ratelimit({ redis, limiter: Ratelimit.slidingWindow(LIMIT, "10 m"), prefix: "checkout-ip" });
  const phone = new Ratelimit({ redis, limiter: Ratelimit.slidingWindow(LIMIT, "10 m"), prefix: "checkout-phone" });
  return { async allow(key) {
    const [ipResult, phoneResult] = await Promise.all([ip.limit(key.ip), phone.limit(key.phone)]);
    return ipResult.success && phoneResult.success;
  } };
}
const failClosed: CheckoutRateLimiter = { async allow() { return false; } };
export function createCheckoutRateLimiter(options: Options): CheckoutRateLimiter {
  if (options.environment !== "production") return createInMemoryCheckoutRateLimiter();
  if (!options.url || !options.token) {
    console.error("checkout_rate_limit_failed", { cause: "MISSING_CONFIG" });
    return failClosed;
  }
  let remote: CheckoutRateLimiter;
  try { remote = (options.remoteFactory ?? createRemote)(options.url, options.token); }
  catch { console.error("checkout_rate_limit_failed", { cause: "INIT_ERROR" }); return failClosed; }
  return { async allow(key) {
    try { return await remote.allow(key); }
    catch { console.error("checkout_rate_limit_failed", { cause: "REMOTE_ERROR" }); return false; }
  } };
}
let runtimeLimiter: CheckoutRateLimiter | undefined;
export function getCheckoutRateLimiter() {
  runtimeLimiter ??= createCheckoutRateLimiter({ environment: process.env.NODE_ENV, url: process.env.UPSTASH_REDIS_REST_URL, token: process.env.UPSTASH_REDIS_REST_TOKEN });
  return runtimeLimiter;
}
