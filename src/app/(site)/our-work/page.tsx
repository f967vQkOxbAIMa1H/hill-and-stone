import type { Metadata } from "next";
import { CtaBand } from "@/components/site/cta-band";
import { PageIntro } from "@/components/site/page-intro";
import { ProjectGallery, type GalleryProject } from "@/components/work/project-gallery";
import { ButtonLink } from "@/components/ui/button";
import { Container } from "@/components/ui/container";
import { getProjects } from "@/lib/content";
import { isPlaceholder, projectMedia } from "@/lib/media";
import { quoteHref } from "@/lib/site";

export const metadata: Metadata = {
  title: "Our work",
  description:
    "Before-and-after photos of Hill & Stone repairs and small renovations in Bentonville, Rogers, Springdale, Fayetteville and around Northwest Arkansas.",
};

export default async function OurWorkPage() {
  const projects = await getProjects();

  const gallery: GalleryProject[] = projects.map((p) => ({
    slug: p.slug,
    title: p.title,
    category: p.category,
    city: p.city,
    summary: p.summary,
    scopeOfWork: p.scopeOfWork,
    results: p.results,
    materials: p.materials,
    durationDays: p.durationDays,
    completed: p.completedAt?.toISOString() ?? null,
    media: projectMedia(p.images),
    placeholder: p.images.some((i) => isPlaceholder(i.storageKey)),
    quote: p.testimonials[0] ?? null,
  }));

  return (
    <>
      <PageIntro
        title="Our work"
        lede="Recent repairs and projects from around Northwest Arkansas. Open any project to drag between before and after and see what we did."
      />
      <Container className="py-14 lg:py-16">
        {gallery.length > 0 ? (
          <ProjectGallery projects={gallery} />
        ) : (
          // Launch state: no photos uploaded yet in /admin/portfolio. No placeholder images are shown.
          <div className="max-w-xl">
            <p className="text-lg font-bold">Project photos are on their way.</p>
            <p className="mt-2 text-navy-600">
              We&apos;re photographing recent jobs now. Meanwhile, send us a photo of yours and we&apos;ll tell you what it takes.
            </p>
            <ButtonLink href={quoteHref} className="mt-5">
              Request an Estimate
            </ButtonLink>
          </div>
        )}
      </Container>
      <CtaBand title="Have something like this at your place?" />
    </>
  );
}
