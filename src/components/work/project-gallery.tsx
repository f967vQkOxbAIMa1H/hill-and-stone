"use client";

import Image from "next/image";
import { ChevronLeft, ChevronRight, X } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { BrandPanel } from "@/components/brand/brand-panel";
import { ScrollReveal } from "@/components/ScrollReveal";
import { BeforeAfter } from "@/components/ui/before-after";
import { ButtonLink } from "@/components/ui/button";
import type { ServiceCategory } from "@/generated/prisma/enums";
import { quoteHref, services } from "@/lib/site";
import { cn } from "@/lib/utils";

type Photo = { src: string; alt: string };
/** What photos a project has. Projects without photos still show, with a brand graphic. */
export type ProjectMedia = { kind: "pair"; before: Photo; after: Photo } | { kind: "single"; image: Photo } | { kind: "none" };

export type GalleryProject = {
  slug: string;
  title: string;
  category: ServiceCategory;
  city: string;
  summary: string;
  scopeOfWork: string;
  results: string | null;
  materials: string[];
  durationDays: number | null;
  completed: string | null;
  media: ProjectMedia;
  placeholder: boolean;
  quote: { body: string; authorName: string; city: string } | null;
};

// Short filter labels, keyed by the service slug used in URLs.
const filters: { slug: string; label: string }[] = [
  { slug: "general-repairs", label: "General repairs" },
  { slug: "carpentry-doors-trim", label: "Carpentry" },
  { slug: "drywall-painting", label: "Painting & drywall" },
  { slug: "flooring-fixtures-hardware", label: "Flooring & fixtures" },
  { slug: "exterior-repairs", label: "Exterior" },
  { slug: "renovations-custom", label: "Small renovations" },
];
const slugToCategory = Object.fromEntries(services.map((s) => [s.slug, s.category]));
const categoryName = Object.fromEntries(services.map((s) => [s.category, s.name]));
const isSvg = (src: string) => src.endsWith(".svg");

function setParam(key: string, value: string | null) {
  const url = new URL(window.location.href);
  if (value) url.searchParams.set(key, value);
  else url.searchParams.delete(key);
  window.history.replaceState(null, "", url);
}

export function ProjectGallery({ projects }: { projects: GalleryProject[] }) {
  const [filter, setFilter] = useState<string | null>(null);
  const [open, setOpen] = useState<string | null>(null);
  const dialog = useRef<HTMLDialogElement>(null);
  const opener = useRef<HTMLElement | null>(null);

  // Deep links: /our-work?category=exterior-repairs&project=sample-deck-board-railing
  useEffect(() => {
    const q = new URLSearchParams(window.location.search);
    const c = q.get("category");
    const p = q.get("project");
    /* eslint-disable react-hooks/set-state-in-effect -- one-time sync from the URL on mount */
    if (c && slugToCategory[c]) setFilter(c);
    if (p && projects.some((x) => x.slug === p)) setOpen(p);
    /* eslint-enable react-hooks/set-state-in-effect */
  }, [projects]);

  const visible = useMemo(
    () => (filter ? projects.filter((p) => p.category === slugToCategory[filter]) : projects),
    [filter, projects],
  );
  const counts = useMemo(() => {
    const c: Record<string, number> = {};
    for (const p of projects) c[p.category] = (c[p.category] ?? 0) + 1;
    return c;
  }, [projects]);

  useEffect(() => {
    const d = dialog.current;
    if (!d) return;
    if (open && !d.open) d.showModal();
    if (!open && d.open) d.close();
  }, [open]);

  const choose = (slug: string | null) => {
    setFilter(slug);
    setParam("category", slug);
  };
  const show = (slug: string, from?: HTMLElement) => {
    if (from) opener.current = from;
    setOpen(slug);
    setParam("project", slug);
  };
  const close = useCallback(() => {
    setOpen(null);
    setParam("project", null);
    opener.current?.focus();
  }, []);

  const index = visible.findIndex((p) => p.slug === open);
  const current = projects.find((p) => p.slug === open);
  const step = (dir: 1 | -1) => {
    if (index < 0 || visible.length < 2) return;
    show(visible[(index + dir + visible.length) % visible.length].slug);
  };

  return (
    <>
      <div role="group" aria-label="Filter projects by type of work" className="flex flex-wrap gap-2">
        <FilterButton active={filter === null} onClick={() => choose(null)} label="All work" count={projects.length} />
        {filters.map((f) => (
          <FilterButton
            key={f.slug}
            active={filter === f.slug}
            onClick={() => choose(f.slug)}
            label={f.label}
            count={counts[slugToCategory[f.slug]] ?? 0}
          />
        ))}
      </div>
      <p aria-live="polite" className="mt-4 text-sm text-navy-600">
        {visible.length === 1 ? "1 project" : `${visible.length} projects`}
        {filter ? ` in ${categoryName[slugToCategory[filter]].toLowerCase()}` : ""}
      </p>

      {visible.length === 0 ? (
        <div className="mt-8 rounded-panel border border-dashed border-navy-300 p-8">
          <p className="text-lg font-bold">No projects posted in this category yet.</p>
          <p className="mt-2 text-navy-600">We still do this work. Send us photos of yours and we&apos;ll tell you what it takes.</p>
          <ButtonLink href={quoteHref} className="mt-5">
            Request a quote
          </ButtonLink>
        </div>
      ) : (
        <ul className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3 lg:gap-8">
          {visible.map((p, i) => (
            // Tiles in one row arrive left to right.
            <ScrollReveal as="li" key={p.slug} delay={(i % 3) * 0.15} className="flex">
              <button
                type="button"
                onClick={(e) => show(p.slug, e.currentTarget)}
                className="group slate block w-full cursor-pointer rounded-[calc(var(--radius-photo)+0.5rem)] p-2 text-left"
              >
                <SplitPreview project={p} />
                <span className="block px-3 pt-4 pb-4">
                  <span className="block text-sm text-navy-600">
                    {categoryName[p.category]}, {p.city}
                  </span>
                  <span className="mt-1 block text-xl font-bold group-hover:text-copper-700">{p.title}</span>
                  <span className="mt-1.5 block text-navy-600">{p.summary}</span>
                </span>
              </button>
            </ScrollReveal>
          ))}
        </ul>
      )}

      <dialog
        ref={dialog}
        onClose={() => open && close()}
        onClick={(e) => e.target === e.currentTarget && close()}
        aria-labelledby="project-title"
        className="project-dialog m-auto max-h-[calc(100dvh-2rem)] w-[min(100%-1.5rem,1100px)] max-w-none overflow-y-auto rounded-panel bg-stone-50 p-0 text-navy-950 shadow-overlay backdrop:bg-navy-950/70"
      >
        {current && (
          <div className="grid lg:grid-cols-[minmax(0,7fr)_minmax(0,5fr)]">
            <div className="bg-navy-950 p-3 sm:p-5 lg:p-6">
              <DetailMedia key={current.slug} project={current} />
              <div className="mt-3 flex items-center justify-between gap-3 text-sm text-navy-300">
                <span>{current.placeholder ? "Placeholder photos" : current.media.kind === "pair" ? "Drag to compare" : current.media.kind === "none" ? "Photos coming soon" : ""}</span>
                {visible.length > 1 && index >= 0 && (
                  <span className="flex gap-1">
                    <IconButton label="Previous project" onClick={() => step(-1)} dark>
                      <ChevronLeft aria-hidden className="size-5" />
                    </IconButton>
                    <IconButton label="Next project" onClick={() => step(1)} dark>
                      <ChevronRight aria-hidden className="size-5" />
                    </IconButton>
                  </span>
                )}
              </div>
            </div>

            <div className="relative p-6 sm:p-8">
              <div className="absolute top-3 right-3">
                <IconButton label="Close" onClick={close}>
                  <X aria-hidden className="size-5" />
                </IconButton>
              </div>
              <p className="pr-12 text-sm text-navy-600">
                {categoryName[current.category]}, {current.city}
              </p>
              <h2 id="project-title" className="mt-1 pr-12 font-semiwide text-2xl font-bold">
                {current.title}
              </h2>

              <dl className="mt-6 space-y-5">
                <Detail term="The problem">{current.summary}</Detail>
                <Detail term="What we did">{current.scopeOfWork}</Detail>
                {current.results && <Detail term="The result">{current.results}</Detail>}
                {current.materials.length > 0 && (
                  <Detail term="Materials">
                    <ul className="flex flex-wrap gap-1.5">
                      {current.materials.map((m) => (
                        <li key={m} className="rounded-control bg-white px-2 py-0.5 text-sm ring-1 ring-navy-200">
                          {m}
                        </li>
                      ))}
                    </ul>
                  </Detail>
                )}
                <div className="grid grid-cols-2 gap-4 border-t border-navy-200 pt-5">
                  <Detail term="Location">{current.city}, AR</Detail>
                  {current.durationDays && (
                    <Detail term="Time on site">
                      {current.durationDays} {current.durationDays === 1 ? "day" : "days"}
                    </Detail>
                  )}
                </div>
              </dl>

              {current.quote && (
                <figure className="mt-6 border-l-2 border-copper-500 pl-4">
                  <blockquote className="text-navy-700">&ldquo;{current.quote.body}&rdquo;</blockquote>
                  <figcaption className="mt-2 text-sm text-navy-600">
                    {current.quote.authorName}, {current.quote.city}
                  </figcaption>
                </figure>
              )}

              <ButtonLink href={`${quoteHref}?service=${services.find((s) => s.category === current.category)?.slug}`} className="mt-8 w-full sm:w-auto">
                Get a quote for similar work
              </ButtonLink>
            </div>
          </div>
        )}
      </dialog>
    </>
  );
}

function DetailMedia({ project }: { project: GalleryProject }) {
  const m = project.media;
  if (m.kind === "pair") return <BeforeAfter before={m.before} after={m.after} sizes="(min-width: 1024px) 60vw, 100vw" />;
  if (m.kind === "single")
    return (
      <div className="relative aspect-[4/3] overflow-hidden rounded-photo bg-navy-900">
        <Image src={m.image.src} alt={m.image.alt} fill sizes="(min-width: 1024px) 60vw, 100vw" unoptimized={isSvg(m.image.src)} className="object-cover" />
      </div>
    );
  return <BrandPanel label={categoryName[project.category]} className="aspect-[4/3] rounded-photo" />;
}

/** Static half-and-half preview: before on the left, after on the right. The slider lives in the detail view. */
function SplitPreview({ project }: { project: GalleryProject }) {
  const m = project.media;
  if (m.kind === "none") {
    return (
      <span className="relative block">
        <BrandPanel label={categoryName[project.category]} className="aspect-[4/3] rounded-photo" />
      </span>
    );
  }
  if (m.kind === "single") {
    return (
      <span className="relative block aspect-[4/3] overflow-hidden rounded-photo bg-navy-900">
        <Image src={m.image.src} alt="" fill sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw" unoptimized={isSvg(m.image.src)} className="object-cover" />
      </span>
    );
  }
  return (
    <span className="relative block aspect-[4/3] overflow-hidden rounded-photo bg-navy-900">
      <Image src={m.before.src} alt="" fill sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw" unoptimized={isSvg(m.before.src)} className="object-cover [clip-path:inset(0_50%_0_0)]" />
      <Image src={m.after.src} alt="" fill sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw" unoptimized={isSvg(m.after.src)} className="object-cover [clip-path:inset(0_0_0_50%)]" />
      <span aria-hidden className="absolute inset-y-0 left-1/2 w-0.5 -translate-x-1/2 bg-stone-50" />
      <span className="absolute bottom-3 left-3 rounded-control bg-navy-950/80 px-2 py-0.5 text-sm font-semibold text-stone-50">Before</span>
      <span className="absolute right-3 bottom-3 rounded-control bg-copper-500 px-2 py-0.5 text-sm font-semibold text-navy-950">After</span>
    </span>
  );
}

function FilterButton({ active, onClick, label, count }: { active: boolean; onClick: () => void; label: string; count: number }) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      className={cn(
        "inline-flex h-10 cursor-pointer items-center gap-2 rounded-control border px-3.5 font-medium transition-colors",
        active ? "border-navy-950 bg-navy-950 text-stone-50" : "border-navy-300 bg-white text-navy-950 hover:border-navy-950",
      )}
    >
      {label}
      <span className={cn("text-sm", active ? "text-navy-300" : "text-navy-600")}>{count}</span>
    </button>
  );
}

function Detail({ term, children }: { term: string; children: React.ReactNode }) {
  return (
    <div>
      <dt className="text-sm font-semibold">{term}</dt>
      <dd className="mt-1 text-navy-700">{children}</dd>
    </div>
  );
}

function IconButton({ label, onClick, children, dark }: { label: string; onClick: () => void; children: React.ReactNode; dark?: boolean }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex size-11 cursor-pointer items-center justify-center rounded-full transition-colors",
        dark ? "text-stone-50 hover:bg-white/10" : "text-navy-950 hover:bg-navy-950/5",
      )}
    >
      {children}
      <span className="sr-only">{label}</span>
    </button>
  );
}
