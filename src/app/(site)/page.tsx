import Link from "next/link";
import { Phone } from "lucide-react";
import { BrandPanel } from "@/components/brand/brand-panel";
import { CtaBand } from "@/components/site/cta-band";
import { GoogleReviewsLink, Stars } from "@/components/site/review-bits";
import { TrustList } from "@/components/site/trust-list";
import { BeforeAfter } from "@/components/ui/before-after";
import { ButtonLink, buttonVariants } from "@/components/ui/button";
import { Container } from "@/components/ui/container";
import { Heading, Lede } from "@/components/ui/heading";
import { getProjects, getTestimonials } from "@/lib/content";
import { projectMedia } from "@/lib/media";
import { getSite } from "@/lib/settings";
import { quoteHref, serviceAreas, services } from "@/lib/site";
import { cn } from "@/lib/utils";
import { ScrollReveal } from "@/components/ScrollReveal";

export default async function HomePage() {
  const site = await getSite();
  const [testimonials, projects] = await Promise.all([getTestimonials(3), getProjects()]);
  // Hero shows the first featured project that has a before/after pair.
  const hero = projects
    .map((p) => ({ ...p, media: projectMedia(p.images) }))
    .find((p): p is typeof p & { media: Extract<ReturnType<typeof projectMedia>, { kind: "pair" }> } => p.media.kind === "pair");
  const core = serviceAreas.filter((a) => a.core);
  const nearby = serviceAreas.filter((a) => !a.core);

  return (
    <>
      {/* Hero: the work itself is the proof. */}
      <section className="overflow-hidden">
        <Container className="grid items-center gap-10 py-12 sm:py-16 lg:grid-cols-[minmax(0,5fr)_minmax(0,6fr)] lg:gap-14 lg:py-20">
          <div>
            <Heading as="h1" level="display" className="max-w-[13ch] lg:text-[4rem]">
              Reliable NWA home repairs, done right.
            </Heading>
            <Lede className="mt-6">
              Carpentry, drywall, doors, trim and exterior repair for homes in Bentonville, Rogers, Springdale and
              Fayetteville. One crew, a clear written price, and work you won&apos;t have to redo.
            </Lede>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <ButtonLink href={quoteHref} size="lg">
                Request a quote
              </ButtonLink>
              <a href={site.phoneHref} className={buttonVariants({ variant: "outline", size: "lg" })}>
                <Phone aria-hidden />
                {site.phone}
              </a>
            </div>
            <p className="mt-6 text-sm text-navy-600">
              Licensed and insured in Arkansas. {site.warranty} on every job.
            </p>
          </div>

          <figure className="lg:-mr-8 xl:-mr-16">
            {hero ? (
              <>
                <BeforeAfter intro priority sizes="(min-width: 1024px) 55vw, 100vw" before={hero.media.before} after={hero.media.after} />
                <figcaption className="mt-3 flex flex-wrap justify-between gap-x-4 text-sm text-navy-600">
                  <Link href={`/our-work?project=${hero.slug}`} className="hover:text-navy-950">
                    <span className="font-semibold text-navy-950">{hero.title},</span> {hero.city}
                  </Link>
                  {hero.durationDays && (
                    <span>
                      {hero.durationDays} {hero.durationDays === 1 ? "day" : "days"} on site
                    </span>
                  )}
                </figcaption>
              </>
            ) : (
              // No before/after photos published yet: a brand graphic holds the space.
              <BrandPanel className="aspect-[4/3] rounded-photo" />
            )}
          </figure>
        </Container>
      </section>

      {/* Service area banner */}
      <section aria-labelledby="areas-heading" className="bg-navy-950 text-stone-50">
        <Container className="py-12 lg:py-14">
          <h2 id="areas-heading" className="text-navy-300">
            Based in Northwest Arkansas, working across Benton and Washington counties
          </h2>
          <ul className="mt-4 flex flex-wrap gap-x-8 gap-y-1">
            {core.map((a, i) => (
              <ScrollReveal as="li" key={a.slug} delay={i * 0.1}>
                <Link
                  href={`/service-areas#${a.slug}`}
                  className="font-wide text-3xl font-extrabold tracking-[-0.01em] transition-colors hover:text-copper-500 sm:text-4xl"
                >
                  {a.name}
                </Link>
              </ScrollReveal>
            ))}
          </ul>
          <p className="mt-6 max-w-[80ch] text-navy-300">
            Also {nearby.map((a) => a.name).join(", ")}.{" "}
            <Link href="/service-areas" className="font-semibold text-copper-500 underline-offset-4 hover:underline">
              Check your ZIP code
            </Link>
          </p>
        </Container>
      </section>

      {/* Services */}
      <section aria-labelledby="services-heading">
        <Container className="py-20 lg:py-24">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <Heading id="services-heading">What we take on</Heading>
              <Lede className="mt-4">
                Repairs and small projects that are too much for a weekend and too small for a general contractor.
              </Lede>
            </div>
            <Link href="/services" className="shrink-0 font-semibold text-copper-700 underline-offset-4 hover:underline">
              See the full scope of each service
            </Link>
          </div>

          {/* Shared hairlines instead of floating cards: reads like a spec sheet. It rises as one piece, since
              cells fading on their own would expose the grey hairline backing. */}
          <ScrollReveal>
            <ul className="mt-12 grid gap-px overflow-hidden rounded-panel border border-navy-200 bg-navy-200 sm:grid-cols-2 lg:grid-cols-3">
              {services.map((s) => (
                <li key={s.slug} className="bg-stone-50">
                  <Link
                    href={`/services#${s.slug}`}
                    className="group flex h-full flex-col p-7 transition-colors hover:bg-white focus-visible:-outline-offset-2"
                  >
                    <h3 className="text-xl font-bold group-hover:text-copper-700">{s.name}</h3>
                    <p className="mt-2 mb-5 text-navy-600">{s.summary}</p>
                    <ul className="mt-auto space-y-1 border-t border-navy-200 pt-4 text-sm text-navy-700">
                      {s.weDo.slice(0, 3).map((item) => (
                        <li key={item}>{item}</li>
                      ))}
                    </ul>
                  </Link>
                </li>
              ))}
            </ul>
          </ScrollReveal>
        </Container>
      </section>

      {/* Trust */}
      <section aria-labelledby="trust-heading" className="bg-stone-100">
        <Container className="grid gap-10 py-20 lg:grid-cols-[minmax(0,1fr)_minmax(0,2fr)] lg:py-24">
          <div>
            <Heading id="trust-heading" className="max-w-[12ch]">
              What you can count on
            </Heading>
            <Lede className="mt-4">
              You&apos;re letting someone into your house. Here&apos;s exactly who shows up and what backs the work.
            </Lede>
          </div>
          <TrustList />
        </Container>
      </section>

      {/* Reviews */}
      <section id="reviews" aria-labelledby="reviews-heading" className="scroll-mt-20">
        <Container className="py-20 lg:py-24">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <Heading id="reviews-heading">From our customers</Heading>
            <div className="flex flex-wrap gap-3">
              <GoogleReviewsLink />
              <Link href="/reviews" className="inline-flex items-center rounded-control px-2 py-2.5 font-semibold text-copper-700 underline-offset-4 hover:underline">
                See all reviews
              </Link>
            </div>
          </div>

          {testimonials.length > 0 ? (
            <div className="mt-12 grid gap-10 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
              {testimonials.map((t, i) => (
                <ScrollReveal
                  as="figure"
                  key={t.id}
                  delay={i * 0.15}
                  className={cn(
                    i === 0 && "lg:row-span-2 lg:border-r lg:border-navy-200 lg:pr-10",
                    i === 1 && "border-t border-navy-200 pt-8 lg:border-t-0 lg:pt-0",
                    i === 2 && "border-t border-navy-200 pt-8",
                  )}
                >
                  <Stars rating={t.rating} />
                  <blockquote
                    className={cn(
                      "mt-4",
                      i === 0 ? "font-semiwide text-2xl leading-snug font-semibold sm:text-3xl sm:leading-tight" : "text-lg",
                    )}
                  >
                    <p>&ldquo;{t.body}&rdquo;</p>
                  </blockquote>
                  <figcaption className="mt-4 text-navy-600">
                    <span className="font-semibold text-navy-950">{t.authorName}</span>, {t.city}
                  </figcaption>
                </ScrollReveal>
              ))}
            </div>
          ) : (
            <p className="mt-10 max-w-[60ch] text-lg text-navy-600">
              Reviews from recent jobs are on our Google profile.
            </p>
          )}
        </Container>
      </section>

      <CtaBand />
    </>
  );
}
