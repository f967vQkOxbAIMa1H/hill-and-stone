"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { updateSiteSettings } from "@/app/admin/team-actions";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Field, Input } from "@/components/ui/field";
import type { Settings } from "@/lib/settings/schema";

// Form state keeps numbers as text so fields can be cleared while typing; the server validates.
type Form = {
  phone: string;
  email: string;
  hours: string;
  licenseNumber: string;
  claims: Settings["claims"];
  insurance: string[];
  warrantyMonths: string;
  googleReviewsUrl: string;
  replyBusinessDays: string;
  coiBusinessDays: string;
  backgroundRecheckYears: string;
  policiesConfirmed: boolean;
  tripFee: string;
  taxRatePercent: string;
  validDays: string;
  pricingConfirmed: boolean;
};

const toForm = (s: Settings): Form => ({
  phone: s.contact.phone,
  email: s.contact.email,
  hours: s.contact.hours,
  licenseNumber: s.license.number ?? "",
  claims: s.claims,
  insurance: s.insurance.map((i) => i.detail ?? ""),
  warrantyMonths: String(s.warrantyMonths),
  googleReviewsUrl: s.googleReviewsUrl ?? "",
  replyBusinessDays: String(s.policies.replyBusinessDays),
  coiBusinessDays: String(s.policies.coiBusinessDays),
  backgroundRecheckYears: String(s.policies.backgroundRecheckYears),
  policiesConfirmed: s.policies.confirmed,
  tripFee: s.quoteDefaults.tripFee,
  taxRatePercent: s.quoteDefaults.taxRatePercent,
  validDays: String(s.quoteDefaults.validDays),
  pricingConfirmed: s.quoteDefaults.confirmed,
});

const toInput = (f: Form, base: Settings) => ({
  contact: { phone: f.phone, email: f.email, hours: f.hours },
  license: { number: f.licenseNumber },
  claims: f.claims,
  insurance: base.insurance.map((i, n) => ({ type: i.type, detail: f.insurance[n] })),
  warrantyMonths: f.warrantyMonths,
  googleReviewsUrl: f.googleReviewsUrl,
  policies: { replyBusinessDays: f.replyBusinessDays, coiBusinessDays: f.coiBusinessDays, backgroundRecheckYears: f.backgroundRecheckYears, confirmed: f.policiesConfirmed },
  quoteDefaults: { tripFee: f.tripFee, taxRatePercent: f.taxRatePercent, validDays: f.validDays, confirmed: f.pricingConfirmed },
});

// Server error keys (e.g. "contact.phone") → form field ids.
const errorField: Record<string, string> = {
  "contact.phone": "phone",
  "contact.email": "email",
  "contact.hours": "hours",
  "license.number": "licenseNumber",
  warrantyMonths: "warrantyMonths",
  googleReviewsUrl: "googleReviewsUrl",
  "policies.replyBusinessDays": "replyBusinessDays",
  "policies.coiBusinessDays": "coiBusinessDays",
  "policies.backgroundRecheckYears": "backgroundRecheckYears",
  "quoteDefaults.tripFee": "tripFee",
  "quoteDefaults.taxRatePercent": "taxRatePercent",
  "quoteDefaults.validDays": "validDays",
  "insurance.0.detail": "insurance-0",
  "insurance.1.detail": "insurance-1",
  "insurance.2.detail": "insurance-2",
};

const claimOptions: [keyof Settings["claims"], string, string][] = [
  ["insured", "Insured", "Shows “Insured,” any insurance details below, and the certificate-of-insurance request form."],
  ["bonded", "Bonded", "Shows “Bonded” next to your other credentials."],
  ["backgroundChecked", "Background-checked", "Says everyone who works in a customer's home has passed a criminal background check."],
  ["warranty", "Workmanship warranty", "Shows the warranty term on the site, in the FAQ and in the job-complete email."],
  ["satisfactionGuarantee", "Satisfaction guarantee", "Says customers don't pay the final invoice until they're happy with the work."],
];

function Section({ title, description, children }: { title: string; description: string; children: React.ReactNode }) {
  return (
    <section className="grid gap-4 border-t border-navy-200 py-8 first:border-t-0 first:pt-0 lg:grid-cols-[260px_minmax(0,1fr)] lg:gap-10">
      <div>
        <h2 className="font-bold">{title}</h2>
        <p className="mt-1 text-sm text-navy-600">{description}</p>
      </div>
      <div className="grid gap-5 sm:grid-cols-2">{children}</div>
    </section>
  );
}

export function SiteSettingsForm({ settings }: { settings: Settings }) {
  const router = useRouter();
  const [f, setF] = useState(() => toForm(settings));
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [notice, setNotice] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const set = <K extends keyof Form>(k: K, v: Form[K]) => {
    setF((x) => ({ ...x, [k]: v }));
    setErrors((e) => Object.fromEntries(Object.entries(e).filter(([key]) => key !== k)));
    setNotice(null);
  };
  const text = (k: Exclude<keyof Form, "insurance" | "policiesConfirmed" | "pricingConfirmed" | "claims">, label: string, extra: Partial<React.ComponentProps<typeof Input>> & { hint?: string; optional?: boolean; wide?: boolean } = {}) => {
    const { hint, optional, wide, ...rest } = extra;
    return (
      <Field id={k} label={label} hint={hint} optional={optional} error={errors[k]} className={wide ? "sm:col-span-2" : undefined}>
        <Input id={k} value={f[k]} onChange={(e) => set(k, e.target.value)} aria-invalid={errors[k] ? true : undefined} {...rest} />
      </Field>
    );
  };

  return (
    <form
      noValidate
      // Keep focused fields clear of the sticky save bar (and the tab bar under it on phones).
      className="max-w-5xl [&_input]:scroll-mb-44 [&_textarea]:scroll-mb-44 lg:[&_input]:scroll-mb-28 lg:[&_textarea]:scroll-mb-28"
      onSubmit={(e) => {
        e.preventDefault();
        start(async () => {
          const r = await updateSiteSettings(toInput(f, settings));
          if (!r.ok) {
            const mapped = Object.fromEntries(Object.entries(r.errors).map(([k, v]) => [errorField[k] ?? k, v]));
            setErrors(mapped);
            setNotice(null);
            requestAnimationFrame(() => document.getElementById(Object.keys(mapped)[0])?.focus());
            return;
          }
          setNotice(r.message);
          router.refresh();
        });
      }}
    >
      <Section title="Contact" description="Shown in the header, footer, every call button, the quote pages and emails.">
        {text("phone", "Phone", { type: "tel", autoComplete: "off" })}
        {text("email", "Public email", { type: "email", hint: "Customers reply to this address." })}
        {text("hours", "Business hours", { wide: true, hint: "Shown in the footer and FAQ, e.g. Mon–Fri 7am–6pm, Sat by appointment." })}
      </Section>

      <Section
        title="Trust claims"
        description="Nothing here appears on the site until you turn it on. Only turn on what's true today and what you could prove if a customer asked."
      >
        {claimOptions.map(([key, label, hint]) => (
          <div key={key} className="sm:col-span-2">
            <Checkbox
              id={`claim-${key}`}
              label={label}
              hint={hint}
              checked={f.claims[key]}
              onChange={(e) => set("claims", { ...f.claims, [key]: e.target.checked })}
            />
          </div>
        ))}
        {text("licenseNumber", "Arkansas license number", { optional: true, hint: "Shown as “Arkansas license ____” once entered. Leave blank until you have one." })}
        {text("warrantyMonths", "Workmanship warranty (months)", { inputMode: "numeric", hint: "Used only while the warranty is turned on." })}
        {settings.insurance.map((ins, n) => (
          <Field key={ins.type} id={`insurance-${n}`} label={ins.type} optional hint={n === 0 ? "e.g. $2,000,000 per occurrence. Shown only while “Insured” is on." : undefined} error={errors[`insurance-${n}`]}>
            <Input
              id={`insurance-${n}`}
              value={f.insurance[n]}
              onChange={(e) => set("insurance", f.insurance.map((x, i) => (i === n ? e.target.value : x)))}
            />
          </Field>
        ))}
      </Section>

      <Section title="Online listings" description="Your Google Business Profile review link. Review buttons stay hidden until it's set.">
        {text("googleReviewsUrl", "Google review link", { type: "url", optional: true, wide: true, placeholder: "https://g.page/r/…/review" })}
      </Section>

      <Section title="Policies" description="Used in the FAQ, Trust page, quote form and emails. Read those pages, then confirm they match how you work.">
        {text("replyBusinessDays", "Reply to requests within (business days)", { inputMode: "numeric" })}
        {text("coiBusinessDays", "Certificate of insurance turnaround (business days)", { inputMode: "numeric" })}
        {text("backgroundRecheckYears", "Background checks repeated every (years)", { inputMode: "numeric" })}
        <div className="sm:col-span-2">
          <Checkbox id="policiesConfirmed" label="Policies confirmed" hint="I've read the FAQ, Trust page and email wording, and they match how we work." checked={f.policiesConfirmed} onChange={(e) => set("policiesConfirmed", e.target.checked)} />
        </div>
      </Section>

      <Section title="Quote defaults" description="Starting values for new quotes in the quote builder. Existing quotes don't change.">
        {text("tripFee", "Trip fee ($)", { inputMode: "decimal" })}
        {text("taxRatePercent", "Sales tax (%)", { inputMode: "decimal", hint: "Confirm the rate and what's taxable with your accountant." })}
        {text("validDays", "Quotes valid for (days)", { inputMode: "numeric" })}
        <div className="sm:col-span-2">
          <Checkbox id="pricingConfirmed" label="Pricing confirmed" hint="These defaults match how we price." checked={f.pricingConfirmed} onChange={(e) => set("pricingConfirmed", e.target.checked)} />
        </div>
      </Section>

      <div className="sticky bottom-[calc(4rem+env(safe-area-inset-bottom))] -mx-5 lg:bottom-0 mt-4 flex flex-wrap items-center gap-3 border-t border-navy-200 bg-stone-50/95 px-5 py-4 backdrop-blur-sm sm:-mx-8 sm:px-8">
        <Button type="submit" variant="dark" disabled={pending}>
          {pending ? "Saving…" : "Save settings"}
        </Button>
        <p role="status" aria-live="polite" className={Object.keys(errors).length ? "text-sm font-medium text-danger-700" : "text-sm font-medium text-success-700"}>
          {Object.keys(errors).length ? "Fix the highlighted fields, then save." : notice}
        </p>
      </div>
    </form>
  );
}
