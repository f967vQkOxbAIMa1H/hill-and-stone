"use client";

import { CheckCircle2 } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { describedBy, Field, Input, Textarea } from "@/components/ui/field";
import { coiRequestSchema, type CoiRequestInput } from "@/lib/coi";
import { flattenErrors } from "@/lib/quote-request/schema";
import { site } from "@/lib/site";

type Errors = Partial<Record<keyof CoiRequestInput | "form", string>>;

export function CoiForm() {
  const [values, setValues] = useState({ name: "", email: "", organization: "", address: "", notes: "" });
  const [errors, setErrors] = useState<Errors>({});
  const [state, setState] = useState<"idle" | "sending" | "sent">("idle");

  const set = (k: keyof typeof values, v: string) => setValues((prev) => ({ ...prev, [k]: v }));

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const parsed = coiRequestSchema.safeParse(values);
    if (!parsed.success) {
      const errs = flattenErrors(parsed.error) as Errors;
      setErrors(errs);
      document.getElementById(`coi-${Object.keys(errs)[0]}`)?.focus();
      return;
    }
    setErrors({});
    setState("sending");
    const company = (e.currentTarget.elements.namedItem("company") as HTMLInputElement).value;
    try {
      const res = await fetch("/api/coi-requests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...values, company }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) throw data.errors ?? {};
      setState("sent");
    } catch (errs) {
      setErrors({ form: "Your request didn't send. Try again, or email us.", ...(errs as Errors) });
      setState("idle");
    }
  }

  if (state === "sent") {
    return (
      <div role="status" className="flex gap-3 rounded-panel border border-navy-200 bg-white p-6">
        <CheckCircle2 aria-hidden className="size-6 shrink-0 text-success-700" />
        <div>
          <p className="font-bold">Request sent</p>
          <p className="mt-1 text-navy-600">
            We&apos;ll ask our insurer to send the certificate to {values.email}, usually within {site.coiWindow}.
          </p>
        </div>
      </div>
    );
  }

  const err = (k: keyof Errors) => errors[k];
  return (
    <form onSubmit={submit} noValidate className="grid gap-5 rounded-panel border border-navy-200 bg-white p-6 sm:grid-cols-2 sm:p-8">
      <div aria-hidden className="absolute -left-[9999px]">
        <input name="company" tabIndex={-1} autoComplete="off" />
      </div>
      <Field id="coi-name" label="Your name" error={err("name")}>
        <Input id="coi-name" autoComplete="name" value={values.name} onChange={(e) => set("name", e.target.value)} {...describedBy("coi-name", { error: err("name") })} />
      </Field>
      <Field id="coi-email" label="Email to send it to" error={err("email")}>
        <Input id="coi-email" type="email" autoComplete="email" value={values.email} onChange={(e) => set("email", e.target.value)} {...describedBy("coi-email", { error: err("email") })} />
      </Field>
      <Field id="coi-organization" label="HOA, property manager or company" optional className="sm:col-span-2">
        <Input id="coi-organization" autoComplete="organization" value={values.organization} onChange={(e) => set("organization", e.target.value)} />
      </Field>
      <Field id="coi-address" label="Property address" error={err("address")} className="sm:col-span-2">
        <Input id="coi-address" autoComplete="street-address" value={values.address} onChange={(e) => set("address", e.target.value)} {...describedBy("coi-address", { error: err("address") })} />
      </Field>
      <Field id="coi-notes" label="Anything the certificate needs to include?" hint="For example, a named additional insured or specific coverage limits." optional className="sm:col-span-2">
        <Textarea id="coi-notes" rows={3} className="min-h-24" value={values.notes} onChange={(e) => set("notes", e.target.value)} {...describedBy("coi-notes", { hint: "x" })} />
      </Field>
      {errors.form && (
        <p role="alert" className="rounded-control bg-danger-100 px-4 py-3 font-medium text-danger-700 sm:col-span-2">
          {errors.form}
        </p>
      )}
      <div className="sm:col-span-2">
        <Button type="submit" variant="dark" disabled={state === "sending"}>
          {state === "sending" ? "Sending…" : "Request certificate"}
        </Button>
      </div>
    </form>
  );
}
