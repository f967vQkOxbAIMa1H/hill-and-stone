import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";
import { getAdmin } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { UPLOAD_LIMITS } from "@/lib/quote-request/options";
import { deleteFiles, putFile, sniffImage } from "@/lib/storage";

export const runtime = "nodejs";

// Admin upload of portfolio photos. Multipart: one or more "photos", plus "role" (before | after | gallery).
export async function POST(request: Request, { params }: RouteContext<"/api/admin/projects/[id]/images">) {
  if (!(await getAdmin())) return NextResponse.json({ error: "Sign in again." }, { status: 401 });
  const { id } = await params;
  const project = await db.project.findUnique({ where: { id }, include: { _count: { select: { images: true } } } });
  if (!project) return NextResponse.json({ error: "That project no longer exists." }, { status: 404 });

  const form = await request.formData().catch(() => null);
  if (!form) return NextResponse.json({ error: "The upload didn't come through. Try again." }, { status: 400 });
  const role = String(form.get("role") ?? "gallery");
  const files = form.getAll("photos").filter((f): f is File => f instanceof File && f.size > 0);
  if (!files.length) return NextResponse.json({ error: "Choose at least one photo." }, { status: 400 });
  if (project._count.images + files.length > 30) return NextResponse.json({ error: "A project can have up to 30 photos." }, { status: 400 });
  if ((role === "before" || role === "after") && files.length > 1) {
    return NextResponse.json({ error: `Upload one ${role} photo at a time.` }, { status: 400 });
  }

  const checked = [];
  for (const file of files) {
    if (file.size > UPLOAD_LIMITS.maxBytes) return NextResponse.json({ error: `${file.name} is over 10 MB.` }, { status: 400 });
    const data = Buffer.from(await file.arrayBuffer());
    const kind = sniffImage(data);
    if (!kind) return NextResponse.json({ error: `${file.name} isn't a JPG, PNG or WebP image.` }, { status: 400 });
    checked.push({ data, ...kind });
  }

  const stored: string[] = [];
  try {
    for (const f of checked) stored.push((await putFile(`projects/${id}`, f.ext, f.data, f.mime)).storageKey);
    await db.$transaction(async (tx) => {
      if (role === "before" || role === "after") {
        // Replacing the before (or after) photo demotes the old one to an extra photo.
        await tx.projectImage.updateMany({ where: { projectId: id, pairKey: "main", isBefore: role === "before" }, data: { pairKey: null, isBefore: false } });
      }
      const base = project._count.images;
      await tx.projectImage.createMany({
        data: stored.map((storageKey, i) => ({
          projectId: id,
          storageKey,
          alt: role === "gallery" ? project.title : `${project.title}: ${role}`,
          isBefore: role === "before",
          pairKey: role === "gallery" ? null : "main",
          sortOrder: base + i,
        })),
      });
    });
  } catch (error) {
    console.error("Project photo upload failed", error);
    await deleteFiles(stored);
    return NextResponse.json({ error: "The photos didn't save. Try again." }, { status: 500 });
  }

  revalidatePath("/our-work");
  revalidatePath("/");
  return NextResponse.json({ ok: true, count: stored.length });
}
