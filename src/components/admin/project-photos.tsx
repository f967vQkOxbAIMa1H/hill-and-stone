"use client";

import { Trash2, Upload } from "lucide-react";
import { useRouter } from "next/navigation";
import { useRef, useState, useTransition } from "react";
import { deleteProjectImage, updateProjectImage } from "@/app/admin/content-actions";
import { Button } from "@/components/ui/button";
import { Input, Select } from "@/components/ui/field";
import { SafeImage } from "@/components/ui/safe-image";
import type { ImageRole } from "@/lib/admin/content-schema";
import { UPLOAD_LIMITS } from "@/lib/quote-request/options";

export type AdminPhoto = { id: string; alt: string; role: ImageRole };

const roleLabel: Record<ImageRole, string> = { before: "Before", after: "After", gallery: "Extra photo" };

export function ProjectPhotos({ projectId, photos }: { projectId: string; photos: AdminPhoto[] }) {
  const router = useRouter();
  const input = useRef<HTMLInputElement>(null);
  const [role, setRole] = useState<ImageRole>(photos.some((p) => p.role === "before") ? (photos.some((p) => p.role === "after") ? "gallery" : "after") : "before");
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);
  const [uploading, setUploading] = useState(false);
  const [pending, start] = useTransition();
  const hasPair = photos.some((p) => p.role === "before") && photos.some((p) => p.role === "after");

  async function upload(files: FileList | null) {
    if (!files?.length) return;
    const body = new FormData();
    body.append("role", role);
    for (const f of Array.from(files)) body.append("photos", f, f.name);
    setUploading(true);
    setMessage(null);
    try {
      const res = await fetch(`/api/admin/projects/${projectId}/images`, { method: "POST", body });
      const data = (await res.json()) as { error?: string; count?: number };
      if (!res.ok) throw new Error(data.error ?? "Upload failed. Try again.");
      setMessage({ ok: true, text: `${data.count} photo${data.count === 1 ? "" : "s"} added as ${roleLabel[role].toLowerCase()}.` });
      router.refresh();
    } catch (e) {
      setMessage({ ok: false, text: (e as Error).message });
    } finally {
      setUploading(false);
      if (input.current) input.current.value = "";
    }
  }

  const act = (fn: () => Promise<{ ok: boolean; message: string }>) =>
    start(async () => {
      const r = await fn();
      setMessage({ ok: r.ok, text: r.message });
      router.refresh();
    });

  return (
    <section aria-labelledby="photos-h" className="space-y-4">
      <div>
        <h2 id="photos-h" className="font-bold">
          Photos
        </h2>
        <p className="mt-1 text-sm text-navy-600">
          {hasPair
            ? "Before and after are set, so the site shows the comparison slider."
            : "Add one before and one after photo to show the comparison slider. Without them, the site shows a single photo or the brand graphic."}
        </p>
      </div>

      <div className="flex flex-wrap items-end gap-2 rounded-panel border border-dashed border-navy-300 bg-white p-4">
        <div>
          <label htmlFor="upload-role" className="text-sm font-semibold">
            Add as
          </label>
          <Select id="upload-role" value={role} onChange={(e) => setRole(e.target.value as ImageRole)} className="mt-1 h-10 w-40">
            {(Object.keys(roleLabel) as ImageRole[]).map((r) => (
              <option key={r} value={r}>
                {roleLabel[r]}
              </option>
            ))}
          </Select>
        </div>
        <input
          ref={input}
          id="project-photo-input"
          type="file"
          accept={UPLOAD_LIMITS.accept}
          multiple={role === "gallery"}
          className="sr-only"
          onChange={(e) => upload(e.target.files)}
        />
        <Button type="button" variant="dark" disabled={uploading} onClick={() => input.current?.click()}>
          <Upload aria-hidden />
          {uploading ? "Uploading…" : role === "gallery" ? "Choose photos" : `Choose ${role} photo`}
        </Button>
        <p className="w-full text-sm text-navy-600">JPG, PNG or WebP, up to 10 MB each. Only photos you have the homeowner&apos;s permission to share.</p>
      </div>

      <p aria-live="polite" className={message?.ok === false ? "text-sm font-medium text-danger-700" : "text-sm font-medium text-success-700"}>
        {message?.text}
      </p>

      {photos.length > 0 && (
        <ul className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3" aria-label="Project photos">
          {photos.map((p, i) => (
            <li key={p.id} className="overflow-hidden rounded-panel border border-navy-200 bg-white">
              <SafeImage src={`/api/admin/project-images/${p.id}`} alt={p.alt} fallbackLabel="File missing" className="aspect-[4/3] w-full object-cover" />
              <div className="space-y-2 p-3">
                <div className="flex gap-2">
                  <label htmlFor={`role-${p.id}`} className="sr-only">
                    Role of photo {i + 1}
                  </label>
                  <Select id={`role-${p.id}`} value={p.role} disabled={pending} onChange={(e) => act(() => updateProjectImage(p.id, { role: e.target.value }))} className="h-9 text-sm">
                    {(Object.keys(roleLabel) as ImageRole[]).map((r) => (
                      <option key={r} value={r}>
                        {roleLabel[r]}
                      </option>
                    ))}
                  </Select>
                  <button
                    type="button"
                    disabled={pending}
                    onClick={() => act(() => deleteProjectImage(p.id))}
                    className="flex size-9 shrink-0 cursor-pointer items-center justify-center rounded-control text-navy-600 hover:bg-danger-100 hover:text-danger-700"
                  >
                    <Trash2 aria-hidden className="size-4" />
                    <span className="sr-only">Remove photo {i + 1}</span>
                  </button>
                </div>
                <label htmlFor={`alt-${p.id}`} className="text-xs font-semibold text-navy-600">
                  Description (for screen readers)
                </label>
                <Input
                  id={`alt-${p.id}`}
                  defaultValue={p.alt}
                  className="h-9 text-sm"
                  onBlur={(e) => e.target.value.trim() !== p.alt && act(() => updateProjectImage(p.id, { alt: e.target.value }))}
                />
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
