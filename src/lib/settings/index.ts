import "server-only";
import { revalidatePath } from "next/cache";
import { cache } from "react";
import { db } from "@/lib/db";
import { buildSite, defaultSettings, type SiteConfig } from "@/lib/site";
import { settingsSchema, type Settings } from "./schema";

/** Saved settings merged over the code defaults. Falls back to defaults if the database is unreachable. */
export const getSettings = cache(async (): Promise<Settings> => {
  try {
    const row = await db.siteSettings.findUnique({ where: { id: "site" } });
    if (!row) return defaultSettings;
    const merged = deepMerge(defaultSettings, row.data as Partial<Settings>);
    const parsed = settingsSchema.safeParse(merged);
    if (!parsed.success) {
      console.error("Saved site settings are invalid; using defaults", parsed.error.issues[0]);
      return defaultSettings;
    }
    return parsed.data;
  } catch (error) {
    console.error("getSettings failed; using defaults", error);
    return defaultSettings;
  }
});

/** The site configuration for this request. */
export const getSite = cache(async (): Promise<SiteConfig> => buildSite(await getSettings()));

export async function saveSettings(settings: Settings, userId: string) {
  await db.siteSettings.upsert({
    where: { id: "site" },
    create: { id: "site", data: settings, updatedById: userId },
    update: { data: settings, updatedById: userId },
  });
  // Every page shows contact details, so refresh them all.
  revalidatePath("/", "layout");
}

function deepMerge<T>(base: T, patch: unknown): T {
  if (Array.isArray(base) || typeof base !== "object" || base === null) return (patch === undefined ? base : patch) as T;
  const out = { ...base } as Record<string, unknown>;
  if (patch && typeof patch === "object") {
    for (const [k, v] of Object.entries(patch)) out[k] = k in out ? deepMerge(out[k], v) : v;
  }
  return out as T;
}
