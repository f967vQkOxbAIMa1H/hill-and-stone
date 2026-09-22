"use client";

import { CheckCircle2, Lock, Mail, Phone } from "lucide-react";
import { useRouter } from "next/navigation";
import { useId, useRef, useState } from "react";
import { Button, buttonVariants } from "@/components/ui/button";
import { Textarea } from "@/components/ui/field";
import { RadioTiles } from "@/components/ui/radio-tiles";
import { formatCents } from "@/lib/money";
import { declineReasons, type DeclineReason, type PaymentOption, type PortalState } from "@/lib/quotes/state";
import { site } from "@/lib/site";
import { cn } from "@/lib/utils";

export type ActionProps = {
  token: string;
  number: number;
  state: PortalState;
  totalCents: number;
  /** e.g. "Deposit (50%)"; null when the quote is paid in one go. */
  depositLabel: string | null;
  depositCents: number;
  balanceCents: number;
  payments: { id: string; amountCents: number; paidAt: string; method: string; receiptUrl: string | null }[];
  declinedAt: string | null;
  validUntil: string | null;
};

const dateFmt = new Intl.DateTimeFormat("en-US", { month: "long", day: "numeric", year: "numeric", timeZone: "America/Chicago" });
const fmtDate = (iso: string) => dateFmt.format(new Date(iso));

export function QuoteActions(props: ActionProps) {
  const { state } = props;
  return (
    <>
      <div id="pay" className="scroll-mt-6 rounded-panel bg-navy-950 p-6 text-stone-50 sm:p-8">
        {state === "open" && <OpenPanel {...props} />}
        {state === "partially_paid" && <BalancePanel {...props} />}
        {state === "paid" && <PaidPanel {...props} />}
        {state === "declined" && (
          <StatusPanel title="You declined this quote" body={`Declined on ${props.declinedAt ? fmtDate(props.declinedAt) : "an earlier date"}. Thanks for letting us know. If you change your mind, contact us and we'll reopen it or put together a new one.`} number={props.number} />
        )}
        {state === "expired" && (
          <StatusPanel title="This quote has expired" body={`It was valid until ${props.validUntil ? fmtDate(props.validUntil) : "an earlier date"}. Material prices and our schedule may have changed, so we'll need to confirm before starting.`} number={props.number} ask="Ask for an updated quote" />
        )}
        {state === "void" && (
          <StatusPanel title="This quote was withdrawn" body="We've replaced or withdrawn this quote. If you have questions about it, get in touch." number={props.number} />
        )}
      </div>

      {(state === "open" || state === "partially_paid") && (
        // Phones: keep the next step in reach while reading the breakdown.
        <div className="fixed inset-x-0 bottom-0 z-30 border-t border-navy-800 bg-navy-950 px-5 py-3 text-stone-50 lg:hidden">
          <div className="mx-auto flex max-w-xl items-center justify-between gap-4">
            <div>
              <p className="text-sm text-navy-300">{state === "open" ? "Quote total" : "Balance due"}</p>
              <p className="font-wide text-xl font-extrabold tabular-nums">{formatCents(state === "open" ? props.totalCents : props.balanceCents)}</p>
            </div>
            <a href="#pay" className={buttonVariants({ size: "md" })}>
              {state === "open" ? "Review and pay" : "Pay balance"}
            </a>
          </div>
        </div>
      )}
    </>
  );
}

// ─── States ─────────────────────────────────────────────────────────────────

function OpenPanel({ token, totalCents, depositLabel, depositCents }: ActionProps) {
  const hasDeposit = depositLabel !== null;
  const [option, setOption] = useState<PaymentOption>(hasDeposit ? "deposit" : "full");
  const amount = option === "deposit" ? depositCents : totalCents;
  const decline = useRef<HTMLDialogElement>(null);
  const opener = useRef<HTMLButtonElement>(null);

  return (
    <>
      <h2 className="font-semiwide text-lg font-bold">Accept this quote</h2>
      {hasDeposit ? (
        <fieldset className="mt-5">
          <legend className="text-sm text-navy-300">How much would you like to pay now?</legend>
          <div className="mt-2 flex flex-col gap-2">
            <PayOption name="pay" checked={option === "deposit"} onChange={() => setOption("deposit")} label={depositLabel!} amount={depositCents} note="Balance due when the work is done" />
            <PayOption name="pay" checked={option === "full"} onChange={() => setOption("full")} label="Pay in full" amount={totalCents} note="Nothing more to pay later" />
          </div>
        </fieldset>
      ) : (
        <div className="mt-5">
          <p className="text-sm text-navy-300">Amount due</p>
          <p className="font-wide text-4xl font-extrabold tabular-nums">{formatCents(totalCents)}</p>
        </div>
      )}

      <PayButton token={token} option={option} label={`Accept and pay ${formatCents(amount)}`} />
      <p className="mt-3 text-sm text-navy-300">By accepting, you approve the scope and price in this quote.</p>

      <div className="mt-6 border-t border-navy-800 pt-5">
        <button
          ref={opener}
          type="button"
          onClick={() => decline.current?.showModal()}
          className="cursor-pointer text-sm font-semibold text-navy-300 underline underline-offset-4 hover:text-stone-50"
        >
          Decline this quote
        </button>
      </div>
      <DeclineDialog dialog={decline} token={token} onClose={() => opener.current?.focus()} />
    </>
  );
}

function BalancePanel({ token, balanceCents, totalCents, payments }: ActionProps) {
  return (
    <>
      <p className="inline-flex items-center gap-2 text-sm font-semibold text-copper-500">
        <CheckCircle2 aria-hidden className="size-4" />
        Accepted
      </p>
      <h2 className="mt-2 font-semiwide text-lg font-bold">Deposit received</h2>
      <PaymentList payments={payments} />
      <div className="mt-5 flex items-baseline justify-between gap-4 border-t border-navy-800 pt-4">
        <p className="text-navy-300">Balance due</p>
        <p className="font-wide text-3xl font-extrabold tabular-nums">{formatCents(balanceCents)}</p>
      </div>
      <p className="mt-1 text-sm text-navy-300">
        Of {formatCents(totalCents)} total. It&apos;s due when the work is done; you can also pay it now.
      </p>
      <PayButton token={token} option="balance" label={`Pay remaining ${formatCents(balanceCents)}`} variant="outline-light" />
    </>
  );
}

function PaidPanel({ totalCents, payments }: ActionProps) {
  return (
    <>
      <p className="inline-flex items-center gap-2 text-sm font-semibold text-copper-500">
        <CheckCircle2 aria-hidden className="size-4" />
        Paid in full
      </p>
      <p className="mt-2 font-wide text-4xl font-extrabold tabular-nums">{formatCents(totalCents)}</p>
      <PaymentList payments={payments} />
      <p className="mt-5 text-sm text-navy-300">We&apos;ll contact you to confirm your start date. Receipts were sent by email.</p>
    </>
  );
}

function StatusPanel({ title, body, number, ask = "Contact us" }: { title: string; body: string; number: number; ask?: string }) {
  return (
    <>
      <h2 className="font-semiwide text-lg font-bold">{title}</h2>
      <p className="mt-3 text-navy-300">{body}</p>
      <div className="mt-6 flex flex-col gap-3">
        <a href={`mailto:${site.email}?subject=${encodeURIComponent(`Quote #${number}`)}`} className={buttonVariants({ size: "md" })}>
          <Mail aria-hidden />
          {ask}
        </a>
        <a href={site.phoneHref} className={buttonVariants({ variant: "outline-light", size: "md" })}>
          <Phone aria-hidden />
          {site.phone}
        </a>
      </div>
    </>
  );
}

// ─── Pieces ─────────────────────────────────────────────────────────────────

function PayOption({ name, checked, onChange, label, amount, note }: { name: string; checked: boolean; onChange: () => void; label: string; amount: number; note: string }) {
  return (
    <label
      className={cn(
        "flex cursor-pointer items-center justify-between gap-4 rounded-control border px-4 py-3 transition-colors",
        "has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-copper-500",
        checked ? "border-copper-500 bg-navy-900" : "border-navy-700 hover:border-navy-400",
      )}
    >
      <input type="radio" name={name} checked={checked} onChange={onChange} className="sr-only" />
      <span className="flex items-center gap-3">
        <span aria-hidden className={cn("flex size-4 shrink-0 items-center justify-center rounded-full border-2", checked ? "border-copper-500" : "border-navy-400")}>
          {checked && <span className="size-2 rounded-full bg-copper-500" />}
        </span>
        <span>
          <span className="block font-semibold">{label}</span>
          <span className="block text-sm text-navy-300">{note}</span>
        </span>
      </span>
      <span className="font-wide text-lg font-extrabold tabular-nums">{formatCents(amount)}</span>
    </label>
  );
}

function PayButton({ token, option, label, variant = "primary" }: { token: string; option: PaymentOption; label: string; variant?: "primary" | "outline-light" }) {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function pay() {
    setPending(true);
    setError(null);
    try {
      const res = await fetch(`/api/quotes/${token}/checkout`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ option }),
      });
      const data = (await res.json()) as { url?: string; error?: string };
      if (!res.ok || !data.url) throw new Error(data.error ?? "Checkout didn't open. Try again.");
      window.location.assign(data.url);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Checkout didn't open. Try again.");
      setPending(false);
    }
  }

  return (
    <div className="mt-6">
      <Button type="button" size="lg" variant={variant} onClick={pay} disabled={pending} className="w-full whitespace-normal text-center">
        <Lock aria-hidden />
        {pending ? "Opening secure checkout…" : label}
      </Button>
      <p className="mt-3 text-sm text-navy-300">Secure checkout by Stripe. Pay by card, Apple Pay or Cash App Pay.</p>
      {error && (
        <p role="alert" className="mt-3 rounded-control bg-danger-100 px-3 py-2 text-sm font-medium text-danger-700">
          {error}
        </p>
      )}
    </div>
  );
}

function PaymentList({ payments }: { payments: ActionProps["payments"] }) {
  if (!payments.length) return null;
  return (
    <ul className="mt-4 space-y-2 text-sm">
      {payments.map((p) => (
        <li key={p.id} className="flex justify-between gap-4">
          <span className="text-navy-300">
            {fmtDate(p.paidAt)}, {p.method}
            {p.receiptUrl && (
              <>
                {" "}
                <a href={p.receiptUrl} target="_blank" rel="noopener noreferrer" className="text-stone-50 underline underline-offset-4">
                  Receipt
                </a>
              </>
            )}
          </span>
          <span className="font-semibold tabular-nums">{formatCents(p.amountCents)}</span>
        </li>
      ))}
    </ul>
  );
}

function DeclineDialog({ dialog, token, onClose }: { dialog: React.RefObject<HTMLDialogElement | null>; token: string; onClose: () => void }) {
  const router = useRouter();
  const noteId = useId();
  const [reason, setReason] = useState<DeclineReason | "">("");
  const [note, setNote] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!reason) {
      setError("Choose a reason.");
      document.getElementById("declineReason")?.focus();
      return;
    }
    setPending(true);
    setError(null);
    try {
      const res = await fetch(`/api/quotes/${token}/decline`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason, note }),
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) throw new Error(data.error ?? "Your response didn't save. Try again.");
      dialog.current?.close();
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Your response didn't save. Try again.");
      setPending(false);
    }
  }

  return (
    <dialog
      ref={dialog}
      aria-labelledby="decline-title"
      onClose={onClose}
      onClick={(e) => e.target === e.currentTarget && e.currentTarget.close()}
      className="project-dialog m-auto w-[min(100%-1.5rem,560px)] max-w-none rounded-panel bg-stone-50 p-0 text-navy-950 shadow-overlay backdrop:bg-navy-950/70"
    >
      <form onSubmit={submit} className="p-6 sm:p-8">
        <h2 id="decline-title" className="font-semiwide text-2xl font-bold">
          Decline this quote?
        </h2>
        <p className="mt-2 text-navy-700">We&apos;ll let the team know. A reason helps us quote better next time.</p>
        <div className="mt-6">
          <RadioTiles
            name="declineReason"
            legend="Why are you declining?"
            options={declineReasons.map((r) => ({ value: r.value, label: r.label }))}
            value={reason}
            onChange={(v) => {
              setReason(v);
              setError(null);
            }}
            error={error === "Choose a reason." ? error : undefined}
            columns="sm:grid-cols-1"
          />
        </div>
        <div className="mt-5 flex flex-col gap-1.5">
          <label htmlFor={noteId} className="text-sm font-semibold">
            Anything else we should know? <span className="font-normal text-navy-600">(optional)</span>
          </label>
          <Textarea id={noteId} rows={3} className="min-h-24" maxLength={1000} value={note} onChange={(e) => setNote(e.target.value)} />
        </div>
        {error && error !== "Choose a reason." && (
          <p role="alert" className="mt-4 rounded-control bg-danger-100 px-3 py-2 text-sm font-medium text-danger-700">
            {error}
          </p>
        )}
        <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <Button type="button" variant="ghost" onClick={() => dialog.current?.close()}>
            Keep this quote
          </Button>
          <Button type="submit" variant="danger" disabled={pending}>
            {pending ? "Declining…" : "Decline quote"}
          </Button>
        </div>
      </form>
    </dialog>
  );
}
