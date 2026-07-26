import { describe, expect, it } from "vitest";

import { normalizeDatabaseUrl } from "@/lib/db-connection";

describe("normalizeDatabaseUrl", () => {
  it("rend explicite la vérification complète pour sslmode=require", () => {
    expect(
      normalizeDatabaseUrl("postgresql://user:secret@host/db?sslmode=require"),
    ).toBe("postgresql://user:secret@host/db?sslmode=verify-full");
  });

  it("préserve les autres paramètres et les modes SSL explicites", () => {
    expect(
      normalizeDatabaseUrl(
        "postgresql://user:secret@host/db?connect_timeout=10&sslmode=verify-full",
      ),
    ).toBe(
      "postgresql://user:secret@host/db?connect_timeout=10&sslmode=verify-full",
    );
  });
});
