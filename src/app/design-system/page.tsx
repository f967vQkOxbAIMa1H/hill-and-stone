import type { Metadata } from "next";
import { Logo } from "@/components/brand/logo";
import { Badge } from "@/components/ui/badge";
import { BeforeAfter } from "@/components/ui/before-after";
import { Button, ButtonLink } from "@/components/ui/button";
import { Container } from "@/components/ui/container";
import { describedBy, Field, Input, Select, Textarea } from "@/components/ui/field";
import { Heading, Lede } from "@/components/ui/heading";
import { services } from "@/lib/site";

export const metadata: Metadata = {
  title: "Design system",
  robots: { index: false, follow: false },
};

const swatches = [
  { name: "Navy 950", token: "navy-950", hex: "#0F172A", use: "Ink, dark sections, text on copper", className: "bg-navy-950" },
  { name: "Navy 900", token: "navy-900", hex: "#1E293B", use: "Secondary dark surface", className: "bg-navy-900" },
  { name: "Copper 500", token: "copper-500", hex: "#D97706", use: "Button fill (navy text only)", className: "bg-copper-500" },
  { name: "Copper 700", token: "copper-700", hex: "#B45309", use: "Copper text on light", className: "bg-copper-700" },
  { name: "Stone 50", token: "stone-50", hex: "#F8FAFC", use: "Page background", className: "bg-stone-50" },
  { name: "Stone 100", token: "stone-100", hex: "#F1F5F9", use: "Alternate surface", className: "bg-stone-100" },
];

const typeScale = [
  { label: "Display, 72 / 800 / wide", className: "font-wide text-6xl font-extrabold", sample: "Done right." },
  { label: "Page title, 60 / 800 / wide", className: "font-wide text-5xl font-extrabold", sample: "Our work" },
  { label: "Section, 36 / 700 / semi-wide", className: "font-semiwide text-3xl font-bold", sample: "What we take on" },
  { label: "Subhead, 24 / 700", className: "text-2xl font-bold", sample: "Carpentry, doors & trim" },
  { label: "Lede, 18 / 400", className: "text-lg text-navy-600", sample: "Finish carpentry that closes cleanly and lines up." },
  { label: "Body, 16 / 400", className: "text-base", sample: "We replace rotted trim, rehang sticking doors and fit new casing so the reveal is even all the way around." },
  { label: "Small, 14 / 600", className: "text-sm font-semibold", sample: "Service address" },
];

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="border-t border-navy-200 py-14">
      <Heading level="sub" className="mb-8">
        {title}
      </Heading>
      {children}
    </section>
  );
}

export default function DesignSystemPage() {
  const sample = services[1];

  return (
    <main>
      <Container className="py-16">
        <Logo />
        <Heading as="h1" level="page" className="mt-10">
          Design system
        </Heading>
        <Lede className="mt-4 mb-12">
          Tokens and components for the Hill &amp; Stone site. The rules behind them are in docs/DESIGN.md.
        </Lede>

        <Section title="Color">
          <ul className="grid grid-cols-2 gap-x-6 gap-y-8 sm:grid-cols-3 lg:grid-cols-6">
            {swatches.map((s) => (
              <li key={s.token}>
                <div className={`h-20 rounded-panel border border-navy-950/10 ${s.className}`} />
                <p className="mt-3 text-sm font-semibold">{s.name}</p>
                <p className="text-sm text-navy-600">{s.hex}</p>
                <p className="mt-1 text-sm text-navy-600">{s.use}</p>
              </li>
            ))}
          </ul>
        </Section>

        <Section title="Type: Archivo, weight and width axes">
          <div className="flex flex-col gap-8">
            {typeScale.map((t) => (
              <div key={t.label} className="grid gap-2 sm:grid-cols-[220px_1fr] sm:items-baseline">
                <p className="text-sm text-navy-600">{t.label}</p>
                <p className={`max-w-[68ch] ${t.className}`}>{t.sample}</p>
              </div>
            ))}
          </div>
        </Section>

        <Section title="Buttons">
          <div className="flex flex-wrap items-center gap-3">
            <Button size="lg">Request a quote</Button>
            <Button>Request a quote</Button>
            <Button size="sm">Request a quote</Button>
            <Button variant="dark">Accept quote</Button>
            <Button variant="outline">See our work</Button>
            <Button variant="ghost">Cancel</Button>
            <Button variant="danger">Decline quote</Button>
            <Button disabled>Sending…</Button>
          </div>
          <div className="mt-6 flex flex-wrap items-center gap-3 rounded-panel bg-navy-950 p-6">
            <ButtonLink href="/design-system" size="lg">
              Request a quote
            </ButtonLink>
            <ButtonLink href="/design-system" variant="outline-light" size="lg">
              Call (479) 555-0142
            </ButtonLink>
          </div>
        </Section>

        <Section title="Status badges">
          <div className="flex flex-wrap gap-2">
            <Badge>Draft</Badge>
            <Badge tone="copper">Awaiting approval</Badge>
            <Badge tone="success">Paid</Badge>
            <Badge tone="danger">Declined</Badge>
            <Badge tone="dark">New lead</Badge>
          </div>
        </Section>

        <Section title="Form fields">
          <div className="grid max-w-2xl gap-6 sm:grid-cols-2">
            <Field id="ds-name" label="Full name">
              <Input id="ds-name" autoComplete="name" placeholder="Jordan Ellis" />
            </Field>
            <Field id="ds-phone" label="Phone" hint="We call or text to schedule the visit.">
              <Input id="ds-phone" type="tel" autoComplete="tel" {...describedBy("ds-phone", { hint: "x" })} />
            </Field>
            <Field id="ds-email" label="Email" error="Enter an email like name@example.com.">
              <Input
                id="ds-email"
                type="email"
                defaultValue="jordan@"
                {...describedBy("ds-email", { error: "x" })}
              />
            </Field>
            <Field id="ds-type" label="Project type">
              <Select id="ds-type" defaultValue="">
                <option value="" disabled>
                  Choose one
                </option>
                {services.map((s) => (
                  <option key={s.slug} value={s.category}>
                    {s.name}
                  </option>
                ))}
              </Select>
            </Field>
            <Field id="ds-desc" label="What needs doing?" optional className="sm:col-span-2">
              <Textarea id="ds-desc" placeholder="The back door sticks at the top and the trim below it is soft." />
            </Field>
          </div>
        </Section>

        <Section title="Scope sheet (services pattern)">
          <article className="max-w-3xl rounded-panel border border-navy-200 bg-white">
            <header className="border-b border-navy-200 p-6">
              <Heading as="h3" level="sub">
                {sample.name}
              </Heading>
              <p className="mt-2 text-navy-600">{sample.summary}</p>
            </header>
            <div className="grid sm:grid-cols-2">
              <div className="p-6">
                <p className="text-sm font-semibold">What we do</p>
                <ul className="mt-3 space-y-2">
                  {sample.weDo.map((item) => (
                    <li key={item} className="flex gap-2.5">
                      <span aria-hidden className="mt-2.5 h-0.5 w-3 shrink-0 bg-copper-500" />
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
              <div className="border-t border-navy-200 bg-stone-100 p-6 sm:border-t-0 sm:border-l">
                <p className="text-sm font-semibold">What we don&apos;t take on</p>
                <ul className="mt-3 space-y-2 text-navy-600">
                  {sample.weDont.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              </div>
            </div>
          </article>
        </Section>

        <Section title="Before and after">
          <div className="max-w-2xl">
            <BeforeAfter
              intro
              before={{ src: "/placeholders/before-wall.svg", alt: "Hallway wall with a water-damaged hole in the drywall" }}
              after={{ src: "/placeholders/after-wall.svg", alt: "The same wall patched, painted and fitted with new baseboard" }}
            />
            <p className="mt-3 text-sm text-navy-600">
              Drag the handle, or focus it and use the arrow keys.
            </p>
          </div>
        </Section>
      </Container>
    </main>
  );
}
