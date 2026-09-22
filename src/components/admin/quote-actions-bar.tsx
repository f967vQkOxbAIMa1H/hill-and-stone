"use client";

import { Check, Copy, ExternalLink, Mail, Ban } from "lucide-react";
import { useState, useTransition } from "react";
import { resendQuote, voidQuote } from "@/app/admin/actions";
import { Button, buttonVariants } from "@/components/ui/button";

export function QuoteActionsBar({ quoteId, url, canResend, canVoid }: { quoteId: string; url: string | null; canResend: boolean; canVoid: boolean }) {
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
        {canVoid && !confirmVoid && (
          <Button type="button" variant="ghost" size="sm" className="text-danger-700" onClick={() => setConfirmVoid(true)}>
            <Ban aria-hidden />
            Void quote
          </Button>
        )}
      </div>
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
