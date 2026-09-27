import { requireCan } from "@/lib/auth/session";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import { ReviewForm } from "@/components/admin/review-form";
import { reviewSources } from "@/lib/admin/content-schema";
import { db } from "@/lib/db";
import { isPublicRating } from "@/lib/reviews";

export const metadata: Metadata = { title: "Edit review" };

export default async function EditReviewPage({ params, searchParams }: PageProps<"/admin/reviews/[id]">) {
  await requireCan("manageContent");
  const [review, projects] = await Promise.all([
    db.testimonial.findUnique({ where: { id: (await params).id } }),
    db.project.findMany({ orderBy: { title: "asc" }, select: { id: true, title: true } }),
  ]);
  if (!review) notFound();
  const { created } = await searchParams;
  return (
    <>
      <header className="border-b border-navy-200 px-5 py-6 sm:px-8">
        <Link prefetch={false} href="/admin/reviews" className="inline-flex items-center gap-1 text-sm text-navy-600 hover:text-navy-950">
          <ChevronLeft aria-hidden className="size-4" />
          Reviews
        </Link>
        <h1 className="mt-2 font-semiwide text-2xl font-bold sm:text-3xl">Review from {review.authorName}</h1>
        {!isPublicRating(review.rating) && (
          <p className="mt-4 rounded-control bg-copper-100 px-4 py-3 text-copper-700">
            <span className="font-semibold">Private feedback ({review.rating} of 5 stars).</span> Reviews under 4 stars never show on the
            site{review.source === "website" ? " and were emailed to the business inbox under Feedback/Low-Rating" : ""}.
          </p>
        )}
        {review.authorEmail && (
          <p className="mt-3 text-sm text-navy-600">
            Submitted on the website by{" "}
            <a href={`mailto:${review.authorEmail}`} className="font-semibold text-navy-950 underline underline-offset-4">
              {review.authorEmail}
            </a>{" "}
            (private, never shown publicly).
          </p>
        )}
        {created && (
          <p role="status" className="mt-4 rounded-control bg-success-100 px-4 py-3 font-medium text-success-700">
            Review added.{review.published ? " It's live on the site." : " It's hidden until you tick Published."}
          </p>
        )}
      </header>
      <div className="px-5 py-6 sm:px-8">
        <ReviewForm
          projects={projects}
          initial={{
            id: review.id,
            authorName: review.authorName,
            city: review.city,
            body: review.body,
            rating: review.rating,
            source: reviewSources.some((s) => s.value === review.source) ? review.source : "direct",
            sourceUrl: review.sourceUrl ?? "",
            reviewedAt: review.reviewedAt ? review.reviewedAt.toISOString().slice(0, 10) : "",
            projectId: review.projectId ?? "",
            featured: review.featured,
            published: review.published,
            // Already-published reviews were cleared for publishing when they were added.
            // Website reviewers agree to publication when they submit.
            permission: review.published || review.source === "website",
          }}
        />
      </div>
    </>
  );
}
