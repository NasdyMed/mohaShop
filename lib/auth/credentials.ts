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

const credentialsSchema = z.object({
  email: z.string().trim().email().transform((email) => email.toLowerCase()),
  password: z.string().min(1),
});

export async function verifyAdminCredentials(
  raw: unknown,
  repository: AdminRepository,
): Promise<AuthenticatedAdmin | null> {
  const parsed = credentialsSchema.safeParse(raw);
  if (!parsed.success) return null;

  const admin = await repository.findByEmail(parsed.data.email);
  if (!admin || !(await compare(parsed.data.password, admin.passwordHash))) return null;

  return { id: admin.id, email: admin.email.trim().toLowerCase() };
}
