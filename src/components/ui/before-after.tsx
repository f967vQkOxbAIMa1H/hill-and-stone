"use client";

import Image from "next/image";
import { useEffect, useId, useState } from "react";
import { cn } from "@/lib/utils";

type Photo = { src: string; alt: string };

/**
 * Before/after comparison. The control is a native range input stretched over
 * the photo, so keyboard, touch and screen readers work without custom handlers.
 * `intro` plays the site's one page-load moment: the divider sweeps in from the right.
 */
export function BeforeAfter({
  before,
  after,
  intro = false,
  priority = false,
  className,
  sizes = "(min-width: 1024px) 50vw, 100vw",
}: {
  before: Photo;
  after: Photo;
  intro?: boolean;
  priority?: boolean;
  className?: string;
  sizes?: string;
}) {
  const id = useId();
  const [position, setPosition] = useState(intro ? 92 : 50);
  const [animating, setAnimating] = useState(intro);

  useEffect(() => {
    if (!intro) return;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const t = setTimeout(() => setPosition(50), reduced ? 0 : 400);
    const done = setTimeout(() => setAnimating(false), reduced ? 0 : 1400);
    return () => {
      clearTimeout(t);
      clearTimeout(done);
    };
  }, [intro]);

  const glide = animating ? "transition-[clip-path,left] duration-1000 ease-out-quart" : "";
  const unoptimized = (src: string) => src.endsWith(".svg");

  return (
    <figure
      className={cn(
        "group relative aspect-[4/3] w-full touch-pan-y overflow-hidden rounded-photo bg-navy-900 select-none",
        className,
      )}
    >
      <Image
        src={before.src}
        alt={before.alt}
        fill
        sizes={sizes}
        priority={priority}
        unoptimized={unoptimized(before.src)}
        className="object-cover"
      />
      <div className={cn("absolute inset-0", glide)} style={{ clipPath: `inset(0 0 0 ${position}%)` }}>
        <Image
          src={after.src}
          alt={after.alt}
          fill
          sizes={sizes}
          priority={priority}
          unoptimized={unoptimized(after.src)}
          className="object-cover"
        />
      </div>

      <span className="absolute top-4 left-4 rounded-control bg-navy-950/80 px-2.5 py-1 text-sm font-semibold text-stone-50">
        Before
      </span>
      <span className="absolute top-4 right-4 rounded-control bg-copper-500 px-2.5 py-1 text-sm font-semibold text-navy-950">
        After
      </span>

      {/* Divider + handle (visual only; the range input below is the control) */}
      <div
        aria-hidden
        className={cn("pointer-events-none absolute inset-y-0 w-0.5 -translate-x-1/2 bg-stone-50", glide)}
        style={{ left: `${position}%` }}
      >
        <div className="absolute top-1/2 left-1/2 flex size-12 -translate-x-1/2 -translate-y-1/2 items-center justify-center gap-1 rounded-full bg-stone-50 text-navy-950 shadow-overlay ring-copper-500 transition-transform duration-150 group-has-[input:focus-visible]:ring-2 group-has-[input:active]:scale-95">
          <svg viewBox="0 0 20 20" className="size-5">
            <path d="M7 5 2 10l5 5M13 5l5 5-5 5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>
      </div>

      <label htmlFor={id} className="sr-only">
        Compare before and after. Slide left to see more of the finished work.
      </label>
      <input
        id={id}
        type="range"
        min={0}
        max={100}
        step={1}
        value={position}
        onChange={(e) => {
          setAnimating(false);
          setPosition(Number(e.target.value));
        }}
        aria-valuetext={`${100 - position}% after, ${position}% before`}
        className="absolute inset-0 h-full w-full cursor-ew-resize appearance-none opacity-0 focus-visible:outline-none"
      />
    </figure>
  );
}
