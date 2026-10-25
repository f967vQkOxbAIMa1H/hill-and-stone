"use client";

import { Phone } from "lucide-react";
import { useRef, useState } from "react";
import { readAttribution } from "@/components/site/attribution";
import { track } from "@/lib/analytics";
import { Button } from "@/components/ui/button";
import { describedBy, Field, Input, Select, Textarea } from "@/components/ui/field";
import { RadioTiles } from "@/components/ui/radio-tiles";
import { formatDay } from "@/lib/dates";
import { budgetOptions, categoryOptions, contactOptions, timelineOptions, UPLOAD_LIMITS } from "@/lib/quote-request/options";
import { flattenErrors, quoteRequestSchema, type FieldErrors, type QuoteRequestInput } from "@/lib/quote-request/schema";
import { useSite } from "@/components/site-provider";
import { ScrollReveal } from "@/components/ScrollReveal";
import { PhotoDropzone, type Photo } from "./photo-dropzone";

type Values = Record<keyof QuoteRequestInput, string>;

const empty: Values = {
  firstName: "", lastName: "", email: "", phone: "", line1: "", line2: "", city: "", postalCode: "",
  preferredContact: "", category: "", description: "", timeline: "", budgetRange: "",
};

// Order used to focus the first invalid field after a failed submit.
const fieldOrder = ["firstName", "lastName", "email", "phone", "preferredContact", "line1", "city", "postalCode", "category", "description", "photos", "timeline", "budgetRange"] as const;

function formatPhone(raw: string) {
  const d = raw.replace(/\D/g, "").replace(/^1/, "").slice(0, 10);
  if (d.length < 4) return d;
  if (d.length < 7) return `(${d.slice(0, 3)}) ${d.slice(3)}`;
  return `(${d.slice(0, 3)}) ${d.slice(3, 6)}-${d.slice(6)}`;
}

type Status =
  | { state: "idle" }
  | { state: "sending"; progress: number }
  | { state: "done"; number: number; replyBy: string; email: string; contact: string };

export function QuoteForm({ defaultCategory }: { defaultCategory?: string }) {
  const site = useSite();
  const [values, setValues] = useState<Values>({ ...empty, category: defaultCategory ?? "" });
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [preparingPhotos, setPreparingPhotos] = useState(false);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [status, setStatus] = useState<Status>({ state: "idle" });
  const [submitted, setSubmitted] = useState(false);
  const doneHeading = useRef<HTMLHeadingElement>(null);

  function set<K extends keyof Values>(key: K, value: string) {
    const next = { ...values, [key]: value };
    setValues(next);
    // After the first submit attempt, re-check as the person fixes things.
    if (submitted) {
      const result = quoteRequestSchema.safeParse(next);
      const fresh = result.success ? {} : flattenErrors(result.error);
      setErrors((prev) => ({ ...prev, [key]: fresh[key] }));
    }
  }

  function focusFirstError(errs: FieldErrors) {
    const first = fieldOrder.find((k) => errs[k]);
    if (first) document.getElementById(first)?.focus();
    else if (errs.form) document.getElementById("form-error")?.focus();
  }

  function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSubmitted(true);
    const result = quoteRequestSchema.safeParse(values);
    if (!result.success) {
      const errs = flattenErrors(result.error);
      setErrors(errs);
      focusFirstError(errs);
      return;
    }
    setErrors({});

    // Photos are shrunk on attach, so this only trips if a photo couldn't be shrunk.
    const total = photos.reduce((sum, p) => sum + p.file.size, 0);
    if (total > UPLOAD_LIMITS.maxTotalBytes) {
      const errs = { photos: "These photos are too large to send together. Remove one or two and try again." };
      setErrors(errs);
      focusFirstError(errs);
      return;
    }

    const body = new FormData();
    for (const [k, v] of Object.entries(values)) body.append(k, v);
    for (const p of photos) body.append("photos", p.file, p.file.name);
    body.append("attribution", readAttribution());
    body.append("website_url_hp", (e.currentTarget.elements.namedItem("website_url_hp") as HTMLInputElement).value);

    // XHR rather than fetch so we can show upload progress for large photos.
    const xhr = new XMLHttpRequest();
    xhr.open("POST", "/api/quote-requests");
    xhr.responseType = "json";
    xhr.upload.onprogress = (ev) => {
      if (ev.lengthComputable) setStatus({ state: "sending", progress: Math.round((ev.loaded / ev.total) * 100) });
    };
    xhr.onload = () => {
      const res = xhr.response as { ok: boolean; number?: number; replyBy?: string; errors?: FieldErrors } | null;
      if (xhr.status < 300 && res?.ok) {
        photos.forEach((p) => URL.revokeObjectURL(p.url));
        const contact = contactOptions.find((o) => o.value === values.preferredContact)!.label.replace(" me", "").toLowerCase();
        setStatus({ state: "done", number: res.number!, replyBy: res.replyBy!, email: values.email.trim(), contact });
        window.scrollTo({ top: 0 });
        requestAnimationFrame(() => doneHeading.current?.focus());
        track("generate_lead", { form: "quote_request", service_category: values.category, photos: photos.length });
      } else {
        const errs =
          res?.errors ??
          (xhr.status === 413
            ? { photos: "The photos were too large to send. Remove one or two and try again." }
            : { form: `Your request didn't send. Try again, or call us at ${site.phone}.` });
        setErrors(errs);
        setStatus({ state: "idle" });
        requestAnimationFrame(() => focusFirstError(errs));
      }
    };
    xhr.onerror = () => {
      setErrors({ form: `Your request didn't send. Check your connection and try again, or call us at ${site.phone}.` });
      setStatus({ state: "idle" });
      requestAnimationFrame(() => document.getElementById("form-error")?.focus());
    };
    setStatus({ state: "sending", progress: 0 });
    xhr.send(body);
  }

  if (status.state === "done") {
    return (
      <div className="quote-done rounded-panel border border-navy-200 bg-white p-6 sm:p-10">
        <p className="text-sm font-semibold text-success-700">Request received</p>
        <h2 ref={doneHeading} tabIndex={-1} className="mt-2 font-serif text-4xl tracking-[-0.015em] outline-none sm:text-4xl">
          {status.number ? `Request #${status.number} is in.` : "Your request is in."}
        </h2>
        <p className="mt-4 max-w-[56ch] text-lg text-navy-700">
          We&apos;ll {status.contact} you by <strong className="text-navy-950">{formatDay(new Date(status.replyBy))}</strong>. A copy of
          your request is on its way to <strong className="text-navy-950">{status.email}</strong>. If a job needs a closer look,
          we&apos;ll set up a short visit; otherwise you&apos;ll get an itemized quote to approve online.
        </p>

        <p className="mt-10 border-t border-navy-200 pt-6 text-navy-600">
          Something urgent, like an active leak? Call{" "}
          <a href={site.phoneHref} className="font-semibold text-accent-700 underline underline-offset-4">
            {site.phone}
          </a>
          .
        </p>
      </div>
    );
  }

  const sending = status.state === "sending";
  const err = (k: keyof FieldErrors) => errors[k];

  return (
    <form onSubmit={submit} noValidate className="flex flex-col gap-12" aria-describedby={errors.form ? "form-error" : undefined}>
      {/* Honeypot: hidden from people and assistive tech. */}
      <div aria-hidden className="absolute -left-[9999px] h-px w-px overflow-hidden">
        <label htmlFor="website_url_hp">Leave this empty</label>
        <input id="website_url_hp" name="website_url_hp" type="text" tabIndex={-1} autoComplete="off" />
      </div>

      <Section title="Your details">
        <div className="grid gap-5 sm:grid-cols-2">
          <Field id="firstName" label="First name" error={err("firstName")}>
            <Input id="firstName" autoComplete="given-name" value={values.firstName} onChange={(e) => set("firstName", e.target.value)} {...describedBy("firstName", { error: err("firstName") })} />
          </Field>
          <Field id="lastName" label="Last name" error={err("lastName")}>
            <Input id="lastName" autoComplete="family-name" value={values.lastName} onChange={(e) => set("lastName", e.target.value)} {...describedBy("lastName", { error: err("lastName") })} />
          </Field>
          <Field id="email" label="Email" error={err("email")}>
            <Input id="email" type="email" autoComplete="email" inputMode="email" value={values.email} onChange={(e) => set("email", e.target.value)} {...describedBy("email", { error: err("email") })} />
          </Field>
          <Field id="phone" label="Phone" error={err("phone")}>
            <Input id="phone" type="tel" autoComplete="tel-national" inputMode="tel" placeholder="(479) 555-0142" value={values.phone} onChange={(e) => set("phone", formatPhone(e.target.value))} {...describedBy("phone", { error: err("phone") })} />
          </Field>
        </div>
        <RadioTiles
          name="preferredContact"
          legend="How should we reach you?"
          options={contactOptions}
          value={values.preferredContact as never}
          onChange={(v) => set("preferredContact", v)}
          error={err("preferredContact")}
        />
      </Section>

      <Section title="Where's the work?">
        <div className="grid gap-5 sm:grid-cols-6">
          <Field id="line1" label="Street address" error={err("line1")} className="sm:col-span-4">
            <Input id="line1" autoComplete="address-line1" value={values.line1} onChange={(e) => set("line1", e.target.value)} {...describedBy("line1", { error: err("line1") })} />
          </Field>
          <Field id="line2" label="Apt or unit" optional className="sm:col-span-2">
            <Input id="line2" autoComplete="address-line2" value={values.line2} onChange={(e) => set("line2", e.target.value)} />
          </Field>
          <Field id="city" label="City" error={err("city")} className="sm:col-span-4">
            <Input id="city" autoComplete="address-level2" value={values.city} onChange={(e) => set("city", e.target.value)} {...describedBy("city", { error: err("city") })} />
          </Field>
          <Field id="postalCode" label="ZIP code" error={err("postalCode")} className="sm:col-span-2">
            <Input id="postalCode" autoComplete="postal-code" inputMode="numeric" maxLength={5} value={values.postalCode} onChange={(e) => set("postalCode", e.target.value.replace(/\D/g, ""))} {...describedBy("postalCode", { error: err("postalCode") })} />
          </Field>
        </div>
      </Section>

      <Section title="The project">
        <RadioTiles
          name="category"
          legend="What kind of work is it?"
          options={categoryOptions}
          value={values.category as never}
          onChange={(v) => set("category", v)}
          error={err("category")}
          columns="sm:grid-cols-2"
        />
        <Field id="description" label="What needs doing?" hint="Where in the house, what's wrong, and anything you've already tried. Measurements help if you have them." error={err("description")}>
          <Textarea id="description" rows={6} value={values.description} onChange={(e) => set("description", e.target.value)} {...describedBy("description", { error: err("description"), hint: "x" })} />
        </Field>
        <div>
          <p className="text-sm font-semibold">
            Photos <span className="font-normal text-navy-600">(optional, but they help us price faster)</span>
          </p>
          <ScrollReveal delay={0.1} className="mt-2">
            <PhotoDropzone photos={photos} onChange={setPhotos} onPreparingChange={setPreparingPhotos} error={err("photos")} />
          </ScrollReveal>
        </div>
      </Section>

      <Section title="Timing and budget">
        <Field id="timeline" label="When do you need it done?" error={err("timeline")} className="max-w-sm">
          <Select id="timeline" value={values.timeline} onChange={(e) => set("timeline", e.target.value)} {...describedBy("timeline", { error: err("timeline") })}>
            <option value="" disabled>
              Choose one
            </option>
            {timelineOptions.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </Select>
        </Field>
        <RadioTiles
          name="budgetRange"
          legend="Rough budget"
          hint="A range helps us suggest the right fix. It doesn't lock in a price."
          options={budgetOptions}
          value={values.budgetRange as never}
          onChange={(v) => set("budgetRange", v)}
          error={err("budgetRange")}
        />
      </Section>

      <div className="border-t border-navy-200 pt-8">
        {errors.form && (
          <p id="form-error" tabIndex={-1} role="alert" className="mb-5 rounded-control bg-danger-100 px-4 py-3 font-medium text-danger-700 outline-none">
            {errors.form}
          </p>
        )}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
          <Button type="submit" size="lg" disabled={sending || preparingPhotos} className="sm:min-w-56">
            {preparingPhotos ? "Preparing photos…" : sending ? (photos.length && status.progress < 100 ? `Uploading photos… ${status.progress}%` : "Sending…") : "Send request"}
          </Button>
          <a href={site.phoneHref} className="inline-flex items-center gap-2 font-semibold text-navy-700 hover:text-accent-700">
            <Phone aria-hidden className="size-4" />
            Rather talk? {site.phone}
          </a>
        </div>
        {sending && photos.length > 0 && (
          <div className="mt-4 h-1.5 max-w-sm overflow-hidden rounded-full bg-navy-200" role="progressbar" aria-label="Upload progress" aria-valuenow={status.progress} aria-valuemin={0} aria-valuemax={100}>
            <div className="h-full bg-accent-500 transition-[width] duration-200" style={{ width: `${status.progress}%` }} />
          </div>
        )}
        <p className="mt-5 max-w-[60ch] text-sm text-navy-600">
          We use your details only to answer this request. No mailing lists, and we never sell or share your information.
        </p>
      </div>
    </form>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <ScrollReveal as="section" className="flex flex-col gap-6 border-t border-navy-200 pt-8 first-of-type:border-t-0 first-of-type:pt-0">
      <h2 className="font-serif text-2xl">{title}</h2>
      {children}
    </ScrollReveal>
  );
}
