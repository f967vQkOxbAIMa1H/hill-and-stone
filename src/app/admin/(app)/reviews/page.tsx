import { requireCan } from "@/lib/auth/session";
import type { Metadata } from "next";
import Link from "next/link";
import { Plus } from "lucide-react";
import { fmtDay } from "@/components/admin/format";
import { AdminHeader } from "@/components/admin/page-header";
import { PhoneList, PhoneRow } from "@/components/admin/phone-list";
import { Badge } from "@/components/ui/badge";
import { ButtonLink } from "@/components/ui/button";
import { reviewSources } from "@/lib/admin/content-schema";
import { db } from "@/lib/db";
import { isPublicRating } from "@/lib/reviews";

export const metadata: Metadata = { title: "Reviews" };

export default async function ReviewsAdminPage() {
  await requireCan("manageContent");
  const reviews = await db.testimonial.findMany({
    orderBy: [{ published: "desc" }, { featured: "desc" }, { reviewedAt: { sort: "desc", nulls: "last" } }, { createdAt: "desc" }],
    include: { project: { select: { title: true } } },
  });

  return (
    <>
      <AdminHeader
        title="Reviews"
        description="Customer reviews for the Reviews page and home page. Website reviews with 4 or 5 stars publish automatically; under 4 stars stay private and go to your inbox as Feedback/Low-Rating."
        actions={
          <ButtonLink prefetch={false} href="/admin/reviews/new">
            <Plus aria-hidden />
            Add review
          </ButtonLink>
        }
      />
      <div className="px-5 py-6 sm:px-8">
        {reviews.length === 0 ? (
          <div className="rounded-panel border border-dashed border-navy-300 p-8 text-center">
            <p className="font-semibold">No reviews yet.</p>
            <p className="mt-1 text-sm text-navy-600">Copy in reviews from Google or ones customers sent you directly.</p>
          </div>
        ) : (
          <>
          <PhoneList>
            {reviews.map((r) => (
              <PhoneRow
                key={r.id}
                href={`/admin/reviews/${r.id}`}
                title={
                  <>
                    {r.authorName}{" "}
                    <span className="font-normal text-accent-700" aria-label={`${r.rating} stars`}>
                      {"★".repeat(r.rating)}
                    </span>
                  </>
                }
                lines={[<span key="b" className="line-clamp-2">{r.body}</span>, `${r.city}, ${fmtDay(r.reviewedAt ?? r.createdAt)}`]}
                aside={
                  <>
                    <Badge tone={r.published && isPublicRating(r.rating) ? "success" : "neutral"}>{r.published && isPublicRating(r.rating) ? "Published" : "Hidden"}</Badge>
                        {!isPublicRating(r.rating) && <Badge tone="danger">Low rating</Badge>}
                    {r.featured && <Badge tone="accent">Featured</Badge>}
                    {r.source === "seed" && <Badge tone="danger">Sample</Badge>}
                  </>
                }
              />
            ))}
          </PhoneList>
          <div className="hidden overflow-x-auto rounded-panel border border-navy-200 bg-white md:block">
            <table className="w-full min-w-[720px] text-left text-sm">
              <thead className="border-b border-navy-200 bg-stone-50 text-navy-600">
                <tr>
                  <th scope="col" className="px-4 py-3 font-semibold">Review</th>
                  <th scope="col" className="px-4 py-3 font-semibold">From</th>
                  <th scope="col" className="px-4 py-3 font-semibold">Status</th>
                  <th scope="col" className="px-4 py-3 text-right font-semibold">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-navy-200">
                {reviews.map((r) => (
                  <tr key={r.id} className="group relative hover:bg-stone-50">
                    <td className="max-w-md px-4 py-3">
                      <Link prefetch={false} href={`/admin/reviews/${r.id}`} className="line-clamp-2 after:absolute after:inset-0 group-hover:text-accent-700">
                        <span className="text-accent-700" aria-label={`${r.rating} stars`}>
                          {"★".repeat(r.rating)}
                        </span>{" "}
                        {r.body}
                      </Link>
                      {r.project && <span className="block text-navy-600">Linked to {r.project.title}</span>}
                    </td>
                    <td className="px-4 py-3">
                      <span className="font-semibold">{r.authorName}</span>
                      <span className="block text-navy-600">
                        {r.city}, {reviewSources.find((s) => s.value === r.source)?.label ?? r.source}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="flex flex-wrap gap-1">
                        <Badge tone={r.published && isPublicRating(r.rating) ? "success" : "neutral"}>{r.published && isPublicRating(r.rating) ? "Published" : "Hidden"}</Badge>
                        {!isPublicRating(r.rating) && <Badge tone="danger">Low rating</Badge>}
                        {r.featured && <Badge tone="accent">Featured</Badge>}
                        {r.source === "seed" && <Badge tone="danger">Sample</Badge>}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right text-navy-600">{fmtDay(r.reviewedAt ?? r.createdAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          </>
        )}
      </div>
    </>
  );
}
