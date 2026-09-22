import type { Metadata } from "next";
import { CtaBand } from "@/components/site/cta-band";
import { PageIntro } from "@/components/site/page-intro";
import { TrustList } from "@/components/site/trust-list";
import { Container } from "@/components/ui/container";
import { Heading } from "@/components/ui/heading";

export const metadata: Metadata = {
  title: "About",
  description:
    "Hill & Stone is a Northwest Arkansas home repair company built on clear pricing, careful work and showing up when we say we will.",
};

// TODO(owner): replace every [bracketed] detail with the real story before launch.
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

export default function AboutPage() {
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
            <Heading id="story-heading">How we started</Heading>
            <div className="mt-6 space-y-5 text-lg leading-relaxed text-navy-700">
              <p>
                [Founder name] grew up in [hometown], working summers on job sites across Benton and Washington
                counties. After [number] years in [trade or previous role], [he/she/they] kept hearing the same thing
                from neighbors: good handymen were impossible to book, and the ones who did show up left half the job
                unfinished.
              </p>
              <p>
                Hill &amp; Stone started in [year] to fix that. The name comes from the land here: the Ozark hills,
                and the limestone and fieldstone that NWA houses have been built on for a hundred years. Both last
                because they were set right the first time.
              </p>
              <p>
                Today we&apos;re a crew of [number], working from Fayetteville to Bella Vista. We take on the repairs
                and small projects that fall between a weekend DIY and a general contractor, and we give them the same
                care as a big remodel.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 self-start">
            <PhotoPlaceholder label="Team photo" className="col-span-2 aspect-[16/10]" />
            <PhotoPlaceholder label="Founder portrait" className="aspect-square" />
            <PhotoPlaceholder label="Crew on a job" className="aspect-square" />
          </div>
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

function PhotoPlaceholder({ label, className }: { label: string; className?: string }) {
  return (
    <div
      role="img"
      aria-label={`${label} (placeholder)`}
      className={`flex items-end rounded-photo bg-navy-200 p-4 text-sm font-semibold text-navy-700 ${className ?? ""}`}
    >
      {label}
    </div>
  );
}
