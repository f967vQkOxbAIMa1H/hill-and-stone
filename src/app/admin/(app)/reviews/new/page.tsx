import { requireCan } from "@/lib/auth/session";
import type { Metadata } from "next";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { ReviewForm } from "@/components/admin/review-form";
import { db } from "@/lib/db";

export const metadata: Metadata = { title: "Add review" };

export default async function NewReviewPage() {
  await requireCan("manageContent");
  const projects = await db.project.findMany({ orderBy: { title: "asc" }, select: { id: true, title: true } });
  return (
    <>
      <header className="border-b border-navy-200 px-5 py-6 sm:px-8">
        <Link prefetch={false} href="/admin/reviews" className="inline-flex items-center gap-1 text-sm text-navy-600 hover:text-navy-950">
          <ChevronLeft aria-hidden className="size-4" />
          Reviews
        </Link>
        <h1 className="mt-2 font-semiwide text-2xl font-bold sm:text-3xl">Add review</h1>
      </header>
      <div className="px-5 py-6 sm:px-8">
        <ReviewForm
          projects={projects}
          initial={{ authorName: "", city: "", body: "", rating: 5, source: "google", sourceUrl: "", reviewedAt: "", projectId: "", featured: false, published: false, permission: false }}
        />
      </div>
    </>
  );
}
