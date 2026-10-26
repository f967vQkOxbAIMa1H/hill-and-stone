"use client";

import { Ban, Banknote, Check, Copy, ExternalLink, Mail, Receipt } from "lucide-react";
import { useState, useTransition } from "react";
import { recordPaymentOffline, requestBalancePayment, resendQuote, voidQuote } from "@/app/admin/actions";
import { Input, Textarea } from "@/components/ui/field";
import { offlineMethods, type OfflineMethod } from "@/lib/quotes/state";
import { Button, buttonVariants } from "@/components/ui/button";

export function QuoteActionsBar({
  quoteId,
  url,
  canResend,
  canVoid,
  balanceDue,
  balanceDollars,
  paymentRequested,
  clientEmail,
}: {
  quoteId: string;
  url: string | null;
  canResend: boolean;
  canVoid: boolean;
  /** Formatted balance (e.g. "$412.95") when the job can be marked complete and billed. */
  balanceDue: string | null;
  /** The same balance as plain dollars ("412.95"), to prefill a cash or check payment. */
  balanceDollars: string | null;
  /** True once the client has been asked to pay; the button then sends a reminder. */
  paymentRequested: boolean;
  clientEmail: string;
}) {
  const [billing, setBilling] = useState(false);
  const [note, setNote] = useState("");
  const [copied, setCopied] = useState(false);
  const [message, setMessage] = useState<{ tone: "ok" | "error"; text: string } | null>(null);
  const [confirmVoid, setConfirmVoid] = useState(false);
  const [recording, setRecording] = useState(false);
  const [payMethod, setPayMethod] = useState<OfflineMethod>("cash");
  const [payAmount, setPayAmount] = useState(balanceDollars ?? "");
  const [payNote, setPayNote] = useState("");
  const [pending, start] = useTransition();

  return (
    <div>
      <div className="flex flex-wrap gap-2">
        {url && (
          <>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={async () => {
                await navigator.clipboard.writeText(url);
                setCopied(true);
                setTimeout(() => setCopied(false), 2000);
              }}
            >
              {copied ? <Check aria-hidden /> : <Copy aria-hidden />}
              {copied ? "Link copied" : "Copy client link"}
            </Button>
            <a href={url} target="_blank" rel="noopener noreferrer" className={buttonVariants({ variant: "outline", size: "sm" })}>
              <ExternalLink aria-hidden />
              Open client view
            </a>
          </>
        )}
        {canResend && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={pending}
            onClick={() =>
              start(async () => {
                const r = await resendQuote(quoteId);
                setMessage(r.error ? { tone: "error", text: r.error } : { tone: "ok", text: "Quote email sent again." });
              })
            }
          >
            <Mail aria-hidden />
            Resend email
          </Button>
        )}
        {balanceDue && !billing && (
          <Button type="button" size="sm" onClick={() => setBilling(true)}>
            <Receipt aria-hidden />
            {paymentRequested ? "Resend payment request" : "Mark complete and request payment"}
          </Button>
        )}
        {balanceDue && !recording && (
          <Button type="button" variant="outline" size="sm" onClick={() => setRecording(true)}>
            <Banknote aria-hidden />
            Record cash or check payment
          </Button>
        )}
        {canVoid && !confirmVoid && (
          <Button type="button" variant="ghost" size="sm" className="text-danger-700" onClick={() => setConfirmVoid(true)}>
            <Ban aria-hidden />
            Void quote
          </Button>
        )}
      </div>
      {billing && balanceDue && (
        <div role="alertdialog" aria-labelledby="bill-h" className="mt-3 max-w-lg rounded-control border border-navy-200 bg-white p-4">
          <p id="bill-h" className="font-semibold">
            {paymentRequested ? `Remind ${clientEmail} that ${balanceDue} is due?` : `Mark the job complete and ask ${clientEmail} to pay ${balanceDue}?`}
          </p>
          <p className="mt-1 text-sm text-navy-600">
            Payment is due on completion. They get an email with a link to pay online by card, Apple Pay or Google Pay; their quote can&apos;t be paid until you send this.
          </p>
          <label htmlFor="bill-note" className="mt-3 block text-sm font-semibold">
            Note to include <span className="font-normal text-navy-600">(optional)</span>
          </label>
          <Textarea id="bill-note" rows={2} className="mt-1 min-h-16" maxLength={1000} placeholder="Thanks again. We left the extra paint in the garage." value={note} onChange={(e) => setNote(e.target.value)} />
          <div className="mt-3 flex gap-2">
            <Button
              type="button"
              size="sm"
              disabled={pending}
              autoFocus
              onClick={() =>
                start(async () => {
                  const r = await requestBalancePayment(quoteId, note);
                  setBilling(false);
                  setNote("");
                  setMessage({ tone: r.ok ? "ok" : "error", text: r.message });
                })
              }
            >
              {pending ? "Sending…" : `Send request for ${balanceDue}`}
            </Button>
            <Button type="button" variant="ghost" size="sm" onClick={() => setBilling(false)}>
              Cancel
            </Button>
          </div>
        </div>
      )}
      {recording && balanceDue && (
        <div role="alertdialog" aria-labelledby="pay-h" className="mt-3 max-w-lg rounded-control border border-navy-200 bg-white p-4">
          <p id="pay-h" className="font-semibold">Record a payment you received in person</p>
          <p className="mt-1 text-sm text-navy-600">For cash, a check or anything outside online checkout. {balanceDue} is due. The client gets a receipt.</p>
          <fieldset className="mt-3">
            <legend className="text-sm font-semibold">How they paid</legend>
            <div className="mt-1.5 flex flex-wrap gap-2">
              {offlineMethods.map((m) => (
                <label key={m.value} className="flex h-11 cursor-pointer items-center rounded-control border border-navy-300 bg-white px-3 has-[:checked]:border-navy-950 has-[:checked]:bg-navy-950 has-[:checked]:text-stone-50 has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-accent-500">
                  <input type="radio" name="payMethod" value={m.value} checked={payMethod === m.value} onChange={() => setPayMethod(m.value)} className="sr-only" />
                  {m.label}
                </label>
              ))}
            </div>
          </fieldset>
          <div className="mt-3 grid gap-3 sm:grid-cols-[160px_1fr]">
            <div>
              <label htmlFor="pay-amount" className="text-sm font-semibold">Amount</label>
              <div className="relative mt-1">
                <span aria-hidden className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-navy-600">$</span>
                <Input id="pay-amount" inputMode="decimal" value={payAmount} onChange={(e) => setPayAmount(e.target.value)} className="pl-6" />
              </div>
            </div>
            <div>
              <label htmlFor="pay-note" className="text-sm font-semibold">
                Note <span className="font-normal text-navy-600">(optional)</span>
              </label>
              <Input id="pay-note" className="mt-1" maxLength={200} placeholder="Check #1042" value={payNote} onChange={(e) => setPayNote(e.target.value)} />
            </div>
          </div>
          <div className="mt-3 flex gap-2">
            <Button
              type="button"
              size="sm"
              disabled={pending}
              onClick={() =>
                start(async () => {
                  const r = await recordPaymentOffline(quoteId, { method: payMethod, amount: payAmount, note: payNote });
                  if (r.ok) {
                    setRecording(false);
                    setPayNote("");
                  }
                  setMessage({ tone: r.ok ? "ok" : "error", text: r.message });
                })
              }
            >
              {pending ? "Recording…" : `Record ${payAmount ? `$${payAmount.replace(/^\$/, "")}` : "payment"}`}
            </Button>
            <Button type="button" variant="ghost" size="sm" onClick={() => setRecording(false)}>
              Cancel
            </Button>
          </div>
        </div>
      )}
      {confirmVoid && (
        <div role="alertdialog" aria-labelledby="void-h" className="mt-3 max-w-md rounded-control border border-danger-700/30 bg-danger-100 p-4">
          <p id="void-h" className="font-semibold text-danger-700">Void this quote?</p>
          <p className="mt-1 text-sm text-navy-700">The client&apos;s link will show it as withdrawn and it can&apos;t be paid. This can&apos;t be undone.</p>
          <div className="mt-3 flex gap-2">
            <Button
              type="button"
              variant="danger"
              size="sm"
              disabled={pending}
              autoFocus
              onClick={() =>
                start(async () => {
                  const r = await voidQuote(quoteId);
                  setConfirmVoid(false);
                  setMessage(r.error ? { tone: "error", text: r.error } : { tone: "ok", text: "Quote voided." });
                })
              }
            >
              {pending ? "Voiding…" : "Void quote"}
            </Button>
            <Button type="button" variant="ghost" size="sm" onClick={() => setConfirmVoid(false)}>
              Keep it
            </Button>
          </div>
        </div>
      )}
      <p aria-live="polite" className={message?.tone === "error" ? "mt-2 text-sm font-medium text-danger-700" : "mt-2 text-sm font-medium text-success-700"}>
        {message?.text}
      </p>
    </div>
  );
}
