import type { MetadataRoute } from "next";
import { hasPublicReviews } from "@/lib/content";

const base = (process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000").replace(/\/$/, "");

// Public marketing pages only. Admin, API and private quote links are excluded (see robots.ts).
const pages: { path: string; priority: number; changeFrequency: MetadataRoute.Sitemap[number]["changeFrequency"] }[] = [
  { path: "/", priority: 1, changeFrequency: "weekly" },
  { path: "/services", priority: 0.9, changeFrequency: "monthly" },
  { path: "/request-a-quote", priority: 0.9, changeFrequency: "yearly" },
  { path: "/service-areas", priority: 0.8, changeFrequency: "monthly" },
  { path: "/reviews", priority: 0.7, changeFrequency: "weekly" },
  { path: "/about", priority: 0.6, changeFrequency: "yearly" },
  { path: "/faq", priority: 0.6, changeFrequency: "monthly" },
  { path: "/trust", priority: 0.5, changeFrequency: "yearly" },
];

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const lastModified = new Date();
  const reviews = await hasPublicReviews();
  return pages.filter((p) => p.path !== "/reviews" || reviews).map((p) => ({ url: `${base}${p.path}`, lastModified, changeFrequency: p.changeFrequency, priority: p.priority }));
}
