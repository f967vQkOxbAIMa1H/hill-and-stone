import type { Metadata } from "next";
import { Phone } from "lucide-react";
import { QuoteForm } from "@/components/quote/quote-form";
import { ScrollReveal } from "@/components/ScrollReveal";
import { Container } from "@/components/ui/container";
import { Heading, Lede } from "@/components/ui/heading";
import { getSite } from "@/lib/settings";
import { services } from "@/lib/site";

export async function generateMetadata(): Promise<Metadata> {
  const site = await getSite();
  return {
    title: "Request a quote",
    description: `Tell us about your repair or project and attach photos. Hill & Stone replies within ${site.replyWindow}.`,
  };
}

export default async function RequestQuotePage({ searchParams }: PageProps<"/request-a-quote">) {
  const site = await getSite();
  const { service } = await searchParams;
  const preset = services.find((s) => s.slug === service)?.category;

  return (
    <Container className="grid gap-12 py-14 sm:py-20 lg:grid-cols-[minmax(0,1fr)_320px] lg:gap-16">
      <div className="min-w-0">
        <Heading as="h1" level="page">
          Request a quote
        </Heading>
        <Lede className="mt-5 mb-12">
          Tell us what needs doing and where. Photos help most. We reply within {site.replyWindow} with a price or a time
          to come look.
        </Lede>
        <ScrollReveal className="slate rounded-panel p-5 sm:p-8">
          <QuoteForm defaultCategory={preset} />
        </ScrollReveal>
      </div>

      <aside className="lg:sticky lg:top-28 lg:self-start">
        <ScrollReveal delay={0.1} className="rounded-panel bg-navy-950 p-6 text-stone-50">
          <h2 className="font-semiwide text-lg font-bold">How quoting works</h2>
          <ol className="mt-5 space-y-5">
            {[
              ["You send details", "This form, with photos if you have them."],
              [`We reply within ${site.replyWindow}`, "With a price, questions, or a time for a short visit."],
              ["You get a written quote", "Itemized labor, materials and trip fee. Approve and pay online."],
            ].map(([title, body], i) => (
              <ScrollReveal as="li" key={title} delay={0.25 + i * 0.15} className="grid grid-cols-[2rem_1fr] gap-2">
                <span className="font-wide text-xl leading-tight font-extrabold text-copper-500">{i + 1}</span>
                <span>
                  <span className="block font-semibold">{title}</span>
                  <span className="block text-sm text-navy-300">{body}</span>
                </span>
              </ScrollReveal>
            ))}
          </ol>
          <div className="mt-6 border-t border-navy-800 pt-5">
            <p className="text-sm text-navy-300">Urgent, like an active leak?</p>
            <a href={site.phoneHref} className="mt-1 inline-flex items-center gap-2 text-lg font-bold hover:text-copper-500">
              <Phone aria-hidden className="size-4" />
              {site.phone}
            </a>
          </div>
        </ScrollReveal>
        <p className="mt-4 px-1 text-sm text-navy-600">
          Licensed and insured in Arkansas. {site.warranty} on every job.
        </p>
      </aside>
    </Container>
  );
}
