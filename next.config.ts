import type { NextConfig } from "next";
import { contentSecurityPolicy } from "./src/lib/csp";

const privateHeaders = [
  { key: "Cache-Control", value: "private, no-store" },
  { key: "X-Robots-Tag", value: "noindex, nofollow" },
  { key: "Referrer-Policy", value: "no-referrer" },
];

const nextConfig: NextConfig = {
  poweredByHeader: false,
  // Image optimizer allowlist (SSRF defense): no remote hosts at all, since every photo is served from
  // this site, and only the local folders that hold real images, with no query strings.
  images: {
    remotePatterns: [],
    localPatterns: [
      { pathname: "/media/**", search: "" },
      { pathname: "/images/**", search: "" },
      { pathname: "/placeholders/**", search: "" },
    ],
  },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          // Nothing on the site uses these. Card payments happen on Stripe's hosted page, not here.
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), payment=(), usb=(), browsing-topics=()" },
          // Browsers ignore this over plain HTTP, so local and LAN previews are unaffected.
          { key: "Strict-Transport-Security", value: "max-age=63072000" },
        ],
      },
      // Public pages are cached, so their policy is fixed here. The admin and quote pages get a
      // per-request nonce policy from src/proxy.ts instead.
      { source: "/((?!admin|quote/).*)", headers: [{ key: "Content-Security-Policy", value: contentSecurityPolicy() }] },
      // Customer quote pages carry a secret token in the URL: never cache, index or leak it.
      // Listed last because later rules override earlier ones for the same header.
      { source: "/quote/:path*", headers: privateHeaders },
      { source: "/review/:path*", headers: privateHeaders },
      { source: "/api/quotes/:path*", headers: privateHeaders },
      { source: "/admin/:path*", headers: privateHeaders },
      { source: "/admin", headers: privateHeaders },
      { source: "/api/admin/:path*", headers: privateHeaders },
    ];
  },
};

export default nextConfig;
