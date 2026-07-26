import { NextResponse, type NextRequest } from "next/server";

import { localeFromPath } from "@/lib/i18n/config";

export function proxy(request: NextRequest) {
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-storefront-locale", localeFromPath(request.nextUrl.pathname));
  return NextResponse.next({ request: { headers: requestHeaders } });
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|api).*)"],
};
