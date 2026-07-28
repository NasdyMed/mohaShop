export function isSafeTestDatabaseUrl(raw: string) {
  try {
    const url = new URL(raw);
    const database = decodeURIComponent(url.pathname.slice(1));
    return /^postgres(?:ql)?:$/.test(url.protocol) && /(?:^|_)test$/i.test(database);
  } catch {
    return false;
  }
}
