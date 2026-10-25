import type { Metadata } from "next";
import Link from "next/link";
import { Lock } from "lucide-react";
import { CtaBand } from "@/components/site/cta-band";
import { PageIntro } from "@/components/site/page-intro";
import { CoiForm } from "@/components/trust/coi-form";
import { Container } from "@/components/ui/container";
import { Heading } from "@/components/ui/heading";
import { getSite } from "@/lib/settings";

export const metadata: Metadata = {
  title: "Insurance, background checks and warranty",
  description:
    "How Hill & Stone is licensed and insured, how we background-check our technicians, what our workmanship warranty covers, and how online payments are secured.",
};

// TODO(owner): every policy on this page is a draft. Confirm each detail before launch.
const sections = [
  { id: "insurance", title: "Insurance and license" },
  { id: "background-checks", title: "Background checks" },
  { id: "warranty", title: "Warranty" },
  { id: "payments", title: "Secure payments" },
];

const covered = [
  "Repairs that fail because of how we did them",
  "Loose, cracked or separating work we installed",
  "Paint and caulk failures from our prep or application",
  "The labor to fix any of the above",
];
const notCovered = [
  "Material defects (covered by the manufacturer; we'll help you claim)",
  "Normal wear and tear",
  "Storm, water or accidental damage",
  "Materials the customer supplied",
];

export default async function TrustPage() {
  const site = await getSite();
  return (
    <>
      <PageIntro
        title="Proof, not promises"
        lede="Anyone can put “licensed and insured” on a truck. Here's what that means at Hill & Stone, and how to check it yourself."
      />

      <Container className="grid gap-10 py-14 lg:grid-cols-[220px_minmax(0,1fr)] lg:gap-14 lg:py-20">
        <nav aria-label="On this page" className="lg:sticky lg:top-28 lg:self-start">
          <h2 className="text-sm font-semibold text-navy-600">On this page</h2>
          <ul className="mt-3 flex flex-wrap gap-2 lg:flex-col lg:gap-0">
            {sections.map((s) => (
              <li key={s.id}>
                <Link
                  href={`#${s.id}`}
                  className="block rounded-control border border-navy-200 px-3 py-1.5 text-sm hover:border-navy-950 lg:rounded-none lg:border-0 lg:border-l-2 lg:border-navy-200 lg:py-2 lg:pl-4 lg:text-base lg:hover:border-accent-500"
                >
                  {s.title}
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        <div className="flex max-w-3xl flex-col gap-20">
          <section id="insurance" aria-labelledby="insurance-heading" className="scroll-mt-28">
            <Heading id="insurance-heading">Insurance and license</Heading>
            <p className="mt-4 text-lg text-navy-700">
              Hill &amp; Stone is {site.licenseStatement.toLowerCase()}. If something goes wrong on your property, you shouldn&apos;t
              be the one paying for it.
            </p>
            <dl className="mt-8 border-t border-navy-200">
              {site.licenseNumber && (
                <div className="grid gap-1 border-b border-navy-200 py-4 sm:grid-cols-[240px_1fr]">
                  <dt className="font-semibold">Arkansas license</dt>
                  <dd className="text-navy-700">
                    {site.licenseLabel} {site.licenseNumber}
                  </dd>
                </div>
              )}
              {site.insurance.length === 0 && (
                <div className="grid gap-1 border-b border-navy-200 py-4 sm:grid-cols-[240px_1fr]">
                  <dt className="font-semibold">Coverage and license details</dt>
                  <dd className="text-navy-700">Listed on our certificate of insurance. Request one below and it comes straight from our insurer.</dd>
                </div>
              )}
              {site.insurance.map((i) => (
                <div key={i.type} className="grid gap-1 border-b border-navy-200 py-4 sm:grid-cols-[240px_1fr]">
                  <dt className="font-semibold">{i.type}</dt>
                  <dd className="text-navy-700">{i.detail}</dd>
                </div>
              ))}
            </dl>

            <h3 className="mt-12 text-xl font-bold">Get a certificate of insurance</h3>
            <p className="mt-2 text-navy-700">
              HOAs, property managers and careful homeowners often ask for one. Here&apos;s how it works:
            </p>
            <ol className="mt-6 grid gap-6 sm:grid-cols-3">
              {[
                ["You ask", "Fill in the form below with the property and where to send it."],
                ["Our insurer issues it", "The certificate comes from the insurance company, not from us, so you know it's real."],
                ["You receive it", `By email, usually within ${site.coiWindow}, with you listed as certificate holder.`],
              ].map(([title, body], i) => (
                <li key={title} className="border-t-2 border-navy-950 pt-4">
                  <span className="numeral text-3xl text-accent-700">{String(i + 1).padStart(2, "0")}</span>
                  <p className="mt-1 font-bold">{title}</p>
                  <p className="mt-1 text-navy-600">{body}</p>
                </li>
              ))}
            </ol>
            <div className="mt-8">
              <CoiForm />
            </div>
          </section>

          <section id="background-checks" aria-labelledby="bg-heading" className="scroll-mt-28">
            <Heading id="bg-heading">Background checks</Heading>
            <p className="mt-4 text-lg text-navy-700">
              You&apos;re trusting us with your house and your family&apos;s routine. Everyone we send has been checked, and
              you&apos;ll know who&apos;s coming before they arrive.
            </p>
            <ul className="mt-8 space-y-4">
              {[
                `Every technician passes a criminal background check through a licensed screening company before their first job, and again every ${site.backgroundRecheckYears} years.`,
                "Our technicians are our employees, not day labor or anonymous subcontractors.",
                "You get the name of your technician before the visit.",
                "Technicians arrive in Hill & Stone shirts, in a marked vehicle.",
              ].map((item) => (
                <li key={item} className="flex gap-3">
                  <span aria-hidden className="mt-3 h-0.5 w-3 shrink-0 bg-accent-500" />
                  <span className="text-navy-700">{item}</span>
                </li>
              ))}
            </ul>
          </section>

          <section id="warranty" aria-labelledby="warranty-heading" className="scroll-mt-28">
            <Heading id="warranty-heading">Workmanship warranty</Heading>
            <p className="mt-4 text-lg text-navy-700">
              Every job comes with a {site.warranty}, starting the day we finish. If our work fails, we come back and fix it.
            </p>
            <div className="mt-8 grid overflow-hidden rounded-panel border border-navy-200 sm:grid-cols-2">
              <div className="bg-white p-6">
                <h3 className="text-sm font-semibold">Covered</h3>
                <ul className="mt-3 space-y-2">
                  {covered.map((i) => (
                    <li key={i} className="flex gap-2.5">
                      <span aria-hidden className="mt-3 h-0.5 w-3 shrink-0 bg-accent-500" />
                      {i}
                    </li>
                  ))}
                </ul>
              </div>
              <div className="border-t border-navy-200 bg-stone-100 p-6 sm:border-t-0 sm:border-l">
                <h3 className="text-sm font-semibold">Not covered</h3>
                <ul className="mt-3 space-y-2 text-navy-600">
                  {notCovered.map((i) => (
                    <li key={i}>{i}</li>
                  ))}
                </ul>
              </div>
            </div>
            <p className="mt-6 text-navy-700">
              To make a claim, call{" "}
              <a href={site.phoneHref} className="font-semibold text-accent-700 underline-offset-4 hover:underline">
                {site.phone}
              </a>{" "}
              or reply to any email from us with photos. We&apos;ll schedule a visit to look at it.
            </p>
          </section>

          <section id="payments" aria-labelledby="payments-heading" className="scroll-mt-28">
            <Heading id="payments-heading">Secure payments</Heading>
            <p className="mt-4 text-lg text-navy-700">
              You accept your quote online, then pay once the work is done through Stripe, a payment processor used by millions of
              businesses.
            </p>
            <dl className="mt-8 grid gap-x-10 gap-y-6 sm:grid-cols-2">
              {[
                ["Your card never touches our servers", "Card details go straight to Stripe, a PCI Level 1 certified processor. We never see or store your full card number."],
                ["Private quote links", "Each quote has its own unguessable link. Only people you share it with can open it."],
                ["Card or Apple Pay", "Visa, Mastercard, American Express, Discover and Apple Pay."],
                ["Nothing charged until the work is done", "You accept an itemized quote for free. No deposits: you pay once the job is complete and you're happy with it."],
              ].map(([t, d]) => (
                <div key={t} className="border-t border-navy-200 pt-4">
                  <dt className="flex items-center gap-2 font-bold">
                    <Lock aria-hidden className="size-4 text-accent-700" />
                    {t}
                  </dt>
                  <dd className="mt-1.5 text-navy-600">{d}</dd>
                </div>
              ))}
            </dl>
          </section>
        </div>
      </Container>

      <CtaBand />
    </>
  );
}
