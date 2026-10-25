import { Phone } from "lucide-react";
import { ButtonLink } from "@/components/ui/button";
import { Container } from "@/components/ui/container";
import { Heading } from "@/components/ui/heading";
import { getSite } from "@/lib/settings";
import { estimateLabel, quoteHref } from "@/lib/site";
import { ScrollReveal } from "@/components/ScrollReveal";

/** The navy closing call to action at the foot of most pages. */
export async function CtaBand({
  eyebrow = "Start a project",
  title = "Let’s take a look.",
  body = "Tell us what needs attention. We’ll review it and get back to you about the next step.",
}: {
  eyebrow?: string;
  title?: string;
  body?: string;
}) {
  const site = await getSite();
  return (
    <section data-header-theme="dark" className="bg-navy-950 text-stone-50">
      <Container className="grid gap-10 py-20 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-end lg:py-24">
        <ScrollReveal>
          <p className="eyebrow">{eyebrow}</p>
          <Heading level="page" className="mt-4 max-w-[16ch]">
            {title}
          </Heading>
          <p className="mt-5 max-w-[52ch] text-lg text-navy-300">{body}</p>
        </ScrollReveal>
        <ScrollReveal delay={0.1} className="flex flex-col gap-4 sm:flex-row sm:items-center lg:flex-col lg:items-start">
          <ButtonLink href={quoteHref} variant="light" size="lg">
            {estimateLabel}
          </ButtonLink>
          <p className="text-navy-300">
            Prefer to talk?{" "}
            <a href={site.phoneHref} className="inline-flex items-center gap-1.5 font-semibold text-stone-50 underline-offset-4 hover:underline">
              <Phone aria-hidden className="size-4" />
              {site.phone}
            </a>
          </p>
        </ScrollReveal>
      </Container>
    </section>
  );
}
