import type { Metadata } from "next";
import { CtaBand } from "@/components/site/cta-band";
import { FounderPortraits } from "@/components/site/founders";
import { PageIntro } from "@/components/site/page-intro";
import { TrustList } from "@/components/site/trust-list";
import { Container } from "@/components/ui/container";
import { Heading } from "@/components/ui/heading";
import { getSite } from "@/lib/settings";
import { storyHeadline, storyParagraphs, storySignoff, storyTagline } from "@/lib/story";

export const metadata: Metadata = {
  title: "About",
  description:
    "Hill & Stone Home Solutions was founded by Aidan Sanders and Tucker Davidson, two entrepreneurs from Mountain Home, Arkansas, building a Northwest Arkansas home repair company the right way.",
  alternates: { canonical: "/about" },
};

// Story copy lives in src/lib/story.ts; founder names and photos in `brand` (src/lib/site.ts).
const values = [
  {
    title: "Show up when we said",
    body: "We give you an arrival window and keep it. If something changes, you hear from us before the window starts, not after it ends.",
  },
  {
    title: "Price it in writing first",
    body: "You get an itemized quote with labor and materials broken out. If the scope changes once walls are open, we stop and re-quote before going further.",
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
  const [headLead, headRest] = storyHeadline.split(/(?<=\.) /);
  // The paragraph that states the standard is set as a pull line; the rest read as body copy.
  const standard = storyParagraphs.findIndex((p) => p.startsWith("Together"));
  return (
    <>
      <PageIntro
        title="Our story"
        lede="Two founders from Mountain Home, Arkansas, building a home repair company that does the work the right way."
      />

      {/* Story */}
      <section data-header-theme="light" aria-labelledby="story-heading">
        <Container className="grid gap-12 py-20 lg:grid-cols-[minmax(0,6fr)_minmax(0,5fr)] lg:gap-16 lg:py-24">
          <div className="max-w-[64ch]">
            <Heading id="story-heading">
              {headLead} <em>{headRest}</em>
            </Heading>
            <div className="mt-8 space-y-5 text-lg leading-relaxed text-navy-700">
              {storyParagraphs.map((p, i) =>
                i === standard ? (
                  <p key={p} className="border-l-2 border-navy-950 py-1 pl-6 font-serif text-2xl leading-snug text-navy-950 italic">
                    {p}
                  </p>
                ) : (
                  <p key={p}>{p}</p>
                ),
              )}
            </div>
          </div>

          <FounderPortraits site={site} className="self-start lg:sticky lg:top-28" />
        </Container>
      </section>

      {/* The About-page tagline */}
      <section data-header-theme="dark" aria-label="Our standard" className="bg-navy-950 text-stone-50">
        <Container className="py-20 lg:py-24">
          <p className="max-w-[22ch] font-serif text-4xl leading-[1.1] text-balance sm:text-5xl">{storyTagline}</p>
          <p className="mt-6 text-lg text-navy-300">{storySignoff}</p>
        </Container>
      </section>

      {/* Values */}
      <section data-header-theme="light" aria-labelledby="values-heading">
        <Container className="py-20 lg:py-24">
          <Heading id="values-heading" className="max-w-[18ch]">
            How we work
          </Heading>
          <dl className="mt-12 grid gap-x-12 gap-y-10 md:grid-cols-2">
            {values.map((v) => (
              <div key={v.title} className="border-t border-navy-200 pt-6">
                <dt className="font-serif text-2xl">{v.title}</dt>
                <dd className="mt-2 max-w-[52ch] text-navy-600">{v.body}</dd>
              </div>
            ))}
          </dl>
        </Container>
      </section>

      {/* Trust: only the claims the owner has turned on in settings. */}
      {site.hasTrustClaims && (
        <section data-header-theme="light" aria-labelledby="standards-heading" className="bg-stone-100">
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
      )}

      <CtaBand />
    </>
  );
}
