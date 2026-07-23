import type { AuthRateLimiter } from "@/lib/security/auth-rate-limit";
import { normalizeAuthEmail, normalizeClientIp } from "@/lib/security/auth-rate-limit";
import type { AuthenticatedAdmin } from "@/lib/auth/credentials";

type AuthorizeDependencies = {
  limiter: AuthRateLimiter;
  verify(raw: unknown): Promise<AuthenticatedAdmin | null>;
};

export async function authorizeAdmin(
  raw: unknown,
  headers: Record<string, string | string[] | undefined>,
  dependencies: AuthorizeDependencies,
) {
  const email = normalizeAuthEmail(
    typeof raw === "object" && raw !== null && "email" in raw ? raw.email : undefined,
  );

  try {
    const allowed = await dependencies.limiter.allow({
      ip: normalizeClientIp(headers),
      email,
    });
    if (!allowed) return null;
    return await dependencies.verify(raw);
  } catch {
    return null;
  }
}
