import { NextResponse, type NextRequest } from "next/server";
import { contentSecurityPolicy } from "@/lib/csp";

// Runs only on the admin and quote pages (see matcher). Everything else is cached and gets its
// Content-Security-Policy from next.config.ts.
export function proxy(request: NextRequest) {
  const { pathname, search } = request.nextUrl;

  // Admin: optimistic check only, bouncing visitors without a session cookie to the login page.
  // Real verification happens in requireAdmin()/apiAdmin() on every admin page, action and route.
  if (pathname.startsWith("/admin") && pathname !== "/admin/login" && !request.cookies.has("hs_admin")) {
    const url = new URL("/admin/login", request.url);
    url.searchParams.set("next", pathname + search);
    return NextResponse.redirect(url);
  }

  // A fresh nonce per request. Next reads it from the request's CSP header and puts it on its own
  // scripts; these pages render per request anyway, so the nonce costs nothing extra.
  const nonce = Buffer.from(crypto.randomUUID()).toString("base64");
  const csp = contentSecurityPolicy(nonce);
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("Content-Security-Policy", csp);
  const response = NextResponse.next({ request: { headers: requestHeaders } });
  response.headers.set("Content-Security-Policy", csp);
  return response;
}

export const config = {
  matcher: [
    {
      source: "/admin/:path*",
      missing: [{ type: "header", key: "next-router-prefetch" }],
    },
    {
      source: "/quote/:path*",
      missing: [{ type: "header", key: "next-router-prefetch" }],
    },
  ],
};
