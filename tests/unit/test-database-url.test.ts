import { describe, expect, it } from "vitest";
import { isSafeTestDatabaseUrl } from "../support/test-database-url";

describe("isSafeTestDatabaseUrl", () => {
  it.each(["test", "shop_test"])("accepte la base PostgreSQL isolée %s", (database) => {
    expect(isSafeTestDatabaseUrl(`postgresql://localhost/${database}`)).toBe(true);
  });

  it.each(["contest", "latest_prod", "test_backup"])("rejette la base non isolée %s", (database) => {
    expect(isSafeTestDatabaseUrl(`postgresql://localhost/${database}`)).toBe(false);
  });
});
