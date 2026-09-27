import "server-only";
import { db } from "@/lib/db";
import { PUBLIC_MIN_RATING } from "@/lib/reviews";

/**
 * Sample projects (placeholder photos) and sample reviews from `npm run db:seed` stay off the public site
 * unless SHOW_SAMPLE_CONTENT=1, so launch starts with an empty gallery until real photos are uploaded.
 */
const showSamples = () => process.env.SHOW_SAMPLE_CONTENT === "1";
const realReviews = () => (showSamples() ? {} : { source: { not: "seed" } });
const realProjects = () => (showSamples() ? {} : { images: { none: { storageKey: { startsWith: "/placeholders/" } } } });
/** What makes a review public: published, and rated 4 stars or higher. Under 4 stars never shows. */
const publicReview = () => ({ published: true, rating: { gte: PUBLIC_MIN_RATING }, ...realReviews() });

// Content queries return empty results if the database is unreachable, so marketing pages still render.
async function safe<T>(label: string, fn: () => Promise<T>, fallback: T): Promise<T> {
  try {
    return await fn();
  } catch (error) {
    console.error(`${label} failed`, error);
    return fallback;
  }
}

/** Public testimonials (published, 4+ stars), featured first. */
export function getTestimonials(limit?: number) {
  return safe(
    "getTestimonials",
    () =>
      db.testimonial.findMany({
        where: publicReview(),
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
        where: { published: true, ...realProjects() },
        orderBy: [{ featured: "desc" }, { completedAt: { sort: "desc", nulls: "last" } }],
        include: {
          images: { orderBy: { sortOrder: "asc" } },
          testimonials: { where: publicReview(), take: 1, select: { body: true, authorName: true, city: true } },
        },
      }),
    [],
  );
}

export type ProjectWithImages = Awaited<ReturnType<typeof getProjects>>[number];
export type TestimonialWithProject = Awaited<ReturnType<typeof getTestimonials>>[number];
