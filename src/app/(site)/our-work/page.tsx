import type { Metadata } from "next";
import { CtaBand } from "@/components/site/cta-band";
import { PageIntro } from "@/components/site/page-intro";
import { ProjectGallery, type GalleryProject } from "@/components/work/project-gallery";
import { ButtonLink } from "@/components/ui/button";
import { Container } from "@/components/ui/container";
import { getProjects } from "@/lib/content";
import { isPlaceholder, projectMedia } from "@/lib/media";
import { estimateLabel, quoteHref } from "@/lib/site";

// Not linked from the nav (cut while the business is new). The page stays so old links and the
// admin portfolio keep working; it is kept out of search results until real projects are published.
export async function generateMetadata(): Promise<Metadata> {
  const projects = await getProjects();
  return {
    alternates: { canonical: "/our-work" },
    title: "Our work",
    description: "Recent Hill & Stone repairs and home improvements around Northwest Arkansas.",
    ...(projects.length === 0 && { robots: { index: false } }),
  };
}

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
        lede={
          gallery.length > 0
            ? "Recent repairs and projects from around Northwest Arkansas. Open any project to see what we did."
            : "Recent repairs and projects from around Northwest Arkansas."
        }
      />
      <Container className="py-14 lg:py-16">
        {gallery.length > 0 ? (
          <ProjectGallery projects={gallery} />
        ) : (
          // Launch state: no photos uploaded yet in /admin/portfolio. No placeholder images are shown.
          <div className="max-w-xl">
            <p className="text-lg font-bold">Project gallery coming soon.</p>
            <p className="mt-2 text-navy-600">
              In the meantime, send us a photo of what needs attention and we&apos;ll tell you what it takes.
            </p>
            <ButtonLink href={quoteHref} className="mt-5">
              {estimateLabel}
            </ButtonLink>
          </div>
        )}
      </Container>
      <CtaBand title={gallery.length > 0 ? "Have something like this at your place?" : undefined} />
    </>
  );
}
