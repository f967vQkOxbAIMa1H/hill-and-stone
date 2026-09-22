import { readFile } from "node:fs/promises";
import { getAdmin } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { resolveKey } from "@/lib/storage";

// Full-resolution request photos for signed-in admins only.
export async function GET(_request: Request, { params }: RouteContext<"/api/admin/attachments/[id]">) {
  if (!(await getAdmin())) return new Response("Unauthorized", { status: 401 });
  const { id } = await params;
  const file = await db.attachment.findUnique({ where: { id } });
  if (!file) return new Response("Not found", { status: 404 });
  try {
    const data = await readFile(resolveKey(file.storageKey));
    return new Response(new Uint8Array(data), {
      headers: {
        "Content-Type": file.mimeType,
        "Cache-Control": "private, max-age=3600",
        "X-Content-Type-Options": "nosniff",
        "Content-Disposition": `inline; filename="${file.fileName.replace(/[^\w.\- ]/g, "_")}"`,
      },
    });
  } catch {
    return new Response("Not found", { status: 404 });
  }
}
