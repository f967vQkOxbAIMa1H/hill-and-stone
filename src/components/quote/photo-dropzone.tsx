"use client";

import { ImagePlus, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { SafeImage } from "@/components/ui/safe-image";
import { compressImage, QUOTE_PHOTO } from "@/lib/image-compress";
import { UPLOAD_LIMITS } from "@/lib/quote-request/options";
import { cn } from "@/lib/utils";

/** `file` is the shrunk copy that gets uploaded; `source` identifies the original, to skip duplicates. */
export type Photo = { id: string; file: File; url: string; source: string };

const sourceKey = (f: File) => `${f.name}:${f.size}:${f.lastModified}`;

const mb = (bytes: number) => (bytes < 1024 * 1024 ? `${Math.max(1, Math.round(bytes / 1024))} KB` : `${(bytes / 1024 / 1024).toFixed(1)} MB`);

export function PhotoDropzone({
  photos,
  onChange,
  onPreparingChange,
  error,
}: {
  photos: Photo[];
  onChange: (photos: Photo[]) => void;
  /** True while attached photos are still being shrunk; the form waits for them. */
  onPreparingChange?: (preparing: boolean) => void;
  error?: string;
}) {
  const input = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const [rejected, setRejected] = useState<string[]>([]);
  const [preparing, setPreparing] = useState(0);

  // Free preview URLs when the component goes away.
  const latest = useRef(photos);
  useEffect(() => {
    latest.current = photos;
  }, [photos]);
  useEffect(() => () => latest.current.forEach((p) => URL.revokeObjectURL(p.url)), []);

  async function add(list: FileList | File[]) {
    // One batch at a time, so two batches can't both pass the photo-count check.
    if (preparing) return;
    const accepted: File[] = [];
    const problems: string[] = [];
    for (const file of Array.from(list)) {
      if (!(UPLOAD_LIMITS.types as readonly string[]).includes(file.type)) {
        problems.push(`${file.name}: only JPG, PNG and WebP photos can be attached.`);
      } else if (file.size > UPLOAD_LIMITS.maxSourceBytes) {
        problems.push(`${file.name}: ${mb(file.size)} is over the 30 MB limit.`);
      } else if (photos.length + accepted.length >= UPLOAD_LIMITS.maxFiles) {
        problems.push(`${file.name}: you can attach up to ${UPLOAD_LIMITS.maxFiles} photos.`);
      } else if (!photos.some((p) => p.source === sourceKey(file)) && !accepted.some((f) => sourceKey(f) === sourceKey(file))) {
        accepted.push(file);
      }
    }
    setRejected(problems);
    if (!accepted.length) return;
    // Shrink before upload: keeps the request under the host's size limit and strips location data.
    setPreparing(accepted.length);
    onPreparingChange?.(true);
    try {
      const shrunk = await Promise.all(accepted.map((f) => compressImage(f, QUOTE_PHOTO)));
      const tooBig = shrunk.filter((f) => f.size > UPLOAD_LIMITS.maxBytes);
      if (tooBig.length) setRejected([...problems, ...tooBig.map((f) => `${f.name}: couldn't be shrunk below 10 MB. Try a screenshot of it instead.`)]);
      const added = shrunk
        .map((file, i) => ({ file, source: sourceKey(accepted[i]) }))
        .filter(({ file }) => file.size <= UPLOAD_LIMITS.maxBytes)
        .map(({ file, source }) => ({ id: crypto.randomUUID(), file, url: URL.createObjectURL(file), source }));
      onChange([...latest.current, ...added]);
    } finally {
      setPreparing(0);
      onPreparingChange?.(false);
    }
  }

  function remove(photo: Photo) {
    URL.revokeObjectURL(photo.url);
    onChange(photos.filter((p) => p.id !== photo.id));
    input.current?.focus();
  }

  const remaining = UPLOAD_LIMITS.maxFiles - photos.length;

  return (
    <div>
      <div
        onDragEnter={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragOver={(e) => e.preventDefault()}
        onDragLeave={(e) => {
          if (!e.currentTarget.contains(e.relatedTarget as Node)) setDragging(false);
        }}
        onDrop={(e) => {
          e.preventDefault();
          setDragging(false);
          if (e.dataTransfer.files.length) add(e.dataTransfer.files);
        }}
        className={cn(
          "relative flex flex-col items-center justify-center rounded-panel border-2 border-dashed px-6 py-10 text-center transition-colors",
          "has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-copper-500",
          dragging ? "border-copper-500 bg-copper-100" : error ? "border-danger-700 bg-white" : "border-navy-300 bg-white hover:border-navy-600",
        )}
      >
        <ImagePlus aria-hidden className={cn("size-9", dragging ? "text-copper-700" : "text-navy-600")} />
        <p className="mt-3 font-semibold">{dragging ? "Drop to attach" : "Drag photos here, or choose files"}</p>
        <p id="photos-hint" className="mt-1 text-sm text-navy-600">
          {preparing
            ? `Preparing ${preparing} photo${preparing === 1 ? "" : "s"}…`
            : `JPG, PNG or WebP. We shrink them before sending. ${remaining > 0 ? `${remaining} of ${UPLOAD_LIMITS.maxFiles} left.` : "Limit reached."}`}
        </p>
        {/* The input covers the zone so a click anywhere opens the picker. */}
        <input
          ref={input}
          id="photos"
          type="file"
          multiple
          accept={UPLOAD_LIMITS.accept}
          disabled={remaining <= 0 || preparing > 0}
          aria-label="Choose photos to attach"
          aria-describedby={error ? "photos-error" : "photos-hint"}
          onChange={(e) => {
            if (e.target.files?.length) add(e.target.files);
            e.target.value = "";
          }}
          className="absolute inset-0 cursor-pointer opacity-0 disabled:cursor-not-allowed"
        />
      </div>

      <div aria-live="polite">
        {rejected.length > 0 && (
          <ul className="mt-3 space-y-1 text-sm font-medium text-danger-700">
            {rejected.map((r) => (
              <li key={r}>{r}</li>
            ))}
          </ul>
        )}
        {error && (
          <p id="photos-error" className="mt-2 text-sm font-medium text-danger-700">
            {error}
          </p>
        )}
      </div>

      {photos.length > 0 && (
        <ul className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4" aria-label="Attached photos">
          {photos.map((p) => (
            <li key={p.id} className="group relative">
              <SafeImage src={p.url} alt={p.file.name} fallbackLabel="No preview" className="aspect-square w-full rounded-control object-cover" />
              <p className="mt-1 truncate text-sm" title={p.file.name}>
                {p.file.name}
              </p>
              <p className="text-sm text-navy-600">{mb(p.file.size)}</p>
              <button
                type="button"
                onClick={() => remove(p)}
                className="absolute top-1 right-1 flex size-11 cursor-pointer items-center justify-center rounded-full bg-navy-950/85 text-stone-50 hover:bg-danger-700"
              >
                <X aria-hidden className="size-5" />
                <span className="sr-only">Remove {p.file.name}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
