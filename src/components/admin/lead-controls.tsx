"use client";

import { useState, useTransition } from "react";
import { addLeadNote, updateLeadStatus } from "@/app/admin/actions";
import { Button } from "@/components/ui/button";
import { Select, Textarea } from "@/components/ui/field";
import type { LeadStatus } from "@/generated/prisma/enums";
import { leadStatus, leadStatusOrder } from "@/lib/admin/labels";

export function LeadStatusSelect({ leadId, status }: { leadId: string; status: LeadStatus }) {
  const [value, setValue] = useState(status);
  const [pending, start] = useTransition();
  const [message, setMessage] = useState<string | null>(null);

  return (
    <div>
      <label htmlFor="lead-status" className="text-sm font-semibold">
        Status
      </label>
      <div className="mt-1.5 flex gap-2">
        <Select id="lead-status" value={value} onChange={(e) => setValue(e.target.value as LeadStatus)} className="min-w-44">
          {leadStatusOrder.map((s) => (
            <option key={s} value={s}>
              {leadStatus[s].label}
            </option>
          ))}
        </Select>
        <Button
          type="button"
          variant="dark"
          disabled={pending || value === status}
          onClick={() =>
            start(async () => {
              const r = await updateLeadStatus(leadId, value);
              setMessage(r.error ?? `Status set to ${leadStatus[value].label.toLowerCase()}.`);
            })
          }
        >
          {pending ? "Saving…" : "Update"}
        </Button>
      </div>
      <p aria-live="polite" className="mt-1.5 min-h-5 text-sm text-navy-600">
        {message}
      </p>
    </div>
  );
}

export function NoteForm({ leadId }: { leadId: string }) {
  const [body, setBody] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        start(async () => {
          const r = await addLeadNote(leadId, body);
          if (r.error) setError(r.error);
          else {
            setBody("");
            setError(null);
          }
        });
      }}
    >
      <label htmlFor="note" className="sr-only">
        Add a note
      </label>
      <Textarea id="note" rows={3} className="min-h-20" placeholder="Called, left voicemail. Visit booked for Thursday 9am…" value={body} onChange={(e) => setBody(e.target.value)} />
      {error && <p className="mt-1 text-sm font-medium text-danger-700">{error}</p>}
      <Button type="submit" size="sm" variant="outline" className="mt-2" disabled={pending || !body.trim()}>
        {pending ? "Adding…" : "Add note"}
      </Button>
    </form>
  );
}
