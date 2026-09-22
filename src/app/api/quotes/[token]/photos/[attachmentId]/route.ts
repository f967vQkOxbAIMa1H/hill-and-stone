import { readFile } from "node:fs/promises";
import { getQuoteByToken } from "@/lib/quotes/queries";
import { resolveKey } from "@/lib/storage";

// Serves a customer's own request photos, only through their quote link.
export async function GET(_request: Request, { params }: RouteContext<"/api/quotes/[token]/photos/[attachmentId]">) {
  const { token, attachmentId } = await params;
  const quote = await getQuoteByToken(token);
  const photo = quote?.lead?.attachments.find((a) => a.id === attachmentId);
  if (!photo) return new Response("Not found", { status: 404 });
  try {
    const data = await readFile(resolveKey(photo.storageKey));
    return new Response(new Uint8Array(data), {
      headers: {
        "Content-Type": photo.mimeType,
        "Cache-Control": "private, max-age=3600",
        "X-Content-Type-Options": "nosniff",
        "Content-Disposition": "inline",
      },
    });
  } catch {
    return new Response("Not found", { status: 404 });
  }
}
