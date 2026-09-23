/** Public URL for a stored media key. Keys starting with "/" are files in /public (placeholders). */
export function mediaUrl(storageKey: string) {
  return storageKey.startsWith("/") ? storageKey : `/media/${storageKey}`;
}

export const isPlaceholder = (storageKey: string) => storageKey.startsWith("/placeholders/");

type ImageRow = { storageKey: string; alt: string; isBefore: boolean; pairKey: string | null };

/** Picks a before/after pair when there is one, else a single photo, else nothing. */
export function projectMedia(images: ImageRow[]) {
  const photo = (i: ImageRow) => ({ src: mediaUrl(i.storageKey), alt: i.alt });
  const before = images.find((i) => i.isBefore);
  const after = images.find((i) => !i.isBefore && (!before?.pairKey || i.pairKey === before.pairKey));
  if (before && after) return { kind: "pair" as const, before: photo(before), after: photo(after) };
  const any = after ?? images.find((i) => !i.isBefore) ?? before;
  return any ? { kind: "single" as const, image: photo(any) } : { kind: "none" as const };
}
