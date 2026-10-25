import type { Metadata } from "next";
import Link from "next/link";
import { CtaBand } from "@/components/site/cta-band";
import { PageIntro } from "@/components/site/page-intro";
import { Container } from "@/components/ui/container";
import { buildFaq } from "@/lib/faq";
import { getSite } from "@/lib/settings";

export const metadata: Metadata = {
  title: "Questions and answers",
  description:
    "Answers about Hill & Stone pricing, free estimates, scheduling, urgent repairs, payment on completion, payment options, materials and our workmanship warranty.",
};


export default async function FaqPage() {
  const faq = buildFaq(await getSite());
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faq.flatMap((g) =>
      g.items.map((i) => ({ "@type": "Question", name: i.q, acceptedAnswer: { "@type": "Answer", text: i.a } })),
    ),
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }}
      />
      <PageIntro
        title="Questions and answers"
        lede="Straight answers about pricing, scheduling, payment and our warranty. Don't see yours? Ask when you request a quote."
      />

      <Container className="grid gap-10 py-14 lg:grid-cols-[220px_minmax(0,1fr)] lg:gap-14 lg:py-20">
        <nav aria-label="Topics" className="lg:sticky lg:top-28 lg:self-start">
          <h2 className="text-sm font-semibold text-navy-600">Topics</h2>
          <ul className="mt-3 flex flex-wrap gap-2 lg:flex-col lg:gap-0">
            {faq.map((g) => (
              <li key={g.slug}>
                <Link
                  href={`#${g.slug}`}
                  className="block rounded-control border border-navy-200 px-3 py-1.5 text-sm hover:border-navy-950 lg:rounded-none lg:border-0 lg:border-l-2 lg:border-navy-200 lg:py-2 lg:pl-4 lg:text-base lg:hover:border-accent-500"
                >
                  {g.title}
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        <div className="flex max-w-3xl flex-col gap-14">
          {faq.map((g) => (
            <section key={g.slug} id={g.slug} aria-labelledby={`${g.slug}-heading`} className="scroll-mt-28">
              <h2 id={`${g.slug}-heading`} className="font-serif text-3xl">
                {g.title}
              </h2>
              <div className="mt-5 border-t border-navy-200">
                {g.items.map((item) => (
                  // Native disclosure: keyboard, screen readers and find-in-page work without JS.
                  <details key={item.q} name={g.slug} className="faq-item group border-b border-navy-200">
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
            </section>
          ))}
        </div>
      </Container>

      <CtaBand title="Still have a question?" body="Ask it in your quote request, or call us. You'll get an answer from the person who'd do the work." />
    </>
  );
}
