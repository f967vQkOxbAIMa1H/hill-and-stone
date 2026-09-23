"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { deleteReview, saveReview } from "@/app/admin/content-actions";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Field, Input, Select, Textarea } from "@/components/ui/field";
import { reviewSources, type ReviewInput } from "@/lib/admin/content-schema";

export function ReviewForm({ initial, projects }: { initial: ReviewInput; projects: { id: string; title: string }[] }) {
  const router = useRouter();
  const [v, setV] = useState(initial);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [notice, setNotice] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [pending, start] = useTransition();
  const set = <K extends keyof ReviewInput>(k: K, val: ReviewInput[K]) => {
    setV((x) => ({ ...x, [k]: val }));
    setErrors((e) => (k in e ? Object.fromEntries(Object.entries(e).filter(([key]) => key !== k)) : e));
    setNotice(null);
  };
  const err = (k: string) => errors[k];
  const aria = (k: string) => ({ "aria-invalid": err(k) ? true : undefined, "data-field": k });

  function submit(e: React.FormEvent) {
    e.preventDefault();
    start(async () => {
      const r = await saveReview(v);
      if (!r.ok) {
        setErrors(r.errors);
        requestAnimationFrame(() => document.querySelector<HTMLElement>(`[data-field="${Object.keys(r.errors)[0]}"]`)?.focus());
        return;
      }
      if (!v.id) router.push(`/admin/reviews/${r.id}?created=1`);
      else {
        setNotice(v.published ? "Saved. The review is live." : "Saved. The review is hidden from the site.");
        router.replace(`/admin/reviews/${v.id}`);
      }
    });
  }

  return (
    <form onSubmit={submit} noValidate className="max-w-3xl space-y-6">
      <Field id="body" label="Review text" hint="Paste it exactly as the customer wrote it." error={err("body")}>
        <Textarea id="body" rows={6} value={v.body} onChange={(e) => set("body", e.target.value)} {...aria("body")} />
      </Field>
      <div className="grid gap-5 sm:grid-cols-2">
        <Field id="authorName" label="Name shown" hint="First name and last initial is usual." error={err("authorName")}>
          <Input id="authorName" value={v.authorName} onChange={(e) => set("authorName", e.target.value)} {...aria("authorName")} placeholder="Dana R." />
        </Field>
        <Field id="city" label="City" error={err("city")}>
          <Input id="city" value={v.city} onChange={(e) => set("city", e.target.value)} {...aria("city")} placeholder="Rogers" />
        </Field>
        <Field id="rating" label="Stars">
          <Select id="rating" value={String(v.rating)} onChange={(e) => set("rating", Number(e.target.value))}>
            {[5, 4, 3, 2, 1].map((n) => (
              <option key={n} value={n}>
                {n} star{n === 1 ? "" : "s"}
              </option>
            ))}
          </Select>
        </Field>
        <Field id="reviewedAt" label="Review date" optional error={err("reviewedAt")}>
          <Input id="reviewedAt" type="date" value={v.reviewedAt} onChange={(e) => set("reviewedAt", e.target.value)} {...aria("reviewedAt")} />
        </Field>
        <Field id="source" label="Where it was posted">
          <Select id="source" value={v.source} onChange={(e) => set("source", e.target.value)}>
            {reviewSources.map((s) => (
              <option key={s.value} value={s.value}>
                {s.label}
              </option>
            ))}
          </Select>
        </Field>
        <Field id="sourceUrl" label="Link to the review" optional error={err("sourceUrl")}>
          <Input id="sourceUrl" type="url" value={v.sourceUrl} onChange={(e) => set("sourceUrl", e.target.value)} {...aria("sourceUrl")} placeholder="https://" />
        </Field>
        <Field id="projectId" label="Related project" optional hint="Adds a “See the project” link under the review." className="sm:col-span-2">
          <Select id="projectId" value={v.projectId} onChange={(e) => set("projectId", e.target.value)}>
            <option value="">None</option>
            {projects.map((p) => (
              <option key={p.id} value={p.id}>
                {p.title}
              </option>
            ))}
          </Select>
        </Field>
      </div>

      <fieldset className="space-y-3 rounded-panel border border-navy-200 bg-white p-5">
        <legend className="px-1 text-sm font-semibold">Publishing</legend>
        <Checkbox
          id="permission"
          label="The customer agreed to have this review on our website"
          hint="Required to publish. Reviews already public on Google still need the customer's OK to repost."
          checked={v.permission}
          onChange={(e) => set("permission", e.target.checked)}
          data-field="permission"
        />
        {err("permission") && <p className="text-sm font-medium text-danger-700">{err("permission")}</p>}
        <Checkbox id="published" label="Published" hint="Shows on the Reviews page and, if featured, the home page." checked={v.published} onChange={(e) => set("published", e.target.checked)} />
        <Checkbox id="featured" label="Featured" hint="Shown first and large on the home page." checked={v.featured} onChange={(e) => set("featured", e.target.checked)} />
      </fieldset>

      <div className="flex flex-wrap items-center gap-3">
        <Button type="submit" variant="dark" disabled={pending}>
          {pending ? "Saving…" : v.id ? "Save changes" : "Add review"}
        </Button>
        <p role="status" className="text-sm font-medium text-success-700">
          {notice}
        </p>
        {v.id && !confirmDelete && (
          <Button type="button" variant="ghost" className="ml-auto text-danger-700" onClick={() => setConfirmDelete(true)}>
            Delete review
          </Button>
        )}
      </div>
      {confirmDelete && v.id && (
        <div role="alertdialog" aria-labelledby="del-h" className="rounded-control border border-danger-700/30 bg-danger-100 p-4">
          <p id="del-h" className="font-semibold text-danger-700">Delete this review?</p>
          <p className="mt-1 text-sm text-navy-700">It comes off the site right away. To hide it without deleting, untick Published instead.</p>
          <div className="mt-3 flex gap-2">
            <Button type="button" variant="danger" size="sm" autoFocus disabled={pending} onClick={() => start(() => deleteReview(v.id!))}>
              {pending ? "Deleting…" : "Delete review"}
            </Button>
            <Button type="button" variant="ghost" size="sm" onClick={() => setConfirmDelete(false)}>
              Keep it
            </Button>
          </div>
        </div>
      )}
    </form>
  );
}
