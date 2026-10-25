"use client";

import Link from "next/link";
import { Check, Copy, KeyRound, RefreshCw } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { createStaffUser, resetStaffPassword, setStaffActive, updateStaffUser } from "@/app/admin/team-actions";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Field, Input } from "@/components/ui/field";
import type { StaffInput } from "@/lib/admin/team-schema";
import { roleInfo, staffRoles, type StaffRole } from "@/lib/auth/permissions";
import { cn } from "@/lib/utils";

// Same alphabet as the server generator: nothing that reads ambiguously (0/O, 1/l/i).
const ALPHABET = "abcdefghjkmnpqrstuvwxyz23456789";
function tempPassword() {
  const bytes = crypto.getRandomValues(new Uint32Array(12));
  const chars = Array.from(bytes, (b) => ALPHABET[b % ALPHABET.length]).join("");
  return `${chars.slice(0, 4)}-${chars.slice(4, 8)}-${chars.slice(8)}`;
}

const aria = (errors: Record<string, string>, k: string) => ({ "aria-invalid": errors[k] ? true : undefined, "data-field": k });
const focusFirst = (errors: Record<string, string>) =>
  requestAnimationFrame(() => document.querySelector<HTMLElement>(`[data-field="${Object.keys(errors)[0]}"]`)?.focus());

/** Role picker as tiles, each saying plainly what the role can do. */
function RolePicker({ value, onChange, disabled, error }: { value: StaffRole; onChange: (r: StaffRole) => void; disabled?: boolean; error?: string }) {
  return (
    <fieldset aria-describedby={error ? "role-error" : undefined}>
      <legend className="text-sm font-semibold">Role</legend>
      <div className="mt-2 grid gap-2 sm:grid-cols-2">
        {staffRoles.map((r) => (
          <label
            key={r}
            className={cn(
              "flex cursor-pointer gap-3 rounded-control border bg-white p-3 transition-colors has-[:checked]:border-navy-950 has-[:checked]:ring-1 has-[:checked]:ring-navy-950",
              "has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-accent-500",
              disabled ? "cursor-not-allowed opacity-60" : "border-navy-300 hover:border-navy-600",
            )}
          >
            <input type="radio" name="role" value={r} checked={value === r} disabled={disabled} onChange={() => onChange(r)} className="mt-1 accent-navy-950" data-field={r === staffRoles[0] ? "role" : undefined} />
            <span>
              <span className="block font-semibold">{roleInfo[r].label}</span>
              <span className="block text-sm text-navy-600">{roleInfo[r].description}</span>
            </span>
          </label>
        ))}
      </div>
      {error && (
        <p id="role-error" role="alert" className="mt-1.5 text-sm font-medium text-danger-700">
          {error}
        </p>
      )}
    </fieldset>
  );
}

/** Shown once after creating an account or resetting a password. Never stored in plain text anywhere. */
function TempPasswordReveal({ password, name, children }: { password: string; name: string; children?: React.ReactNode }) {
  const [copied, setCopied] = useState(false);
  return (
    <div role="status" className="rounded-panel border border-accent-500 bg-accent-100 p-5">
      <p className="flex items-center gap-2 font-semibold">
        <KeyRound aria-hidden className="size-4 text-accent-700" />
        Temporary password for {name}
      </p>
      <p className="mt-1 text-sm text-navy-700">Give this to them in person or by text. It won&apos;t be shown again; they&apos;ll choose their own when they sign in.</p>
      <div className="mt-3 flex flex-wrap items-center gap-2">
        <code data-testid="temp-password" className="rounded-control bg-white px-3 py-2 text-lg font-semibold tracking-wide ring-1 ring-navy-200">
          {password}
        </code>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={async () => {
            await navigator.clipboard.writeText(password).catch(() => {});
            setCopied(true);
          }}
        >
          {copied ? <Check aria-hidden /> : <Copy aria-hidden />}
          {copied ? "Copied" : "Copy"}
        </Button>
      </div>
      {children}
    </div>
  );
}

// ─── New account ────────────────────────────────────────────────────────────

/** `initialPassword` comes from the server so the first render matches on both sides. */
export function NewStaffForm({ initialPassword }: { initialPassword: string }) {
  const [v, setV] = useState({ name: "", email: "", phone: "", role: "STAFF" as StaffRole, tempPassword: initialPassword, sendNotice: true });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [created, setCreated] = useState<{ id: string; password: string; message: string; name: string } | null>(null);
  const [pending, start] = useTransition();
  const set = <K extends keyof typeof v>(k: K, val: (typeof v)[K]) => {
    setV((x) => ({ ...x, [k]: val }));
    setErrors((e) => Object.fromEntries(Object.entries(e).filter(([key]) => key !== k && key !== "form")));
  };

  if (created) {
    return (
      <div className="max-w-2xl space-y-4">
        <TempPasswordReveal password={created.password} name={created.name}>
          <p className="mt-3 text-sm text-navy-700">{created.message}</p>
        </TempPasswordReveal>
        <div className="flex flex-wrap gap-2">
          <Link prefetch={false} href={`/admin/team/${created.id}`} className="inline-flex h-11 items-center rounded-control bg-navy-950 px-5 font-semibold text-stone-50 hover:bg-navy-800">
            View account
          </Link>
          <Link prefetch={false} href="/admin/team" className="inline-flex h-11 items-center rounded-control px-5 font-semibold hover:bg-navy-950/5">
            Back to team
          </Link>
        </div>
      </div>
    );
  }

  return (
    <form
      noValidate
      className="max-w-3xl space-y-6"
      onSubmit={(e) => {
        e.preventDefault();
        start(async () => {
          const r = await createStaffUser(v);
          if (!r.ok) {
            setErrors(r.errors);
            focusFirst(r.errors);
            return;
          }
          setCreated({ id: r.id!, password: r.tempPassword!, message: r.message, name: v.name });
        });
      }}
    >
      <div className="grid gap-5 sm:grid-cols-2">
        <Field id="name" label="Full name" error={errors.name}>
          <Input id="name" autoComplete="off" value={v.name} onChange={(e) => set("name", e.target.value)} {...aria(errors, "name")} />
        </Field>
        <Field id="email" label="Email" hint="They sign in with this." error={errors.email}>
          <Input id="email" type="email" autoComplete="off" value={v.email} onChange={(e) => set("email", e.target.value)} {...aria(errors, "email")} />
        </Field>
        <Field id="phone" label="Phone" optional error={errors.phone}>
          <Input id="phone" type="tel" value={v.phone} onChange={(e) => set("phone", e.target.value)} {...aria(errors, "phone")} />
        </Field>
      </div>
      <RolePicker value={v.role} onChange={(r) => set("role", r)} error={errors.role} />
      <div className="rounded-panel border border-navy-200 bg-white p-5">
        <Field id="tempPassword" label="Temporary password" hint="They'll be asked to replace it the first time they sign in." error={errors.tempPassword}>
          <div className="flex gap-2">
            <Input id="tempPassword" autoComplete="off" spellCheck={false} value={v.tempPassword} onChange={(e) => set("tempPassword", e.target.value)} className="font-semibold tracking-wide" {...aria(errors, "tempPassword")} />
            <Button type="button" variant="outline" onClick={() => set("tempPassword", tempPassword())}>
              <RefreshCw aria-hidden />
              Generate
            </Button>
          </div>
        </Field>
        <Checkbox
          id="sendNotice"
          className="mt-4"
          label="Email them that their login is ready"
          hint="The email has the sign-in link but never the password."
          checked={v.sendNotice}
          onChange={(e) => set("sendNotice", e.target.checked)}
        />
      </div>
      {errors.form && <p role="alert" className="text-sm font-medium text-danger-700">{errors.form}</p>}
      <Button type="submit" variant="dark" disabled={pending}>
        {pending ? "Creating…" : "Create account"}
      </Button>
    </form>
  );
}

// ─── Edit account ───────────────────────────────────────────────────────────

export function StaffEditForm({ initial, isSelf }: { initial: StaffInput & { id: string }; isSelf: boolean }) {
  const router = useRouter();
  const [v, setV] = useState(initial);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [notice, setNotice] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const set = <K extends keyof typeof v>(k: K, val: (typeof v)[K]) => {
    setV((x) => ({ ...x, [k]: val }));
    setErrors((e) => Object.fromEntries(Object.entries(e).filter(([key]) => key !== k && key !== "form")));
    setNotice(null);
  };
  return (
    <form
      noValidate
      className="space-y-6"
      onSubmit={(e) => {
        e.preventDefault();
        start(async () => {
          const r = await updateStaffUser(v);
          if (!r.ok) {
            setErrors(r.errors);
            focusFirst(r.errors);
            return;
          }
          setNotice(r.message);
          router.refresh();
        });
      }}
    >
      <div className="grid gap-5 sm:grid-cols-2">
        <Field id="name" label="Full name" error={errors.name}>
          <Input id="name" value={v.name} onChange={(e) => set("name", e.target.value)} {...aria(errors, "name")} />
        </Field>
        <Field id="email" label="Email" error={errors.email}>
          <Input id="email" type="email" value={v.email} onChange={(e) => set("email", e.target.value)} {...aria(errors, "email")} />
        </Field>
        <Field id="phone" label="Phone" optional error={errors.phone}>
          <Input id="phone" type="tel" value={v.phone} onChange={(e) => set("phone", e.target.value)} {...aria(errors, "phone")} />
        </Field>
      </div>
      <RolePicker value={v.role as StaffRole} onChange={(r) => set("role", r)} disabled={isSelf} error={errors.role} />
      {isSelf && <p className="text-sm text-navy-600">You can&apos;t change your own role.</p>}
      {errors.form && <p role="alert" className="text-sm font-medium text-danger-700">{errors.form}</p>}
      <div className="flex items-center gap-3">
        <Button type="submit" variant="dark" disabled={pending}>
          {pending ? "Saving…" : "Save changes"}
        </Button>
        <p role="status" className="text-sm font-medium text-success-700">
          {notice}
        </p>
      </div>
    </form>
  );
}

// ─── Password reset and access ──────────────────────────────────────────────

export function ResetPasswordPanel({ userId, name }: { userId: string; name: string }) {
  const [confirming, setConfirming] = useState(false);
  const [result, setResult] = useState<{ password: string; message: string } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  if (result)
    return (
      <TempPasswordReveal password={result.password} name={name}>
        <p className="mt-3 text-sm text-navy-700">{result.message}</p>
      </TempPasswordReveal>
    );
  return (
    <div>
      {!confirming ? (
        <Button type="button" variant="outline" onClick={() => setConfirming(true)}>
          <KeyRound aria-hidden />
          Reset password
        </Button>
      ) : (
        <div role="alertdialog" aria-labelledby="reset-h" className="rounded-control border border-navy-200 bg-stone-100 p-4">
          <p id="reset-h" className="font-semibold">
            Reset {name}&apos;s password?
          </p>
          <p className="mt-1 text-sm text-navy-700">They&apos;ll be signed out everywhere and get a new temporary password from you.</p>
          <div className="mt-3 flex gap-2">
            <Button
              type="button"
              variant="dark"
              size="sm"
              autoFocus
              disabled={pending}
              onClick={() =>
                start(async () => {
                  const r = await resetStaffPassword(userId, "");
                  if (!r.ok) return setError(Object.values(r.errors)[0]);
                  setResult({ password: r.tempPassword!, message: r.message });
                })
              }
            >
              {pending ? "Resetting…" : "Reset password"}
            </Button>
            <Button type="button" variant="ghost" size="sm" onClick={() => setConfirming(false)}>
              Cancel
            </Button>
          </div>
        </div>
      )}
      {error && <p role="alert" className="mt-2 text-sm font-medium text-danger-700">{error}</p>}
    </div>
  );
}

export function AccessPanel({ userId, name, active }: { userId: string; name: string; active: boolean }) {
  const router = useRouter();
  const [confirming, setConfirming] = useState(false);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);
  const [pending, start] = useTransition();
  const run = (next: boolean) =>
    start(async () => {
      const r = await setStaffActive(userId, next);
      setConfirming(false);
      setMessage(r.ok ? { ok: true, text: r.message } : { ok: false, text: Object.values(r.errors)[0] });
      router.refresh();
    });
  return (
    <div>
      {active ? (
        !confirming ? (
          <Button type="button" variant="ghost" className="text-danger-700" onClick={() => setConfirming(true)}>
            Revoke access
          </Button>
        ) : (
          <div role="alertdialog" aria-labelledby="revoke-h" className="rounded-control border border-danger-700/30 bg-danger-100 p-4">
            <p id="revoke-h" className="font-semibold text-danger-700">
              Revoke {name}&apos;s access?
            </p>
            <p className="mt-1 text-sm text-navy-700">They&apos;re signed out everywhere and can&apos;t sign in. Their notes and quote history stay. You can restore access later.</p>
            <div className="mt-3 flex gap-2">
              <Button type="button" variant="danger" size="sm" autoFocus disabled={pending} onClick={() => run(false)}>
                {pending ? "Revoking…" : "Revoke access"}
              </Button>
              <Button type="button" variant="ghost" size="sm" onClick={() => setConfirming(false)}>
                Keep access
              </Button>
            </div>
          </div>
        )
      ) : (
        <Button type="button" variant="outline" disabled={pending} onClick={() => run(true)}>
          {pending ? "Restoring…" : "Restore access"}
        </Button>
      )}
      <p aria-live="polite" className={message?.ok === false ? "mt-2 text-sm font-medium text-danger-700" : "mt-2 text-sm font-medium text-success-700"}>
        {message?.text}
      </p>
    </div>
  );
}
