import type { Metadata } from "next";
import { CtaBand } from "@/components/site/cta-band";
import { FounderPortraits } from "@/components/site/founders";
import { PageIntro } from "@/components/site/page-intro";
import { TrustList } from "@/components/site/trust-list";
import { Container } from "@/components/ui/container";
import { Heading } from "@/components/ui/heading";
import { getSite } from "@/lib/settings";
import { storyParagraphs } from "@/lib/story";

export const metadata: Metadata = {
  title: "About",
  description:
    "Hill & Stone is a Northwest Arkansas home repair company built on clear pricing, careful work and showing up when we say we will.",
};

// Story facts come from the admin site settings; founder photos from `brand.photos` in src/lib/site.ts.
const values = [
  {
    title: "Show up when we said",
    body: "We give you an arrival window and keep it. If something changes, you hear from us before the window starts, not after it ends.",
  },
  {
    title: "Price it in writing first",
    body: "You get an itemized quote with labor, materials and trip fee broken out. If the scope changes once walls are open, we stop and re-quote before going further.",
  },
  {
    title: "Leave it cleaner than we found it",
    body: "Drop cloths down, dust contained, debris hauled off. The last thing we do on every job is sweep.",
  },
  {
    title: "Fix the cause, not just the symptom",
    body: "A stained ceiling is usually a leak somewhere else. We'll tell you what we see, even when it isn't the job you called about.",
  },
];

export default async function AboutPage() {
  const site = await getSite();
  return (
    <>
      <PageIntro
        title="Built in Northwest Arkansas"
        lede="Hill & Stone is a small, local crew that does home repair the way we'd want it done in our own houses: priced up front, done carefully, and backed by a warranty."
      />

      {/* Story */}
      <section aria-labelledby="story-heading">
        <Container className="grid gap-12 py-20 lg:grid-cols-[minmax(0,6fr)_minmax(0,5fr)] lg:gap-16 lg:py-24">
          <div className="max-w-[64ch]">
            <Heading id="story-heading">Our story</Heading>
            <div className="mt-6 space-y-5 text-lg leading-relaxed text-navy-700">
              {storyParagraphs(site.story).map((p) => (
                <p key={p}>{p}</p>
              ))}
            </div>
          </div>

          <FounderPortraits site={site} className="self-start" />
        </Container>
      </section>

      {/* Values */}
      <section aria-labelledby="values-heading" className="bg-navy-950 text-stone-50">
        <Container className="py-20 lg:py-24">
          <Heading id="values-heading" className="max-w-[18ch]">
            How we work
          </Heading>
          <dl className="mt-12 grid gap-x-12 gap-y-10 md:grid-cols-2">
            {values.map((v) => (
              <div key={v.title} className="border-t border-navy-800 pt-6">
                <dt className="font-semiwide text-xl font-bold">{v.title}</dt>
                <dd className="mt-2 max-w-[52ch] text-navy-300">{v.body}</dd>
              </div>
            ))}
          </dl>
        </Container>
      </section>

      {/* Trust */}
      <section aria-labelledby="standards-heading" className="bg-stone-100">
        <Container className="grid gap-10 py-20 lg:grid-cols-[minmax(0,1fr)_minmax(0,2fr)] lg:py-24">
          <div>
            <Heading id="standards-heading" className="max-w-[12ch]">
              Our standards, in writing
            </Heading>
            <p className="mt-4 max-w-[40ch] text-lg text-navy-600">
              Ask for proof of any of these and we&apos;ll send it before your first visit.
            </p>
          </div>
          <TrustList />
        </Container>
      </section>

      <CtaBand />
    </>
  );
}

