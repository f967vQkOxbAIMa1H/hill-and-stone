import type { MetadataRoute } from "next";
import { brand } from "@/lib/site";

// Install metadata for phones ("Add to Home Screen"). Icons come from scripts/brand-icons.ts.
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: brand.fullName,
    short_name: brand.name,
    description: brand.tagline,
    start_url: "/",
    display: "browser",
    background_color: "#f4f2ed",
    theme_color: "#10243a",
    icons: [
      { src: "/brand/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/brand/icon-512.png", sizes: "512x512", type: "image/png" },
      { src: "/brand/icon-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
