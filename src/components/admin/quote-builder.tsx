"use client";

import { Plus, Send, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";
import { saveQuoteDraft, sendQuote } from "@/app/admin/actions";
import { Button } from "@/components/ui/button";
import { Field, Input, Select, Textarea } from "@/components/ui/field";
import type { LineItemType } from "@/generated/prisma/enums";
import { computeTotals, quoteDraftSchema, type QuoteDraftInput } from "@/lib/admin/quote-schema";
import { formatCents } from "@/lib/money";
import { useSite } from "@/components/site-provider";
import { cn } from "@/lib/utils";

type Line = QuoteDraftInput["lines"][number] & { key: string };

const typeLabel: Record<LineItemType, string> = {
  LABOR: "Labor",
  MATERIALS: "Materials",
  TRIP_FEE: "Trip fee",
  OTHER: "Other",
  DISCOUNT: "Discount",
};
const quickAdd: { type: LineItemType; description: string }[] = [
  { type: "LABOR", description: "" },
  { type: "MATERIALS", description: "" },
  { type: "TRIP_FEE", description: "Trip fee" },
  { type: "DISCOUNT", description: "" },
];

let keySeq = 0;
const withKey = (l: QuoteDraftInput["lines"][number]): Line => ({ ...l, key: `l${++keySeq}` });

export type BuilderLead = { id: string; number: number; name: string; email: string; address: string; photos: number };

export function QuoteBuilder({ lead, initial }: { lead: BuilderLead; initial: QuoteDraftInput }) {
  const site = useSite();
  const router = useRouter();
  const { lines: initialLines, ...initialForm } = initial;
  const [form, setForm] = useState(initialForm);
  const [lines, setLines] = useState<Line[]>(() => initialLines.map(withKey));
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [notice, setNotice] = useState<string | null>(null);
  const [confirming, setConfirming] = useState(false);
  const [pending, start] = useTransition();
  const [id, setId] = useState(initial.id);

  const input = (): QuoteDraftInput => ({ ...form, id, lines: lines.map((l) => ({ type: l.type, description: l.description, quantity: l.quantity, unitPrice: l.unitPrice })) });
  // Editing a field clears its error; everything is re-checked on save or send.
  const clearError = (...keys: string[]) =>
    setErrors((e) => (keys.some((k) => k in e) ? Object.fromEntries(Object.entries(e).filter(([k]) => !keys.includes(k))) : e));
  const set = <K extends keyof typeof form>(k: K, v: (typeof form)[K]) => {
    setForm((f) => ({ ...f, [k]: v }));
    setNotice(null);
    clearError(String(k), "form");
  };
  const setLine = (key: string, patch: Partial<Line>) => {
    const i = lines.findIndex((l) => l.key === key);
    setLines((ls) => ls.map((l) => (l.key === key ? { ...l, ...patch } : l)));
    setNotice(null);
    clearError(...Object.keys(patch).map((f) => `lines.${i}.${f}`), "lines", "form");
  };

  // Live totals use the same function the server uses to store them.
  const totals = useMemo(() => {
    try {
      return computeTotals(input());
    } catch {
      return null;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form, lines]);

  function validate() {
    const r = quoteDraftSchema.safeParse(input());
    if (r.success) {
      setErrors({});
      return true;
    }
    const errs: Record<string, string> = {};
    for (const i of r.error.issues) errs[i.path.join(".") || "form"] ??= i.message;
    setErrors(errs);
    const first = Object.keys(errs)[0];
    requestAnimationFrame(() => document.querySelector<HTMLElement>(`[data-field="${first}"]`)?.focus());
    return false;
  }

  function save() {
    if (!validate()) return;
    start(async () => {
      const r = await saveQuoteDraft(input());
      if (!r.ok) return setErrors(r.errors);
      setNotice("Draft saved.");
      if (!id) {
        setId(r.id);
        router.replace(`/admin/quotes/${r.id}`);
      }
    });
  }

  function send() {
    if (!validate()) return setConfirming(false);
    start(async () => {
      const r = await sendQuote(input());
      if (!r.ok) {
        setConfirming(false);
        if (r.id) setId(r.id);
        return setErrors(r.errors);
      }
      router.push(`/admin/quotes/${r.id}?sent=${r.emailed ? "emailed" : "not-emailed"}`);
    });
  }

  const err = (k: string) => errors[k];

  return (
    <div className="grid gap-8 px-5 py-6 sm:px-8 xl:grid-cols-[minmax(0,1fr)_340px]">
      <div className="min-w-0 space-y-8">
        {errors.form && (
          <p role="alert" className="rounded-control bg-danger-100 px-4 py-3 font-medium text-danger-700">
            {errors.form}
          </p>
        )}

        <section aria-labelledby="details-h" className="space-y-4">
          <h2 id="details-h" className="font-bold">Quote details</h2>
          <div className="grid gap-4 sm:grid-cols-[1fr_160px]">
            <Field id="title" label="Title" error={err("title")} hint="The client sees this as the quote's headline.">
              <Input id="title" data-field="title" value={form.title} onChange={(e) => set("title", e.target.value)} aria-invalid={!!err("title") || undefined} />
            </Field>
            <Field id="validDays" label="Valid for (days)" error={err("validDays")}>
              <Input id="validDays" data-field="validDays" inputMode="numeric" value={String(form.validDays)} onChange={(e) => set("validDays", e.target.value.replace(/\D/g, "") as never)} aria-invalid={!!err("validDays") || undefined} />
            </Field>
          </div>
        </section>

        <section aria-labelledby="lines-h">
          <h2 id="lines-h" className="font-bold">Line items</h2>
          {err("lines") && (
            <p role="alert" className="mt-2 text-sm font-medium text-danger-700">
              {err("lines")}
            </p>
          )}
          {/* Below md each line becomes a small form: type and remove, description, then qty, price and amount. */}
          <div className="mt-3 rounded-panel border border-navy-200 bg-white md:overflow-x-auto">
            <table className="block w-full text-left text-sm md:table md:min-w-[680px]">
              <thead className="hidden border-b border-navy-200 bg-stone-50 text-navy-600 md:table-header-group">
                <tr>
                  <th scope="col" className="w-32 px-3 py-2 font-semibold">Type</th>
                  <th scope="col" className="px-3 py-2 font-semibold">Description</th>
                  <th scope="col" className="w-20 px-3 py-2 font-semibold">Qty</th>
                  <th scope="col" className="w-28 px-3 py-2 font-semibold">Unit price</th>
                  <th scope="col" className="w-24 px-3 py-2 text-right font-semibold">Amount</th>
                  <th scope="col" className="w-12 px-2 py-2"><span className="sr-only">Remove</span></th>
                </tr>
              </thead>
              <tbody className="block divide-y divide-navy-200 md:table-row-group">
                {lines.map((l, i) => {
                  const amount = totals?.items[i]?.totalCents ?? 0;
                  const e = (f: string) => err(`lines.${i}.${f}`);
                  return (
                    <tr key={l.key} className="grid grid-cols-[1fr_1fr_auto] gap-x-2 gap-y-2 p-3 align-top md:table-row md:p-0">
                      <td className="order-1 col-span-2 md:table-cell md:px-3 md:py-2">
                        <Select aria-label={`Line ${i + 1} type`} value={l.type} onChange={(ev) => setLine(l.key, { type: ev.target.value as LineItemType })} className="h-10">
                          {(Object.keys(typeLabel) as LineItemType[]).map((t) => (
                            <option key={t} value={t}>{typeLabel[t]}</option>
                          ))}
                        </Select>
                      </td>
                      <td className="order-3 col-span-3 md:table-cell md:px-3 md:py-2">
                        <Input aria-label={`Line ${i + 1} description`} data-field={`lines.${i}.description`} value={l.description} onChange={(ev) => setLine(l.key, { description: ev.target.value })} className="h-10" aria-invalid={!!e("description") || undefined} placeholder={l.type === "LABOR" ? "e.g. Replace casing, 2 techs" : ""} />
                        {e("description") && <p className="mt-1 text-danger-700">{e("description")}</p>}
                      </td>
                      <td className="order-4 md:table-cell md:px-3 md:py-2">
                        <MobileLabel>Qty</MobileLabel>
                        <Input aria-label={`Line ${i + 1} quantity`} data-field={`lines.${i}.quantity`} inputMode="decimal" value={l.quantity} onChange={(ev) => setLine(l.key, { quantity: ev.target.value })} className="h-10" aria-invalid={!!e("quantity") || undefined} />
                        {e("quantity") && <p className="mt-1 text-danger-700">{e("quantity")}</p>}
                      </td>
                      <td className="order-5 md:table-cell md:px-3 md:py-2">
                        <MobileLabel>Unit price</MobileLabel>
                        <div className="relative">
                          <span aria-hidden className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-navy-600">$</span>
                          <Input aria-label={`Line ${i + 1} unit price in dollars`} data-field={`lines.${i}.unitPrice`} inputMode="decimal" value={l.unitPrice} onChange={(ev) => setLine(l.key, { unitPrice: ev.target.value })} className="h-10 pl-6" aria-invalid={!!e("unitPrice") || undefined} />
                        </div>
                        {e("unitPrice") && <p className="mt-1 text-danger-700">{e("unitPrice")}</p>}
                      </td>
                      <td className={cn("order-6 min-w-20 text-right font-semibold tabular-nums md:table-cell md:px-3 md:py-2 md:pt-4", amount < 0 && "text-success-700")}>
                        <MobileLabel>Amount</MobileLabel>
                        <span className="flex h-10 items-center justify-end md:block md:h-auto">{formatCents(amount)}</span>
                      </td>
                      <td className="order-2 justify-self-end md:table-cell md:px-2 md:py-2">
                        <button
                          type="button"
                          onClick={() => setLines((ls) => ls.filter((x) => x.key !== l.key))}
                          disabled={lines.length === 1}
                          className="flex size-10 cursor-pointer items-center justify-center rounded-control text-navy-600 hover:bg-danger-100 hover:text-danger-700 disabled:cursor-not-allowed disabled:opacity-30"
                        >
                          <Trash2 aria-hidden className="size-4" />
                          <span className="sr-only">Remove line {i + 1}</span>
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            {quickAdd.map((q) => (
              <Button
                key={q.type}
                type="button"
                variant="outline"
                size="sm"
                onClick={() => {
                  const line = withKey({ type: q.type, description: q.description, quantity: "1", unitPrice: q.type === "TRIP_FEE" ? site.quoteDefaults.tripFee : "" });
                  setLines((ls) => [...ls, line]);
                  requestAnimationFrame(() => document.querySelector<HTMLElement>(`[data-field="lines.${lines.length}.description"]`)?.focus());
                }}
              >
                <Plus aria-hidden />
                {typeLabel[q.type]}
              </Button>
            ))}
          </div>
        </section>

        <section aria-labelledby="tax-h" className="space-y-4">
          <h2 id="tax-h" className="font-bold">Tax and payment</h2>
          <div className="grid gap-4 sm:grid-cols-[160px_1fr] sm:items-start">
            <Field id="taxRatePercent" label="Sales tax (%)" error={err("taxRatePercent")}>
              <Input id="taxRatePercent" data-field="taxRatePercent" inputMode="decimal" value={form.taxRatePercent} onChange={(e) => set("taxRatePercent", e.target.value)} aria-invalid={!!err("taxRatePercent") || undefined} />
            </Field>
            <p className="text-sm text-navy-600 sm:pt-7">
              Payment is due on completion, with no deposit. The client accepts for free; mark the job complete on the quote page to send them the payment link.
            </p>
          </div>
        </section>

        <section aria-labelledby="scope-h" className="space-y-4">
          <h2 id="scope-h" className="font-bold">Scope</h2>
          <Field id="scopeOfWork" label="Scope of work" error={err("scopeOfWork")} hint="What you'll do, in plain language. The client reads this before the price.">
            <Textarea id="scopeOfWork" data-field="scopeOfWork" rows={6} value={form.scopeOfWork} onChange={(e) => set("scopeOfWork", e.target.value)} aria-invalid={!!err("scopeOfWork") || undefined} />
          </Field>
          <Field id="exclusions" label="Not included" optional hint="Anything a client might assume is included but isn't.">
            <Textarea id="exclusions" rows={3} className="min-h-24" value={form.exclusions} onChange={(e) => set("exclusions", e.target.value)} />
          </Field>
        </section>
      </div>

      <aside className="xl:sticky xl:top-6 xl:self-start">
        <div className="rounded-panel border border-navy-200 bg-white">
          <div className="border-b border-navy-200 p-5">
            <p className="text-sm text-navy-600">For request #{lead.number}</p>
            <p className="font-semibold">{lead.name}</p>
            <p className="text-sm break-all text-navy-600">{lead.email}</p>
            <p className="text-sm text-navy-600">{lead.address}</p>
          </div>
          <dl className="space-y-2 p-5 tabular-nums">
            <Row term="Subtotal" value={formatCents(totals?.subtotalCents ?? 0)} />
            <Row term={`Tax (${form.taxRatePercent || 0}%)`} value={formatCents(totals?.taxCents ?? 0)} />
            <div className="flex items-baseline justify-between gap-4 border-t-2 border-navy-950 pt-3">
              <dt className="font-bold">Total</dt>
              <dd className="font-wide text-2xl font-extrabold" data-testid="builder-total">{formatCents(totals?.totalCents ?? 0)}</dd>
            </div>
            <Row term="Due" value="On completion" />
          </dl>
          <div className="space-y-2 border-t border-navy-200 p-5">
            {notice && (
              <p role="status" className="text-sm font-medium text-success-700">
                {notice}
              </p>
            )}
            {!confirming ? (
              <>
                <Button type="button" className="w-full" onClick={() => validate() && setConfirming(true)} disabled={pending}>
                  <Send aria-hidden />
                  Send quote
                </Button>
                <Button type="button" variant="outline" className="w-full" onClick={save} disabled={pending}>
                  {pending ? "Saving…" : "Save draft"}
                </Button>
              </>
            ) : (
              <div role="alertdialog" aria-labelledby="confirm-h" className="rounded-control bg-stone-100 p-4">
                <p id="confirm-h" className="font-semibold">
                  Send {formatCents(totals?.totalCents ?? 0)} quote to {lead.email}?
                </p>
                <p className="mt-1 text-sm text-navy-600">They&apos;ll get an email with a private link. You can&apos;t edit it after it&apos;s sent.</p>
                <div className="mt-3 flex gap-2">
                  <Button type="button" onClick={send} disabled={pending} autoFocus>
                    {pending ? "Sending…" : "Confirm and send"}
                  </Button>
                  <Button type="button" variant="ghost" onClick={() => setConfirming(false)} disabled={pending}>
                    Cancel
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>
        {lead.photos > 0 && (
          <p className="mt-3 px-1 text-sm text-navy-600">
            {lead.photos === 1 ? "The client's photo appears on their quote." : `The client's ${lead.photos} photos appear on their quote.`}
          </p>
        )}
      </aside>
    </div>
  );
}

function Row({ term, value }: { term: string; value: string }) {
  return (
    <div className="flex justify-between gap-4 text-navy-700">
      <dt>{term}</dt>
      <dd>{value}</dd>
    </div>
  );
}

/** Column headings are hidden on phones, so each small field carries its own label there. */
function MobileLabel({ children }: { children: React.ReactNode }) {
  return (
    <span aria-hidden className="mb-1 block text-sm font-semibold text-navy-600 md:hidden">
      {children}
    </span>
  );
}
