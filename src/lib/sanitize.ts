// Client-safe: the zod schemas that use this run in forms as well as on the server.

/**
 * Strips HTML from free text before it's saved or emailed: script and style blocks with their
 * contents, comments, and anything shaped like a tag. A lone "<" as in "gap < 2 inches" is kept,
 * since it only becomes a tag when a letter, "/" or "!" follows it.
 *
 * React escapes text when rendering, and emails escape it too; this is defense in depth for
 * anything that might one day render it raw (an email client, a CSV export, a spreadsheet).
 */
export function stripTags(input: string) {
  return input
    .replace(/<(script|style)\b[^>]*>[\s\S]*?<\/\1\s*>/gi, "")
    .replace(/<!--[\s\S]*?(-->|$)/g, "")
    .replace(/<\/?[a-z!][^>]*>/gi, "");
}
