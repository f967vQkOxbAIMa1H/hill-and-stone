import "server-only";
import { db } from "@/lib/db";

// Content queries return empty results if the database is unreachable, so marketing pages still render.
async function safe<T>(label: string, fn: () => Promise<T>, fallback: T): Promise<T> {
  try {
    return await fn();
  } catch (error) {
    console.error(`${label} failed`, error);
    return fallback;
  }
}

/** Published testimonials, featured first. */
export function getTestimonials(limit?: number) {
  return safe(
    "getTestimonials",
    () =>
      db.testimonial.findMany({
        where: { published: true },
        orderBy: [{ featured: "desc" }, { reviewedAt: { sort: "desc", nulls: "last" } }, { createdAt: "desc" }],
        take: limit,
        include: { project: { select: { slug: true, title: true, published: true } } },
      }),
    [],
  );
}

export function getProjects() {
  return safe(
    "getProjects",
    () =>
      db.project.findMany({
        where: { published: true },
        orderBy: [{ featured: "desc" }, { completedAt: { sort: "desc", nulls: "last" } }],
        include: {
          images: { orderBy: { sortOrder: "asc" } },
          testimonials: { where: { published: true }, take: 1, select: { body: true, authorName: true, city: true } },
        },
      }),
    [],
  );
}

export type ProjectWithImages = Awaited<ReturnType<typeof getProjects>>[number];
export type TestimonialWithProject = Awaited<ReturnType<typeof getTestimonials>>[number];
