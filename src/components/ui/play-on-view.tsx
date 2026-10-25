"use client";

import { useEffect, useRef } from "react";

/**
 * Plays the illustration inside it once, when about 40% of it is in view (classes and keyframes live
 * in globals.css under "Illustrations"). Server HTML shows the finished drawing; after hydration the
 * drawing is reset to its first frame and waits to scroll in. With reduced motion it stays finished.
 *
 * `replayFrom` names an ancestor (a CSS selector, e.g. "a" for a card link) whose hover or keyboard
 * focus replays the animation.
 */
export function PlayOnView({
  className,
  children,
  replayFrom,
}: {
  className?: string;
  children: React.ReactNode;
  replayFrom?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    el.dataset.anim = "ready";
    let played = false;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) return;
        el.dataset.play = "";
        played = true;
        observer.disconnect();
      },
      { threshold: 0.4 },
    );
    observer.observe(el);

    const trigger = replayFrom ? el.closest<HTMLElement>(replayFrom) : null;
    let last = 0;
    const replay = () => {
      // Not before the first play, and not again while one is still running.
      if (!played || Date.now() - last < 2500) return;
      last = Date.now();
      delete el.dataset.play;
      void el.getBoundingClientRect(); // restart the CSS animations
      el.dataset.play = "";
    };
    trigger?.addEventListener("pointerenter", replay);
    trigger?.addEventListener("focusin", replay);

    return () => {
      observer.disconnect();
      trigger?.removeEventListener("pointerenter", replay);
      trigger?.removeEventListener("focusin", replay);
    };
  }, [replayFrom]);

  return (
    <div ref={ref} aria-hidden className={className}>
      {children}
    </div>
  );
}
