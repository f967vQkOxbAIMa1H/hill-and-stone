import type { MetadataRoute } from "next";

const base = (process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000").replace(/\/$/, "");

export default function robots(): MetadataRoute.Robots {
  return {
    // Private areas: the admin, API routes and customers' tokenized quote pages.
    rules: { userAgent: "*", allow: "/", disallow: ["/admin", "/api/", "/quote/", "/review/"] },
    sitemap: `${base}/sitemap.xml`,
    host: base,
  };
}
