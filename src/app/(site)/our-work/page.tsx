import type { Metadata } from "next";
import { CtaBand } from "@/components/site/cta-band";
import { PageIntro } from "@/components/site/page-intro";
import { ProjectGallery, type GalleryProject } from "@/components/work/project-gallery";
import { Container } from "@/components/ui/container";
import { getProjects } from "@/lib/content";
import { isPlaceholder, mediaUrl } from "@/lib/media";

export const revalidate = 3600;

export const metadata: Metadata = {
  title: "Our work",
  description:
    "Before-and-after photos of Hill & Stone repairs and small renovations in Bentonville, Rogers, Springdale, Fayetteville and around Northwest Arkansas.",
};

export default async function OurWorkPage() {
  const projects = await getProjects();

  const gallery: GalleryProject[] = projects.flatMap((p) => {
    const before = p.images.find((i) => i.isBefore);
    const after = p.images.find((i) => !i.isBefore && (!before?.pairKey || i.pairKey === before.pairKey));
    if (!before || !after) return [];
    return [
      {
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
        before: { src: mediaUrl(before.storageKey), alt: before.alt },
        after: { src: mediaUrl(after.storageKey), alt: after.alt },
        placeholder: isPlaceholder(before.storageKey),
        quote: p.testimonials[0] ?? null,
      },
    ];
  });

  return (
    <>
      <PageIntro
        title="Our work"
        lede="Recent repairs and projects from around Northwest Arkansas. Open any project to drag between before and after and see what we did."
      />
      <Container className="py-14 lg:py-16">
        <ProjectGallery projects={gallery} />
      </Container>
      <CtaBand title="Have something like this at your place?" />
    </>
  );
}
