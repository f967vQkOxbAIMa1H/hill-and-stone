/** Public URL for a stored media key. Keys starting with "/" are files in /public (placeholders). */
export function mediaUrl(storageKey: string) {
  return storageKey.startsWith("/") ? storageKey : `/media/${storageKey}`;
}

export const isPlaceholder = (storageKey: string) => storageKey.startsWith("/placeholders/");
