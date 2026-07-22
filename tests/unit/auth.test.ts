import { hash } from "bcryptjs";
import { describe, expect, it, vi } from "vitest";

import { verifyAdminCredentials, type AdminRepository } from "@/lib/auth/credentials";

function repositoryWith(admin: Awaited<ReturnType<AdminRepository["findByEmail"]>>) {
  return { findByEmail: vi.fn().mockResolvedValue(admin) } satisfies AdminRepository;
}

describe("verifyAdminCredentials", () => {
  it.each([
    null,
    undefined,
    {},
    { email: 42, password: "secret123" },
    { email: "admin@example.com", password: 42 },
    { email: "not-an-email", password: "secret123" },
    { email: "admin@example.com", password: "" },
  ])("rejects malformed credentials without querying the repository", async (raw) => {
    const repository = repositoryWith(null);

    await expect(verifyAdminCredentials(raw, repository)).resolves.toBeNull();
    expect(repository.findByEmail).not.toHaveBeenCalled();
  });

  it("normalizes email before looking up the administrator", async () => {
    const repository = repositoryWith(null);

    await verifyAdminCredentials(
      { email: "  ADMIN@Example.COM ", password: "secret123" },
      repository,
    );

    expect(repository.findByEmail).toHaveBeenCalledWith("admin@example.com");
  });

  it("returns the same null outcome for an unknown administrator", async () => {
    const repository = repositoryWith(null);

    await expect(
      verifyAdminCredentials({ email: "admin@example.com", password: "secret123" }, repository),
    ).resolves.toBeNull();
  });

  it("returns the same null outcome for an incorrect password", async () => {
    const repository = repositoryWith({
      id: "admin-1",
      email: "admin@example.com",
      passwordHash: await hash("correct-password", 4),
    });

    await expect(
      verifyAdminCredentials({ email: "admin@example.com", password: "wrong-password" }, repository),
    ).resolves.toBeNull();
  });

  it("returns only the administrator id and normalized email for a correct password", async () => {
    const repository = repositoryWith({
      id: "admin-1",
      email: "ADMIN@Example.COM",
      passwordHash: await hash("correct-password", 4),
    });

    const result = await verifyAdminCredentials(
      { email: " admin@example.com ", password: "correct-password" },
      repository,
    );

    expect(result).toEqual({ id: "admin-1", email: "admin@example.com" });
    expect(result).not.toHaveProperty("passwordHash");
  });
});
