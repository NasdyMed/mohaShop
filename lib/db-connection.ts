export function normalizeDatabaseUrl(connectionString: string) {
  const url = new URL(connectionString);

  if (url.searchParams.get("sslmode") === "require") {
    url.searchParams.set("sslmode", "verify-full");
  }

  return url.toString();
}
