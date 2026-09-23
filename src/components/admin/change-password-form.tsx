"use client";

import { useState, useTransition } from "react";
import { changeOwnPassword } from "@/app/admin/team-actions";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/field";

export function ChangePasswordForm({ required }: { required: boolean }) {
  const [v, setV] = useState({ current: "", next: "", confirm: "" });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [done, setDone] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const set = (k: keyof typeof v, val: string) => {
    setV((x) => ({ ...x, [k]: val }));
    setErrors((e) => Object.fromEntries(Object.entries(e).filter(([key]) => key !== k && key !== "form")));
    setDone(null);
  };
  const aria = (k: string) => ({ "aria-invalid": errors[k] ? true : undefined, "aria-describedby": errors[k] ? `${k}-error` : undefined });

  return (
    <form
      noValidate
      className="flex flex-col gap-4"
      onSubmit={(e) => {
        e.preventDefault();
        start(async () => {
          const r = await changeOwnPassword(v);
          if (!r.ok) setErrors(r.errors);
          else {
            setDone(r.message);
            setV({ current: "", next: "", confirm: "" });
          }
        });
      }}
    >
      <Field id="current" label={required ? "Temporary password" : "Current password"} error={errors.current}>
        <Input id="current" type="password" autoComplete="current-password" value={v.current} onChange={(e) => set("current", e.target.value)} {...aria("current")} />
      </Field>
      <Field id="next" label="New password" hint="At least 12 characters. A short phrase is easier to remember than a jumble." error={errors.next}>
        <Input id="next" type="password" autoComplete="new-password" value={v.next} onChange={(e) => set("next", e.target.value)} {...aria("next")} />
      </Field>
      <Field id="confirm" label="New password again" error={errors.confirm}>
        <Input id="confirm" type="password" autoComplete="new-password" value={v.confirm} onChange={(e) => set("confirm", e.target.value)} {...aria("confirm")} />
      </Field>
      {errors.form && (
        <p role="alert" className="rounded-control bg-danger-100 px-3 py-2 text-sm font-medium text-danger-700">
          {errors.form}
        </p>
      )}
      <p role="status" className="text-sm font-medium text-success-700">
        {done}
      </p>
      <Button type="submit" variant="dark" size="lg" disabled={pending}>
        {pending ? "Saving…" : required ? "Set password and continue" : "Change password"}
      </Button>
    </form>
  );
}
