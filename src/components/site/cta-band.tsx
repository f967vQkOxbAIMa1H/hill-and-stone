import { Phone } from "lucide-react";
import { buttonVariants, ButtonLink } from "@/components/ui/button";
import { Container } from "@/components/ui/container";
import { Heading } from "@/components/ui/heading";
import { quoteHref, site } from "@/lib/site";

export function CtaBand({
  title = "Tell us what needs fixing.",
  body = `Send a few photos and a short description. We reply within ${site.replyWindow} with next steps, and most small jobs get a price without a site visit.`,
}: {
  title?: string;
  body?: string;
}) {
  return (
    <section className="bg-navy-950 text-stone-50">
      <Container className="grid gap-8 py-20 lg:grid-cols-[1fr_auto] lg:items-end">
        <div>
          <Heading level="page" className="max-w-[16ch]">
            {title}
          </Heading>
          <p className="mt-5 max-w-[56ch] text-lg text-navy-300">{body}</p>
        </div>
        <div className="flex flex-col gap-3 sm:flex-row">
          <ButtonLink href={quoteHref} size="lg">
            Request a quote
          </ButtonLink>
          <a href={site.phoneHref} className={buttonVariants({ variant: "outline-light", size: "lg" })}>
            <Phone aria-hidden />
            {site.phone}
          </a>
        </div>
      </Container>
    </section>
  );
}
