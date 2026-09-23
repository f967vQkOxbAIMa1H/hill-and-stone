import { db } from "@/lib/db";
import { readStoredFile } from "@/lib/storage";

const types: Record<string, string> = { jpg: "image/jpeg", jpeg: "image/jpeg", png: "image/png", webp: "image/webp" };

// Public portfolio photos. Only files attached to a published project are served;
// customer uploads live under the same storage root but are never reachable here.
export async function GET(_request: Request, { params }: RouteContext<"/media/[...key]">) {
  const storageKey = (await params).key.join("/");
  const image = await db.projectImage.findFirst({ where: { storageKey, project: { published: true } }, select: { id: true } });
  const type = types[storageKey.split(".").pop()?.toLowerCase() ?? ""];
  if (!image || !type) return new Response("Not found", { status: 404 });
  try {
    const data = await readStoredFile(storageKey);
    if (!data) return new Response("Not found", { status: 404 });
    return new Response(new Uint8Array(data), {
      headers: { "Content-Type": type, "Cache-Control": "public, max-age=86400", "X-Content-Type-Options": "nosniff" },
    });
  } catch {
    return new Response("Not found", { status: 404 });
  }
}
