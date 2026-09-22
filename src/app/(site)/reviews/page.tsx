import type { Metadata } from "next";
import Link from "next/link";
import { CtaBand } from "@/components/site/cta-band";
import { GoogleG, GoogleReviewsLink, Stars } from "@/components/site/review-bits";
import { Container } from "@/components/ui/container";
import { Heading, Lede } from "@/components/ui/heading";
import { getTestimonials } from "@/lib/content";
import { site } from "@/lib/site";

export const revalidate = 3600;

export const metadata: Metadata = {
  title: "Reviews",
  description: "What Northwest Arkansas homeowners say about Hill & Stone repairs, carpentry, painting and small renovations.",
};

const dateFmt = new Intl.DateTimeFormat("en-US", { month: "long", year: "numeric", timeZone: "America/Chicago" });

export default async function ReviewsPage() {
  const reviews = await getTestimonials();

  return (
    <>
      <section className="border-b border-navy-200">
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
          <div className="rounded-panel border border-navy-200 bg-white p-6">
            <div className="flex items-center gap-3">
              <GoogleG className="size-8" />
              <p className="font-semiwide text-lg leading-tight font-bold">Our Google reviews</p>
            </div>
            <p className="mt-3 text-navy-600">Read every review, or leave one after your job. It helps neighbors find a contractor they can trust.</p>
            <GoogleReviewsLink className="mt-5 w-full justify-center" />
          </div>
        </Container>
      </section>

      <Container className="py-16 lg:py-20">
        {reviews.length === 0 ? (
          <div className="max-w-xl">
            <p className="text-lg font-bold">Reviews are on our Google profile.</p>
            <p className="mt-2 text-navy-600">We&apos;re moving them onto this page. Until then, read them on Google.</p>
          </div>
        ) : (
          // CSS columns give a wall where short and long reviews pack together.
          <ul className="gap-8 sm:columns-2 lg:columns-3">
            {reviews.map((r) => (
              <li key={r.id} className="mb-8 break-inside-avoid rounded-panel border border-navy-200 bg-white p-6">
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
                        className="mt-2 block font-semibold text-copper-700 underline-offset-4 hover:underline"
                      >
                        See the project: {r.project.title}
                      </Link>
                    )}
                  </figcaption>
                </figure>
              </li>
            ))}
          </ul>
        )}
        <p className="mt-4 text-sm text-navy-600">
          Reviews are shared with permission. To leave one, use the Google link above or reply to your final invoice email from{" "}
          {site.email}.
        </p>
      </Container>

      <CtaBand />
    </>
  );
}
