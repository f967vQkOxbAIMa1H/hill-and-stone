"use client";

import { CalendarCheck, CheckCircle2, Lock, Mail, Phone } from "lucide-react";
import { useRouter } from "next/navigation";
import { useId, useRef, useState } from "react";
import { Button, buttonVariants } from "@/components/ui/button";
import { Textarea } from "@/components/ui/field";
import { RadioTiles } from "@/components/ui/radio-tiles";
import { track } from "@/lib/analytics";
import { formatCents } from "@/lib/money";
import { declineReasons, type DeclineReason, type PortalState } from "@/lib/quotes/state";
import { useSite } from "@/components/site-provider";

export type ActionProps = {
  token: string;
  number: number;
  state: PortalState;
  totalCents: number;
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
        {state === "accepted" && <AcceptedPanel {...props} />}
        {state === "payment_due" && <PaymentDuePanel {...props} />}
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

      {(state === "open" || state === "payment_due") && (
        // Phones: keep the next step in reach while reading the breakdown.
        <div className="fixed inset-x-0 bottom-0 z-30 border-t border-navy-800 bg-navy-950 px-5 py-3 text-stone-50 lg:hidden">
          <div className="mx-auto flex max-w-xl items-center justify-between gap-4">
            <div>
              <p className="text-sm text-navy-300">{state === "open" ? "Quote total" : "Amount due"}</p>
              <p className="font-wide text-xl font-extrabold tabular-nums">{formatCents(state === "open" ? props.totalCents : props.balanceCents)}</p>
            </div>
            <a href="#pay" className={buttonVariants({ variant: "light", size: "md" })}>
              {state === "open" ? "Review and accept" : "Pay now"}
            </a>
          </div>
        </div>
      )}
    </>
  );
}

// ─── States ─────────────────────────────────────────────────────────────────

function OpenPanel({ token, totalCents }: ActionProps) {
  const decline = useRef<HTMLDialogElement>(null);
  const opener = useRef<HTMLButtonElement>(null);

  return (
    <>
      <h2 className="font-serif text-xl font-medium">Accept this quote</h2>
      <div className="mt-5">
        <p className="text-sm text-navy-300">Quote total</p>
        <p className="font-wide text-4xl font-extrabold tabular-nums">{formatCents(totalCents)}</p>
      </div>
      <p className="mt-4 rounded-control border border-navy-800 px-4 py-3 text-sm text-navy-300">
        <span className="font-semibold text-stone-50">Nothing to pay today.</span> Payment is due when the work is complete and
        you&apos;re happy with it. No deposit, no payment plan.
      </p>

      <AcceptButton token={token} />
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

function AcceptedPanel({ totalCents }: ActionProps) {
  return (
    <>
      <p className="inline-flex items-center gap-2 text-sm font-semibold text-stone-100">
        <CheckCircle2 aria-hidden className="size-4" />
        Accepted
      </p>
      <h2 className="mt-2 font-serif text-xl font-medium">You&apos;re on our schedule</h2>
      <p className="mt-3 text-navy-300">We&apos;ll be in touch to confirm your start date.</p>
      <div className="mt-5 flex gap-3 border-t border-navy-800 pt-5">
        <CalendarCheck aria-hidden className="mt-0.5 size-5 shrink-0 text-stone-100" />
        <p className="text-sm text-navy-300">
          <span className="font-semibold text-stone-50">Nothing is due yet.</span> Once the work is done and we&apos;ve walked it with
          you, we&apos;ll email a link to pay the {formatCents(totalCents)} total here by card, Apple Pay or Google Pay.
        </p>
      </div>
    </>
  );
}

function PaymentDuePanel({ token, balanceCents, totalCents, payments }: ActionProps) {
  return (
    <>
      <p className="inline-flex items-center gap-2 text-sm font-semibold text-stone-100">
        <CheckCircle2 aria-hidden className="size-4" />
        Work complete
      </p>
      <h2 className="mt-2 font-serif text-xl font-medium">Payment due</h2>
      <PaymentList payments={payments} />
      <div className="mt-5 flex items-baseline justify-between gap-4 border-t border-navy-800 pt-4">
        <p className="text-navy-300">Amount due</p>
        <p className="font-wide text-3xl font-extrabold tabular-nums">{formatCents(balanceCents)}</p>
      </div>
      {balanceCents < totalCents && <p className="mt-1 text-sm text-navy-300">Of {formatCents(totalCents)} total.</p>}
      <PayButton token={token} amountCents={balanceCents} label={`Pay ${formatCents(balanceCents)}`} />
    </>
  );
}

function PaidPanel({ totalCents, payments }: ActionProps) {
  return (
    <>
      <p className="inline-flex items-center gap-2 text-sm font-semibold text-stone-100">
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
  const site = useSite();
  return (
    <>
      <h2 className="font-serif text-xl font-medium">{title}</h2>
      <p className="mt-3 text-navy-300">{body}</p>
      <div className="mt-6 flex flex-col gap-3">
        <a href={`mailto:${site.email}?subject=${encodeURIComponent(`Quote #${number}`)}`} className={buttonVariants({ variant: "light", size: "md" })}>
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

function AcceptButton({ token }: { token: string }) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function accept() {
    setPending(true);
    setError(null);
    try {
      const res = await fetch(`/api/quotes/${token}/accept`, { method: "POST" });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) throw new Error(data.error ?? "Your response didn't save. Try again.");
      track("quote_accepted");
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Your response didn't save. Try again.");
      setPending(false);
    }
  }

  return (
    <div className="mt-6">
      <Button type="button" variant="light" size="lg" onClick={accept} disabled={pending} className="w-full whitespace-normal text-center">
        <CheckCircle2 aria-hidden />
        {pending ? "Accepting…" : "Accept quote"}
      </Button>
      {error && (
        <p role="alert" className="mt-3 rounded-control bg-danger-100 px-3 py-2 text-sm font-medium text-danger-700">
          {error}
        </p>
      )}
    </div>
  );
}

function PayButton({ token, label, amountCents }: { token: string; label: string; amountCents: number }) {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function pay() {
    setPending(true);
    setError(null);
    try {
      const res = await fetch(`/api/quotes/${token}/checkout`, {
        method: "POST",
      });
      const data = (await res.json()) as { url?: string; error?: string };
      if (!res.ok || !data.url) throw new Error(data.error ?? "Checkout didn't open. Try again.");
      track("begin_checkout", { currency: "USD", value: amountCents / 100 });
      window.location.assign(data.url);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Checkout didn't open. Try again.");
      setPending(false);
    }
  }

  return (
    <div className="mt-6">
      <Button type="button" variant="light" size="lg" onClick={pay} disabled={pending} className="w-full whitespace-normal text-center">
        <Lock aria-hidden />
        {pending ? "Opening secure checkout…" : label}
      </Button>
      <p className="mt-3 text-sm text-navy-300">Secure checkout by Stripe. Pay by card, Apple Pay or Google Pay.</p>
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
      track("quote_declined", { reason });
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
        <h2 id="decline-title" className="font-serif text-3xl">
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
