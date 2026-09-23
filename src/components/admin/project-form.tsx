"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { deleteProject, saveProject } from "@/app/admin/content-actions";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Field, Input, Select, Textarea } from "@/components/ui/field";
import { slugify, type ProjectInput } from "@/lib/admin/content-schema";
import { categoryOptions } from "@/lib/quote-request/options";

export function ProjectForm({ initial }: { initial: ProjectInput }) {
  const router = useRouter();
  const [v, setV] = useState(initial);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [notice, setNotice] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [pending, start] = useTransition();
  const set = <K extends keyof ProjectInput>(k: K, val: ProjectInput[K]) => {
    setV((x) => ({ ...x, [k]: val }));
    setErrors((e) => (k in e ? Object.fromEntries(Object.entries(e).filter(([key]) => key !== k)) : e));
    setNotice(null);
  };
  const err = (k: string) => errors[k];
  const aria = (k: string) => ({ "aria-invalid": err(k) ? true : undefined, "data-field": k });

  function submit(e: React.FormEvent) {
    e.preventDefault();
    start(async () => {
      const r = await saveProject(v);
      if (!r.ok) {
        setErrors(r.errors);
        requestAnimationFrame(() => document.querySelector<HTMLElement>(`[data-field="${Object.keys(r.errors)[0]}"]`)?.focus());
        return;
      }
      if (!v.id) router.push(`/admin/portfolio/${r.id}?created=1`);
      else {
        setNotice(v.published ? "Saved. Changes are live on the site." : "Saved as a draft.");
        // Drops ?created=1 so the "created as a draft" banner doesn't linger after publishing.
        router.replace(`/admin/portfolio/${v.id}`);
      }
    });
  }

  return (
    <form onSubmit={submit} noValidate className="space-y-6">
      <div className="grid gap-5 sm:grid-cols-2">
        <Field id="title" label="Project title" error={err("title")} className="sm:col-span-2">
          <Input id="title" value={v.title} onChange={(e) => set("title", e.target.value)} {...aria("title")} placeholder="Back door trim replacement" />
        </Field>
        <Field id="category" label="Type of work" error={err("category")}>
          <Select id="category" value={v.category} onChange={(e) => set("category", e.target.value as ProjectInput["category"])} {...aria("category")}>
            {categoryOptions.filter((o) => o.value !== "OTHER").map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </Select>
        </Field>
        <Field id="city" label="City" error={err("city")}>
          <Input id="city" value={v.city} onChange={(e) => set("city", e.target.value)} {...aria("city")} placeholder="Bentonville" />
        </Field>
        <Field id="summary" label="The problem" hint="One or two sentences shown on the project card." error={err("summary")} className="sm:col-span-2">
          <Textarea id="summary" rows={2} className="min-h-20" value={v.summary} onChange={(e) => set("summary", e.target.value)} {...aria("summary")} />
        </Field>
        <Field id="scopeOfWork" label="What we did" error={err("scopeOfWork")} className="sm:col-span-2">
          <Textarea id="scopeOfWork" rows={4} value={v.scopeOfWork} onChange={(e) => set("scopeOfWork", e.target.value)} {...aria("scopeOfWork")} />
        </Field>
        <Field id="results" label="The result" optional error={err("results")} className="sm:col-span-2">
          <Textarea id="results" rows={2} className="min-h-20" value={v.results} onChange={(e) => set("results", e.target.value)} {...aria("results")} />
        </Field>
        <Field id="materials" label="Materials" optional hint="One per line." error={err("materials")}>
          <Textarea id="materials" rows={4} className="min-h-28" value={v.materials} onChange={(e) => set("materials", e.target.value)} {...aria("materials")} />
        </Field>
        <div className="grid content-start gap-5">
          <Field id="durationDays" label="Days on site" optional error={err("durationDays")}>
            <Input id="durationDays" inputMode="numeric" value={v.durationDays} onChange={(e) => set("durationDays", e.target.value.replace(/\D/g, ""))} {...aria("durationDays")} />
          </Field>
          <Field id="completedAt" label="Completed" optional error={err("completedAt")}>
            <Input id="completedAt" type="date" value={v.completedAt} onChange={(e) => set("completedAt", e.target.value)} {...aria("completedAt")} />
          </Field>
        </div>
        <Field id="slug" label="Web address" optional hint={`Leave blank to use /our-work?project=${slugify(`${v.title} ${v.city}`) || "…"}`} error={err("slug")} className="sm:col-span-2">
          <Input id="slug" value={v.slug} onChange={(e) => set("slug", e.target.value.toLowerCase())} {...aria("slug")} />
        </Field>
      </div>

      <fieldset className="space-y-3 rounded-panel border border-navy-200 bg-white p-5">
        <legend className="px-1 text-sm font-semibold">Visibility</legend>
        <Checkbox id="published" label="Published" hint="Shows on Our Work. Unpublished projects are only visible here." checked={v.published} onChange={(e) => set("published", e.target.checked)} />
        <Checkbox id="featured" label="Featured" hint="Listed first, and used for the home page before-and-after when it has both photos." checked={v.featured} onChange={(e) => set("featured", e.target.checked)} />
      </fieldset>

      {errors.form && <p role="alert" className="text-sm font-medium text-danger-700">{errors.form}</p>}
      <div className="flex flex-wrap items-center gap-3">
        <Button type="submit" variant="dark" disabled={pending}>
          {pending ? "Saving…" : v.id ? "Save changes" : "Create project"}
        </Button>
        <p role="status" className="text-sm font-medium text-success-700">
          {notice}
        </p>
        {v.id && !confirmDelete && (
          <Button type="button" variant="ghost" className="ml-auto text-danger-700" onClick={() => setConfirmDelete(true)}>
            Delete project
          </Button>
        )}
      </div>
      {confirmDelete && v.id && (
        <div role="alertdialog" aria-labelledby="del-h" className="rounded-control border border-danger-700/30 bg-danger-100 p-4">
          <p id="del-h" className="font-semibold text-danger-700">Delete this project and its photos?</p>
          <p className="mt-1 text-sm text-navy-700">It comes off the site right away. Linked reviews stay, without the project link. This can&apos;t be undone.</p>
          <div className="mt-3 flex gap-2">
            <Button type="button" variant="danger" size="sm" autoFocus disabled={pending} onClick={() => start(() => deleteProject(v.id!))}>
              {pending ? "Deleting…" : "Delete project"}
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
