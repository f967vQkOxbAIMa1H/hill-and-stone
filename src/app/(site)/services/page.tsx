import type { Metadata } from "next";
import Link from "next/link";
import { CtaBand } from "@/components/site/cta-band";
import { PageIntro } from "@/components/site/page-intro";
import { ScopeSheet } from "@/components/site/scope-sheet";
import { ScrollReveal } from "@/components/ScrollReveal";
import { Container } from "@/components/ui/container";
import { getSite } from "@/lib/settings";
import { services } from "@/lib/site";

export const metadata: Metadata = {
  title: "Services",
  description:
    "Home repairs, carpentry, drywall and painting, flooring and fixtures, exterior repair and small renovations in Northwest Arkansas. See what we do and what we don't take on.",
};

export default async function ServicesPage() {
  const site = await getSite();
  return (
    <>
      <PageIntro
        title="Services"
        lede="Every service below lists what we do and what we don't take on, so you know before you call. If your job isn't on either list, ask. We'll tell you straight, and point you to someone good if it isn't us."
      />

      <Container className="grid gap-10 py-16 lg:grid-cols-[220px_minmax(0,1fr)] lg:gap-14 lg:py-20">
        <nav aria-label="Services on this page" className="lg:sticky lg:top-28 lg:self-start">
          <h2 className="text-sm font-semibold text-navy-600">On this page</h2>
          <ul className="mt-3 flex flex-wrap gap-2 lg:flex-col lg:gap-0">
            {services.map((s) => (
              <li key={s.slug}>
                <Link
                  href={`#${s.slug}`}
                  className="block rounded-control border border-navy-200 px-3 py-1.5 text-sm hover:border-navy-950 lg:rounded-none lg:border-0 lg:border-l-2 lg:border-navy-200 lg:py-2 lg:pl-4 lg:text-base lg:hover:border-copper-500"
                >
                  {s.name}
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        <div className="flex flex-col gap-8">
          {/* Sheets stack, so each rises as it scrolls in; only the two in view on arrival are staggered. */}
          {services.map((s, i) => (
            <ScopeSheet key={s.slug} service={s} headingAs="h2" delay={i < 2 ? i * 0.15 : 0} />
          ))}

          <ScrollReveal as="aside" className="rounded-panel border border-dashed border-navy-300 p-6 sm:p-8">
            <h2 className="text-xl font-bold">Not sure where your job fits?</h2>
            <p className="mt-2 max-w-[60ch] text-navy-600">
              Send us photos through the quote form, or call{" "}
              <a href={site.phoneHref} className="font-semibold text-copper-700 underline-offset-4 hover:underline">
                {site.phone}
              </a>
              . Plenty of jobs are a mix of two or three of these.
            </p>
          </ScrollReveal>
        </div>
      </Container>

      <CtaBand />
    </>
  );
}
