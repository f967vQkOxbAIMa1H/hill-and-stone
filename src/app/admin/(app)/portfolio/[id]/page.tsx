import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft, ExternalLink } from "lucide-react";
import { ProjectForm } from "@/components/admin/project-form";
import { ProjectPhotos, type AdminPhoto } from "@/components/admin/project-photos";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { db } from "@/lib/db";

export const metadata: Metadata = { title: "Edit project" };

export default async function EditProjectPage({ params, searchParams }: PageProps<"/admin/portfolio/[id]">) {
  const project = await db.project.findUnique({ where: { id: (await params).id }, include: { images: { orderBy: { sortOrder: "asc" } } } });
  if (!project) notFound();
  const { created } = await searchParams;
  const photos: AdminPhoto[] = project.images.map((i) => ({
    id: i.id,
    alt: i.alt,
    role: i.pairKey === "main" ? (i.isBefore ? "before" : "after") : "gallery",
  }));

  return (
    <>
      <header className="border-b border-navy-200 px-5 py-6 sm:px-8">
        <Link prefetch={false} href="/admin/portfolio" className="inline-flex items-center gap-1 text-sm text-navy-600 hover:text-navy-950">
          <ChevronLeft aria-hidden className="size-4" />
          Portfolio
        </Link>
        <div className="mt-2 flex flex-wrap items-center gap-3">
          <h1 className="font-semiwide text-2xl font-bold sm:text-3xl">{project.title}</h1>
          <Badge tone={project.published ? "success" : "neutral"}>{project.published ? "Published" : "Draft"}</Badge>
          {project.published && (
            <a href={`/our-work?project=${project.slug}`} target="_blank" rel="noopener noreferrer" className={buttonVariants({ variant: "outline", size: "sm" })}>
              <ExternalLink aria-hidden />
              View on site
            </a>
          )}
        </div>
        {created && (
          <p role="status" className="mt-4 rounded-control bg-success-100 px-4 py-3 font-medium text-success-700">
            Project created as a draft. Add photos below, then tick Published when it&apos;s ready.
          </p>
        )}
      </header>
      <div className="grid gap-10 px-5 py-6 sm:px-8 2xl:grid-cols-2">
        <ProjectPhotos projectId={project.id} photos={photos} />
        <section aria-labelledby="details-h">
          <h2 id="details-h" className="mb-4 font-bold">
            Details
          </h2>
          <ProjectForm
            initial={{
              id: project.id,
              title: project.title,
              slug: project.slug,
              category: project.category,
              city: project.city,
              summary: project.summary,
              scopeOfWork: project.scopeOfWork,
              results: project.results ?? "",
              materials: project.materials.join("\n"),
              durationDays: project.durationDays ? String(project.durationDays) : "",
              completedAt: project.completedAt ? project.completedAt.toISOString().slice(0, 10) : "",
              featured: project.featured,
              published: project.published,
            }}
          />
        </section>
      </div>
    </>
  );
}
