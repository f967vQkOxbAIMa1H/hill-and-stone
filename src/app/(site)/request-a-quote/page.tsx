import type { Metadata } from "next";
import { Phone } from "lucide-react";
import { QuoteForm } from "@/components/quote/quote-form";
import { ScrollReveal } from "@/components/ScrollReveal";
import { Container } from "@/components/ui/container";
import { Heading, Lede } from "@/components/ui/heading";
import { getSite } from "@/lib/settings";
import { estimateLabel, propertyManagerPrefill, services } from "@/lib/site";

export async function generateMetadata(): Promise<Metadata> {
  const site = await getSite();
  return {
    alternates: { canonical: "/request-a-quote" },
    title: "Request an estimate",
    description: `Tell us about your repair or project and attach photos. Hill & Stone replies within ${site.replyWindow}.`,
  };
}

export default async function RequestQuotePage({ searchParams }: PageProps<"/request-a-quote">) {
  const site = await getSite();
  const { service, type } = await searchParams;
  const preset = services.find((s) => s.slug === service)?.category;
  // From the homepage's property-manager section. Only pre-fills the description; nothing else changes.
  const description = type === "property-manager" ? propertyManagerPrefill : undefined;

  return (
    <Container data-header-theme="light" className="grid gap-12 py-14 sm:py-20 lg:grid-cols-[minmax(0,1fr)_320px] lg:gap-16">
      <div className="min-w-0">
        <Heading as="h1" level="page">
          {estimateLabel}
        </Heading>
        <Lede className="mt-5 mb-12">
          Tell us what needs doing and where. Photos help most. We reply within {site.replyWindow} with a price or a time
          to come look.
        </Lede>
        <ScrollReveal className="slate rounded-panel p-5 sm:p-8">
          <QuoteForm defaultCategory={preset} defaultDescription={description} />
        </ScrollReveal>
      </div>

      <aside className="lg:sticky lg:top-28 lg:self-start">
        <ScrollReveal delay={0.1} className="rounded-panel bg-navy-950 p-6 text-stone-50">
          <h2 className="font-serif text-2xl">How estimates work</h2>
          <ol className="mt-5 space-y-5">
            {[
              ["You send details", "This form, with photos if you have them."],
              [`We reply within ${site.replyWindow}`, "With a price, questions, or a time for a short visit."],
              ["You get a written quote", "Priced for your project and itemized. We don't post rates; every job is quoted on its own."],
              ["You pay when it's done", "Accept the quote online for free. Payment is due on completion, with no deposit."],
            ].map(([title, body], i) => (
              <ScrollReveal as="li" key={title} delay={0.25 + i * 0.15} className="grid grid-cols-[2rem_1fr] gap-2">
                <span className="numeral text-2xl leading-tight text-stone-100">{String(i + 1).padStart(2, "0")}</span>
                <span>
                  <span className="block font-semibold">{title}</span>
                  <span className="block text-sm text-navy-300">{body}</span>
                </span>
              </ScrollReveal>
            ))}
          </ol>
          <div className="mt-6 border-t border-navy-800 pt-5">
            <p className="text-sm text-navy-300">Urgent, like an active leak?</p>
            <a href={site.phoneHref} className="mt-1 inline-flex items-center gap-2 text-lg font-bold hover:text-stone-100">
              <Phone aria-hidden className="size-4" />
              {site.phone}
            </a>
          </div>
        </ScrollReveal>
        {(site.credentialLine || site.warranty) && (
          <p className="mt-4 px-1 text-sm text-navy-600">
            {[site.credentialLine, site.warranty && `${site.warranty[0].toUpperCase()}${site.warranty.slice(1)} on every job.`].filter(Boolean).join(" ")}
          </p>
        )}
      </aside>
    </Container>
  );
}
