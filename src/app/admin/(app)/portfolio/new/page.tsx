import { requireCan } from "@/lib/auth/session";
import type { Metadata } from "next";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { ProjectForm } from "@/components/admin/project-form";

export const metadata: Metadata = { title: "New project" };

export default async function NewProjectPage() {
  await requireCan("manageContent");
  return (
    <>
      <header className="border-b border-navy-200 px-5 py-6 sm:px-8">
        <Link prefetch={false} href="/admin/portfolio" className="inline-flex items-center gap-1 text-sm text-navy-600 hover:text-navy-950">
          <ChevronLeft aria-hidden className="size-4" />
          Portfolio
        </Link>
        <h1 className="mt-2 font-semiwide text-2xl font-bold sm:text-3xl">New project</h1>
        <p className="mt-1 text-navy-600">Save the details first; you&apos;ll add photos on the next screen.</p>
      </header>
      <div className="max-w-4xl px-5 py-6 sm:px-8">
        <ProjectForm
          initial={{ title: "", slug: "", category: "INTERIOR_REPAIRS", city: "", summary: "", scopeOfWork: "", results: "", materials: "", durationDays: "", completedAt: "", featured: false, published: false }}
        />
      </div>
    </>
  );
}
