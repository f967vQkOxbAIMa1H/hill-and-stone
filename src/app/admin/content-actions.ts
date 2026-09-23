"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { imageRoles, projectSchema, reviewSchema, slugify, type ProjectInput, type ReviewInput } from "@/lib/admin/content-schema";
import { requireAdmin } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { deleteFiles } from "@/lib/storage";

// Every action re-checks the session.

export type FormResult = { ok: true; id: string } | { ok: false; errors: Record<string, string> };

const flatten = (e: z.ZodError) => {
  const out: Record<string, string> = {};
  for (const i of e.issues) out[i.path.join(".") || "form"] ??= i.message;
  return out;
};

/** Public pages that show portfolio projects or reviews. */
function refreshPublic() {
  revalidatePath("/");
  revalidatePath("/our-work");
  revalidatePath("/reviews");
  revalidatePath("/admin/portfolio");
  revalidatePath("/admin/reviews");
}

// ─── Portfolio ──────────────────────────────────────────────────────────────

export async function saveProject(input: ProjectInput): Promise<FormResult> {
  await requireAdmin();
  const parsed = projectSchema.safeParse(input);
  if (!parsed.success) return { ok: false, errors: flatten(parsed.error) };
  const p = parsed.data;

  const slug = p.slug || slugify(`${p.title} ${p.city}`);
  const clash = await db.project.findFirst({ where: { slug, ...(p.id ? { id: { not: p.id } } : {}) }, select: { id: true } });
  if (clash) return { ok: false, errors: { slug: "Another project already uses this web address. Change the slug." } };

  const data = {
    title: p.title,
    slug,
    category: p.category,
    city: p.city,
    summary: p.summary,
    scopeOfWork: p.scopeOfWork,
    results: p.results || null,
    materials: p.materials.split("\n").map((m) => m.trim()).filter(Boolean).slice(0, 30),
    durationDays: p.durationDays ? Number(p.durationDays) : null,
    completedAt: p.completedAt ? new Date(`${p.completedAt}T12:00:00Z`) : null,
    featured: p.featured,
    published: p.published,
  };

  const project = p.id ? await db.project.update({ where: { id: p.id }, data }) : await db.project.create({ data });
  refreshPublic();
  return { ok: true, id: project.id };
}

export async function deleteProject(id: string) {
  await requireAdmin();
  const images = await db.projectImage.findMany({ where: { projectId: id }, select: { storageKey: true } });
  await db.project.delete({ where: { id } }).catch(() => null);
  // Placeholder images live in /public ("/..." keys) and aren't ours to delete.
  await deleteFiles(images.map((i) => i.storageKey).filter((k) => !k.startsWith("/")));
  refreshPublic();
  redirect("/admin/portfolio");
}

export async function updateProjectImage(imageId: string, patch: { role?: string; alt?: string }) {
  await requireAdmin();
  const image = await db.projectImage.findUnique({ where: { id: imageId } });
  if (!image) return { ok: false, message: "That photo no longer exists." };

  if (patch.alt !== undefined) {
    const alt = patch.alt.trim().slice(0, 200);
    if (!alt) return { ok: false, message: "Describe the photo for people who can't see it." };
    await db.projectImage.update({ where: { id: imageId }, data: { alt } });
  }

  if (patch.role !== undefined) {
    const role = z.enum(imageRoles).safeParse(patch.role);
    if (!role.success) return { ok: false, message: "Choose before, after or extra photo." };
    await db.$transaction(async (tx) => {
      // Only one "before" and one "after" per project: demote whichever held the role.
      if (role.data !== "gallery") {
        await tx.projectImage.updateMany({
          where: { projectId: image.projectId, pairKey: "main", isBefore: role.data === "before", id: { not: imageId } },
          data: { pairKey: null, isBefore: false },
        });
      }
      await tx.projectImage.update({
        where: { id: imageId },
        data: role.data === "gallery" ? { pairKey: null, isBefore: false } : { pairKey: "main", isBefore: role.data === "before" },
      });
    });
  }
  refreshPublic();
  revalidatePath(`/admin/portfolio/${image.projectId}`);
  return { ok: true, message: "Saved." };
}

export async function deleteProjectImage(imageId: string) {
  await requireAdmin();
  const image = await db.projectImage.findUnique({ where: { id: imageId } });
  if (!image) return { ok: false, message: "That photo no longer exists." };
  await db.projectImage.delete({ where: { id: imageId } });
  if (!image.storageKey.startsWith("/")) await deleteFiles([image.storageKey]);
  refreshPublic();
  revalidatePath(`/admin/portfolio/${image.projectId}`);
  return { ok: true, message: "Photo removed." };
}

// ─── Reviews ────────────────────────────────────────────────────────────────

export async function saveReview(input: ReviewInput): Promise<FormResult> {
  await requireAdmin();
  const parsed = reviewSchema.safeParse(input);
  if (!parsed.success) return { ok: false, errors: flatten(parsed.error) };
  const r = parsed.data;
  if (r.projectId && !(await db.project.findUnique({ where: { id: r.projectId }, select: { id: true } }))) {
    return { ok: false, errors: { projectId: "That project no longer exists." } };
  }
  const data = {
    authorName: r.authorName,
    city: r.city,
    body: r.body,
    rating: r.rating,
    source: r.source,
    sourceUrl: r.sourceUrl || null,
    reviewedAt: r.reviewedAt ? new Date(`${r.reviewedAt}T12:00:00Z`) : null,
    projectId: r.projectId || null,
    featured: r.featured,
    published: r.published,
  };
  const review = r.id ? await db.testimonial.update({ where: { id: r.id }, data }) : await db.testimonial.create({ data });
  refreshPublic();
  return { ok: true, id: review.id };
}

export async function deleteReview(id: string) {
  await requireAdmin();
  await db.testimonial.delete({ where: { id } }).catch(() => null);
  refreshPublic();
  redirect("/admin/reviews");
}
