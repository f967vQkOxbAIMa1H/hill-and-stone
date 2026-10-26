import type { MetadataRoute } from "next";
import { appUrl as base } from "@/lib/site";

export default function robots(): MetadataRoute.Robots {
  return {
    // Private areas: the admin, API routes and customers' tokenized quote pages.
    rules: { userAgent: "*", allow: "/", disallow: ["/admin", "/api/", "/quote/", "/review/"] },
    sitemap: `${base}/sitemap.xml`,
    host: base,
  };
}
