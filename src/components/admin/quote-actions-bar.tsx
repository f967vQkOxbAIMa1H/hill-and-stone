"use client";

import { Ban, Check, Copy, ExternalLink, Mail, Receipt } from "lucide-react";
import { useState, useTransition } from "react";
import { requestBalancePayment, resendQuote, voidQuote } from "@/app/admin/actions";
import { Textarea } from "@/components/ui/field";
import { Button, buttonVariants } from "@/components/ui/button";

export function QuoteActionsBar({
  quoteId,
  url,
  canResend,
  canVoid,
  balanceDue,
  clientEmail,
}: {
  quoteId: string;
  url: string | null;
  canResend: boolean;
  canVoid: boolean;
  /** Formatted balance (e.g. "$412.95") when a balance request can be sent. */
  balanceDue: string | null;
  clientEmail: string;
}) {
  const [billing, setBilling] = useState(false);
  const [note, setNote] = useState("");
  const [copied, setCopied] = useState(false);
  const [message, setMessage] = useState<{ tone: "ok" | "error"; text: string } | null>(null);
  const [confirmVoid, setConfirmVoid] = useState(false);
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
            Request balance payment
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
            Email {clientEmail} a request for the {balanceDue} balance?
          </p>
          <p className="mt-1 text-sm text-navy-600">They get a link to pay it online from their quote. Send this once the job is finished.</p>
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
