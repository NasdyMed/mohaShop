import { compare } from "bcryptjs";
import { z } from "zod";

type AdminRecord = {
  id: string;
  email: string;
  passwordHash: string;
};

export type AdminRepository = {
  findByEmail(email: string): Promise<AdminRecord | null>;
};

export type AuthenticatedAdmin = Pick<AdminRecord, "id" | "email">;
export type PasswordComparer = (password: string, hash: string) => Promise<boolean>;

// Cost-12 bcrypt hash for timing equalization only; it does not represent a usable credential.
const DUMMY_PASSWORD_HASH = "$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6Ttx6Wdt9uMArpM2Q0owWgBPPJ8a.";

const credentialsSchema = z.object({
  email: z.string().trim().email().transform((email) => email.toLowerCase()),
  password: z.string().min(1),
});

export async function verifyAdminCredentials(
  raw: unknown,
  repository: AdminRepository,
  comparer: PasswordComparer = compare,
): Promise<AuthenticatedAdmin | null> {
  const parsed = credentialsSchema.safeParse(raw);
  if (!parsed.success) return null;

  const admin = await repository.findByEmail(parsed.data.email);
  const passwordMatches = await comparer(
    parsed.data.password,
    admin?.passwordHash ?? DUMMY_PASSWORD_HASH,
  );
  if (!admin || !passwordMatches) return null;

  return { id: admin.id, email: admin.email.trim().toLowerCase() };
}
