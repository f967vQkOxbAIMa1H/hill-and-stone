import type { Metadata } from "next";
import Link from "next/link";
import { CtaBand } from "@/components/site/cta-band";
import { GoogleG, GoogleReviewsLink, Stars } from "@/components/site/review-bits";
import { Container } from "@/components/ui/container";
import { Heading, Lede } from "@/components/ui/heading";
import { getTestimonials, hasPublicReviews } from "@/lib/content";
import { getSite } from "@/lib/settings";
import { estimateLabel, quoteHref } from "@/lib/site";
import { ButtonLink } from "@/components/ui/button";
import { ScrollReveal } from "@/components/ScrollReveal";

// Out of the nav and search results until the first real review is public.
export async function generateMetadata(): Promise<Metadata> {
  return {
    title: "Reviews",
    description: "What Northwest Arkansas homeowners say about Hill & Stone repairs and home improvements.",
    ...(!(await hasPublicReviews()) && { robots: { index: false } }),
  };
}

const dateFmt = new Intl.DateTimeFormat("en-US", { month: "long", year: "numeric", timeZone: "America/Chicago" });

export default async function ReviewsPage() {
  const site = await getSite();
  const reviews = await getTestimonials();

  return (
    <>
      <section data-header-theme="light" className="border-b border-navy-200">
        <Container className="grid gap-10 py-16 sm:py-20 lg:grid-cols-[minmax(0,1fr)_360px] lg:items-end">
          <div>
            <Heading as="h1" level="page">
              Reviews
            </Heading>
            <Lede className="mt-5">
              From homeowners in Bentonville, Rogers, Springdale, Fayetteville and the towns around them.
            </Lede>
          </div>
          {/* The Google profile is the independent source; send people there first. */}
          {site.googleReviewsUrl && (
            <ScrollReveal delay={0.15} className="slate rounded-panel p-6">
              <div className="flex items-center gap-3">
                <GoogleG className="size-8" />
                <p className="font-serif text-xl leading-tight font-medium">Our Google reviews</p>
              </div>
              <p className="mt-3 text-navy-600">Read every review, or leave one after your job. It helps neighbors find a contractor they can trust.</p>
              <GoogleReviewsLink className="mt-5 w-full justify-center" />
            </ScrollReveal>
          )}
        </Container>
      </section>

      <Container className="py-16 lg:py-20">
        {reviews.length === 0 ? (
          <div className="max-w-xl">
            <p className="text-lg font-bold">No reviews here yet.</p>
            <p className="mt-2 text-navy-600">
              We&apos;re a new company. Reviews from our first customers will appear here as jobs are finished.
            </p>
            <ButtonLink href={quoteHref} className="mt-5">
              {estimateLabel}
            </ButtonLink>
          </div>
        ) : (
          // CSS columns give a wall where short and long reviews pack together.
          <ul className="gap-8 sm:columns-2 lg:columns-3">
            {reviews.map((r, i) => (
              <ScrollReveal as="li" key={r.id} delay={(i % 3) * 0.15} className="slate mb-8 break-inside-avoid rounded-panel p-6">
                <figure>
                  <Stars rating={r.rating} />
                  <blockquote className="mt-4 text-lg leading-relaxed">
                    <p>&ldquo;{r.body}&rdquo;</p>
                  </blockquote>
                  <figcaption className="mt-5 border-t border-navy-200 pt-4 text-sm">
                    <span className="font-semibold">{r.authorName}</span>
                    <span className="text-navy-600">, {r.city}</span>
                    {r.reviewedAt && <span className="block text-navy-600">{dateFmt.format(r.reviewedAt)}</span>}
                    {r.project?.published && (
                      <Link
                        href={`/our-work?project=${r.project.slug}`}
                        className="mt-2 block font-semibold text-accent-700 underline-offset-4 hover:underline"
                      >
                        See the project: {r.project.title}
                      </Link>
                    )}
                  </figcaption>
                </figure>
              </ScrollReveal>
            ))}
          </ul>
        )}
        <p className="mt-4 max-w-[70ch] text-sm text-navy-600">
          Reviews on this page are shared with permission and come from customers who rated us 4 or 5 stars. Lower ratings
          come to us privately so we can make things right.
          {site.googleReviewsUrl ? " Every review, whatever the rating, is on our Google profile." : ""}
        </p>
      </Container>

      <section data-header-theme="light" id="leave-a-review" aria-labelledby="leave-heading" className="scroll-mt-20 border-t border-navy-200 bg-stone-100">
        <Container className="grid gap-10 py-16 lg:grid-cols-[minmax(0,1fr)_minmax(0,2fr)] lg:gap-16 lg:py-20">
          <div>
            <Heading id="leave-heading">Had us out recently?</Heading>
          </div>
          <div className="max-w-[60ch] space-y-4 text-lg text-navy-700">
            <p>
              Every review on this page comes from a real, finished job. When your job is paid, we email you a private link to
              tell us how it went. It takes a minute.
            </p>
            <p>
              Can&apos;t find the email? Write to{" "}
              <a href={`mailto:${site.email}?subject=${encodeURIComponent("Review link")}`} className="font-semibold text-accent-700 underline underline-offset-4">
                {site.email}
              </a>{" "}
              and we&apos;ll send it again.
            </p>
            {site.googleReviewsUrl && <GoogleReviewsLink />}
          </div>
        </Container>
      </section>

      <CtaBand />
    </>
  );
}
