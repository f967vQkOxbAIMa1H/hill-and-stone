"use client";

import { Check, Copy, Send } from "lucide-react";
import { useState, useTransition } from "react";
import { sendReviewRequest } from "@/app/admin/actions";
import { Button } from "@/components/ui/button";

/** Review link status for a paid quote: the client's private link, and a way to send or resend it. */
export function ReviewLink({
  quoteId,
  url,
  used,
  canSend,
}: {
  quoteId: string;
  /** The private link, once created. */
  url: string | null;
  used: boolean;
  /** The quote is paid and this role can send it. */
  canSend: boolean;
}) {
  const [copied, setCopied] = useState(false);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);
  const [link, setLink] = useState(url);
  const [pending, start] = useTransition();

  return (
    <section aria-labelledby="review-h" className="rounded-panel border border-navy-200 bg-white p-5">
      <h2 id="review-h" className="font-bold">Review</h2>
      <p className="mt-1 text-sm text-navy-600">
        {used
          ? "The client left a review with their link."
          : link
            ? "The client has a private link to leave one review. It's emailed when the job is paid in full."
            : "Sent automatically when the job is paid in full."}
      </p>
      {!used && (link || canSend) && (
        <div className="mt-3 flex flex-wrap gap-2">
          {link && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={async () => {
                await navigator.clipboard.writeText(link);
                setCopied(true);
                setTimeout(() => setCopied(false), 2000);
              }}
            >
              {copied ? <Check aria-hidden /> : <Copy aria-hidden />}
              {copied ? "Link copied" : "Copy review link"}
            </Button>
          )}
          {canSend && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={pending}
              onClick={() =>
                start(async () => {
                  const r = await sendReviewRequest(quoteId);
                  if (r.url) setLink(r.url);
                  setMessage({ ok: r.ok, text: r.message });
                })
              }
            >
              <Send aria-hidden />
              {pending ? "Sending…" : link ? "Email it again" : "Email review link"}
            </Button>
          )}
        </div>
      )}
      <p aria-live="polite" className={message?.ok === false ? "mt-2 text-sm font-medium text-danger-700" : "mt-2 text-sm font-medium text-success-700"}>
        {message?.text}
      </p>
    </section>
  );
}
