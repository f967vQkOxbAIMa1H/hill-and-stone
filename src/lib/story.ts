import type { SiteConfig } from "@/lib/site";

/** "Tucker and Sam", "Tucker", or null when no names are set yet. */
export function foundersLabel(story: SiteConfig["story"]) {
  const names = [story.founderName, story.coFounderName].filter((n): n is string => !!n);
  return names.length ? names.join(" and ") : null;
}

/**
 * The origin story, built from the facts in business settings (home and About pages).
 * Sentences whose facts are missing are left out, so it reads naturally at any stage.
 */
export function storyParagraphs(story: SiteConfig["story"]) {
  const { founderName, coFounderName, foundedYear, hometown, crewSize, founderBackground } = story;
  const who = foundersLabel(story) ?? "Our founders";
  const plural = !founderName || !!coFounderName;
  const first = [
    hometown
      ? `${who} grew up in ${hometown}.`
      : `${who} ${plural ? "have" : "has"} lived and worked in Northwest Arkansas for years.`,
    founderBackground ? `${founderName ?? "Our founder"} spent ${founderBackground}.` : "",
  ]
    .filter(Boolean)
    .join(" ");
  return [
    `${first} Along the way, the same complaint kept coming up from neighbors: good repair help was hard to book, and too many small jobs were left half finished.`,
    `Hill & Stone started${foundedYear ? ` in ${foundedYear}` : ""} to fix that. The name comes from the land here: the Ozark hills, and the limestone and fieldstone that NWA houses have been built on for a hundred years. Both last because they were set right the first time.`,
    `Today we're ${crewSize ? `a crew of ${crewSize}` : "a small local crew"}, working from Fayetteville to Bella Vista. We take on the repairs and small projects that fall between a weekend DIY and a general contractor, and we give them the same care as a big remodel.`,
  ];
}
