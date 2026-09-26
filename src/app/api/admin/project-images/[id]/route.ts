import { apiAdmin } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { readStoredFile } from "@/lib/storage";

const types: Record<string, string> = { jpg: "image/jpeg", jpeg: "image/jpeg", png: "image/png", webp: "image/webp", svg: "image/svg+xml" };

// Admin preview of any project photo, including ones on unpublished projects.
export async function GET(request: Request, { params }: RouteContext<"/api/admin/project-images/[id]">) {
  const { admin, status } = await apiAdmin("manageContent");
  if (!admin) return new Response(status === 401 ? "Unauthorized" : "Forbidden", { status });
  const image = await db.projectImage.findUnique({ where: { id: (await params).id } });
  if (!image) return new Response("Not found", { status: 404 });
  // Sample placeholders live in /public.
  if (image.storageKey.startsWith("/")) return Response.redirect(new URL(image.storageKey, request.url), 302);
  const data = await readStoredFile(image.storageKey).catch(() => null);
  if (!data) return new Response("Not found", { status: 404 });
  return new Response(new Uint8Array(data), {
    headers: {
      "Content-Type": types[image.storageKey.split(".").pop() ?? ""] ?? "application/octet-stream",
      "Cache-Control": "private, max-age=3600",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
