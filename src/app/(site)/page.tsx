import type { Metadata } from "next";
import Link from "next/link";
import { Phone } from "lucide-react";
import { HeroHouse } from "@/components/illustrations/hero-house";
import { PortfolioRow } from "@/components/illustrations/portfolio-row";
import { ServiceIllustration } from "@/components/illustrations/service-illustration";
import { CtaBand } from "@/components/site/cta-band";
import { GoogleReviewsLink, Stars } from "@/components/site/review-bits";
import { ButtonLink, buttonVariants } from "@/components/ui/button";
import { Container } from "@/components/ui/container";
import { Heading } from "@/components/ui/heading";
import { PlayOnView } from "@/components/ui/play-on-view";
import { getTestimonials } from "@/lib/content";
import { buildFaq } from "@/lib/faq";
import { getSite } from "@/lib/settings";
import {
  estimateLabel,
  howItWorks,
  promises,
  propertyManagerServices,
  quoteHref,
  serviceAreas,
  services,
} from "@/lib/site";
import { cn } from "@/lib/utils";
import { ScrollReveal } from "@/components/ScrollReveal";

export const metadata: Metadata = { alternates: { canonical: "/" } };

const two = (i: number) => String(i + 1).padStart(2, "0");

export default async function HomePage() {
  const site = await getSite();
  const testimonials = await getTestimonials(3);
  const faq = buildFaq(site).find((g) => g.slug === "general")!;

  return (
    <>
      {/* Hero. No photos yet, so a drawing does the showing: a house set right, start to finish. */}
      <section data-header-theme="light" className="overflow-hidden">
        <Container className="grid items-center gap-10 pt-12 pb-16 sm:pt-16 lg:grid-cols-[minmax(0,6fr)_minmax(0,5fr)] lg:gap-16 lg:py-24">
          <div>
            <p className="eyebrow">Northwest Arkansas · Home Solutions</p>
            <Heading as="h1" level="display" className="mt-5 lg:text-[4.25rem]">
              Thoughtful repairs.
              <br />
              <em>Properly finished.</em>
            </Heading>
            <p className="mt-6 max-w-[46ch] text-lg leading-relaxed text-navy-700 sm:text-xl">
              Reliable home improvement and repair services for homeowners, landlords, and property managers who expect the
              job to be done right.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <ButtonLink href={quoteHref} size="lg">
                {estimateLabel}
              </ButtonLink>
              <a href={site.phoneHref} className={buttonVariants({ variant: "outline", size: "lg" })}>
                <Phone aria-hidden />
                Call {site.name}
              </a>
            </div>
            <p className="mt-6 max-w-[48ch] text-sm text-navy-600">
              Serving Fayetteville, Springdale, Rogers, Bentonville &amp; surrounding Northwest Arkansas.
            </p>
          </div>

          <figure className="rounded-panel border border-navy-200 bg-white p-5 sm:p-10">
            <HeroHouse className="w-full" />
          </figure>
        </Container>
      </section>

      {/* The standard, and the four promises behind it. */}
      <section data-header-theme="dark" aria-labelledby="standard-heading" className="bg-navy-950 text-stone-50">
        <Container className="grid gap-12 py-20 lg:grid-cols-[minmax(0,6fr)_minmax(0,5fr)] lg:gap-16 lg:py-24">
          <div>
            <p className="eyebrow" id="standard-heading">
              The Hill &amp; Stone Standard
            </p>
            <p className="mt-5 max-w-[20ch] font-serif text-4xl leading-[1.1] text-pretty sm:text-5xl">
              Clean work. Clear communication. <em>Dependable follow-through.</em>
            </p>
            <p className="mt-6 text-navy-300">Built for the home. Designed to last.</p>
          </div>
          <ol className="self-end border-t border-navy-800">
            {promises.map((p, i) => (
              <li key={p} className="flex items-baseline gap-6 border-b border-navy-800 py-5">
                <span className="numeral w-8 text-xl text-stone-100">{two(i)}</span>
                <span className="text-lg font-medium">{p}</span>
              </li>
            ))}
          </ol>
        </Container>
      </section>

      {/* What we do */}
      <section data-header-theme="light" aria-labelledby="services-heading">
        <Container className="py-20 lg:py-24">
          <div className="grid gap-6 lg:grid-cols-[minmax(0,6fr)_minmax(0,5fr)] lg:items-end lg:gap-16">
            <div>
              <p className="eyebrow">What we do</p>
              <Heading id="services-heading" className="mt-4 max-w-[20ch]">
                One company for the work your home keeps asking for.
              </Heading>
            </div>
            <p className="max-w-[52ch] text-lg leading-relaxed text-navy-700">
              From the small repair you’ve been putting off to recurring property maintenance, we bring a practical, polished
              approach to the details that keep a property looking and functioning its best.
            </p>
          </div>

          <ul className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {services.map((s, i) => (
              <ScrollReveal as="li" key={s.slug} delay={(i % 4) * 0.06}>
                <Link
                  href={`/services#${s.slug}`}
                  className="group flex h-full flex-col rounded-panel border border-navy-200 bg-white p-6 transition-colors hover:border-navy-950"
                >
                  <span className="numeral text-lg text-navy-600">{two(i)}</span>
                  <ServiceIllustration category={s.category} replayFrom="a" className="mx-auto mt-2 aspect-[3/2] w-full max-w-64" />
                  <h3 className="mt-4 font-serif text-2xl leading-tight group-hover:text-accent-700">{s.name}</h3>
                  <p className="mt-3 text-navy-700">{s.summary}</p>
                </Link>
              </ScrollReveal>
            ))}
          </ul>
          <Link href="/services" className="mt-8 inline-block font-semibold text-accent-700 underline-offset-4 hover:underline">
            See everything we take on
          </Link>
        </Container>
      </section>

      {/* Property managers and landlords */}
      <section data-header-theme="dark" aria-labelledby="pm-heading" className="bg-navy-950 text-stone-50">
        <Container className="grid gap-12 py-20 lg:grid-cols-2 lg:gap-16 lg:py-24">
          <div>
            <p className="eyebrow">For Property Managers &amp; Landlords</p>
            <Heading id="pm-heading" className="mt-4 max-w-[16ch]">
              A repair partner across your portfolio.
            </Heading>
            <p className="mt-6 max-w-[54ch] text-lg leading-relaxed text-navy-300">
              When you manage dozens or hundreds of doors, small repairs become an operational problem. Hill &amp; Stone is
              built to make that problem easier: responsive communication, clear scopes, organized work and a consistent
              standard from property to property.
            </p>
            <ButtonLink href={`${quoteHref}?type=property-manager`} variant="light" size="lg" className="mt-8">
              Talk with us about your properties
            </ButtonLink>
          </div>
          <div className="flex flex-col gap-10">
            <PlayOnView>
              <PortfolioRow className="w-full max-w-md" />
            </PlayOnView>
            <ul className="border-t border-navy-800">
              {propertyManagerServices.map((item) => (
                <li key={item} className="flex items-center gap-4 border-b border-navy-800 py-4 text-lg">
                  <span aria-hidden className="size-1.5 shrink-0 bg-stone-100" />
                  {item}
                </li>
              ))}
            </ul>
          </div>
        </Container>
      </section>

      {/* How it works: a real sequence, so it is numbered, and a line runs through the steps. */}
      <section data-header-theme="light" aria-labelledby="how-heading" className="bg-white">
        <Container className="py-20 lg:py-24">
          <p className="eyebrow">How it works</p>
          <Heading id="how-heading" className="mt-4">
            Four steps, <em>no loose ends.</em>
          </Heading>
          <PlayOnView className="relative mt-12 h-px">
            <div className="ill-wipe absolute top-[1.15rem] right-0 left-0 hidden h-px bg-navy-200 lg:block" style={{ "--dur": "1100ms" } as React.CSSProperties} />
          </PlayOnView>
          <ol className="-mt-px grid gap-10 sm:grid-cols-2 lg:grid-cols-4 lg:gap-8">
            {howItWorks.map((step, i) => (
              <li key={step.title} className="relative">
                <span className="numeral relative inline-block bg-white pr-4 text-3xl text-accent-700">{two(i)}</span>
                <h3 className="mt-4 font-serif text-2xl leading-tight">{step.title}</h3>
                <p className="mt-2 max-w-[32ch] text-navy-700">{step.body}</p>
              </li>
            ))}
          </ol>
        </Container>
      </section>

      {/* Sand band */}
      <section data-header-theme="light" className="bg-stone-100">
        <Container className="py-20 lg:py-24">
          <p className="max-w-[30ch] font-serif text-3xl leading-[1.2] text-balance sm:text-4xl lg:text-[2.75rem]">
            Homeowners and property managers deserve a repair partner they can trust to communicate well, show up prepared and
            take pride in the finished work.
          </p>
        </Container>
      </section>

      {/* Story teaser */}
      <section data-header-theme="light" aria-labelledby="story-heading">
        <Container className="grid gap-10 py-20 lg:grid-cols-[minmax(0,5fr)_minmax(0,6fr)] lg:gap-16 lg:py-24">
          <div>
            <p className="eyebrow">Our story</p>
            <Heading id="story-heading" className="mt-4 max-w-[14ch]">
              Two founders from Mountain Home.
            </Heading>
          </div>
          <div className="max-w-[60ch]">
            <p className="text-lg leading-relaxed text-navy-700">
              Hill &amp; Stone Home was founded by Aidan Sanders and Tucker Davidson, two entrepreneurs from Mountain Home,
              Arkansas, who share a passion for building businesses—and building things the right way.
            </p>
            <blockquote className="mt-8 border-l-2 border-navy-950 pl-6 font-serif text-2xl leading-snug italic sm:text-3xl">
              Your home should be treated like it’s our own.
            </blockquote>
            <Link href="/about" className="mt-8 inline-block font-semibold text-accent-700 underline-offset-4 hover:underline">
              Read our story
            </Link>
          </div>
        </Container>
      </section>

      {/* Service area */}
      <section data-header-theme="light" aria-labelledby="areas-heading" className="border-t border-navy-200">
        <Container className="py-20 lg:py-24">
          <p className="eyebrow">Service area</p>
          <Heading id="areas-heading" className="mt-4">
            Northwest Arkansas, <em>close to home.</em>
          </Heading>
          <ul className="mt-10 flex max-w-4xl flex-wrap gap-2.5">
            {serviceAreas.map((a) => (
              <li key={a.slug}>
                <Link
                  href={`/service-areas#${a.slug}`}
                  className="inline-block rounded-control border border-navy-600/40 px-3.5 py-1.5 transition-colors hover:border-navy-950 hover:bg-white"
                >
                  {a.name}
                </Link>
              </li>
            ))}
            <li>
              <Link
                href="/service-areas"
                className="inline-block rounded-control border border-navy-950 px-3.5 py-1.5 font-semibold transition-colors hover:bg-navy-950 hover:text-stone-50"
              >
                Surrounding NWA
              </Link>
            </li>
          </ul>
          <Link href="/service-areas" className="mt-8 inline-block font-semibold text-accent-700 underline-offset-4 hover:underline">
            See the map and check your ZIP code
          </Link>
        </Container>
      </section>

      {/* Common questions */}
      <section data-header-theme="light" aria-labelledby="faq-heading" className="bg-white">
        <Container className="grid gap-10 py-20 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] lg:gap-16 lg:py-24">
          <div>
            <p className="eyebrow">Questions</p>
            <Heading id="faq-heading" className="mt-4 max-w-[12ch]">
              Before you ask.
            </Heading>
            <Link href="/faq" className="mt-6 inline-block font-semibold text-accent-700 underline-offset-4 hover:underline">
              All questions and answers
            </Link>
          </div>
          <div className="border-t border-navy-200">
            {faq.items.map((item) => (
              <details key={item.q} name="home-faq" className="faq-item group border-b border-navy-200">
                <summary className="flex cursor-pointer list-none items-start justify-between gap-6 py-5 text-lg font-semibold hover:text-accent-700 [&::-webkit-details-marker]:hidden">
                  {item.q}
                  <span
                    aria-hidden
                    className="relative mt-1.5 size-4 shrink-0 before:absolute before:top-1/2 before:left-0 before:h-0.5 before:w-4 before:-translate-y-1/2 before:bg-current after:absolute after:top-0 after:left-1/2 after:h-4 after:w-0.5 after:-translate-x-1/2 after:bg-current after:transition-transform after:duration-200 group-open:after:scale-y-0"
                  />
                </summary>
                <p className="max-w-[64ch] pb-6 text-navy-700">{item.a}</p>
              </details>
            ))}
          </div>
        </Container>
      </section>

      {/* Reviews: only once real ones are published. */}
      {testimonials.length > 0 && (
        <section data-header-theme="light" id="reviews" aria-labelledby="reviews-heading" className="scroll-mt-20 border-t border-navy-200">
          <Container className="py-20 lg:py-24">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <p className="eyebrow">Reviews</p>
                <Heading id="reviews-heading" className="mt-4">
                  From our customers
                </Heading>
              </div>
              <div className="flex flex-wrap gap-3">
                <GoogleReviewsLink />
                <Link href="/reviews" className="inline-flex items-center rounded-control px-2 py-2.5 font-semibold text-accent-700 underline-offset-4 hover:underline">
                  See all reviews
                </Link>
              </div>
            </div>
            <div className="mt-12 grid gap-10 lg:grid-cols-3">
              {testimonials.map((t, i) => (
                <ScrollReveal as="figure" key={t.id} delay={i * 0.06} className={cn(i > 0 && "border-t border-navy-200 pt-8 lg:border-t-0 lg:pt-0")}>
                  <Stars rating={t.rating} />
                  <blockquote className="mt-4 font-serif text-xl leading-snug">
                    <p>&ldquo;{t.body}&rdquo;</p>
                  </blockquote>
                  <figcaption className="mt-4 text-navy-600">
                    <span className="font-semibold text-navy-950">{t.authorName}</span>, {t.city}
                  </figcaption>
                </ScrollReveal>
              ))}
            </div>
          </Container>
        </section>
      )}

      <CtaBand />
    </>
  );
}
