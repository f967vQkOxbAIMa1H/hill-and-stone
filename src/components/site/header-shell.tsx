"use client";

import { useLayoutEffect, useRef, useState } from "react";

type Theme = "light" | "dark";

/**
 * The sticky header, recolored to contrast with whatever section sits under its bottom edge.
 * Every full-width section carries data-header-theme="light" | "dark". An IntersectionObserver watches
 * a one-pixel band at the header's bottom edge; when a section crosses it, the header takes that
 * section's theme. Untagged space (the cream page itself) counts as light.
 *
 * The server renders "light", which is the theme of every page's first section, so nothing flashes on
 * load. A deep link that lands mid-page is corrected before first paint (layout effect).
 */
export function HeaderShell({ className, children }: { className?: string; children: React.ReactNode }) {
  const ref = useRef<HTMLElement>(null);
  const [theme, setTheme] = useState<Theme>("light");

  useLayoutEffect(() => {
    const header = ref.current;
    if (!header) return;
    let observer: IntersectionObserver | undefined;
    let frame = 0;

    const sections = () => Array.from(document.querySelectorAll<HTMLElement>("[data-header-theme]")).filter((el) => !header.contains(el));

    const update = () => {
      const edge = header.getBoundingClientRect().bottom;
      // Last match wins: sections nest (a dark card inside a light section), and the inner one is on top.
      let next: Theme = "light";
      for (const el of sections()) {
        const r = el.getBoundingClientRect();
        if (r.top <= edge && r.bottom > edge) next = el.dataset.headerTheme === "dark" ? "dark" : "light";
      }
      setTheme(next);
    };

    const observe = () => {
      observer?.disconnect();
      const edge = Math.round(header.getBoundingClientRect().bottom);
      observer = new IntersectionObserver(update, {
        rootMargin: `-${edge}px 0px -${Math.max(0, window.innerHeight - edge - 1)}px 0px`,
      });
      sections().forEach((el) => observer!.observe(el));
      update();
    };

    observe();
    window.addEventListener("resize", observe);
    // Sections can mount after the header (client navigation, streamed content).
    const mutations = new MutationObserver(() => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(observe);
    });
    mutations.observe(document.getElementById("main") ?? document.body, { childList: true, subtree: true });
    return () => {
      observer?.disconnect();
      mutations.disconnect();
      cancelAnimationFrame(frame);
      window.removeEventListener("resize", observe);
    };
  }, []);

  return (
    <header ref={ref} data-theme={theme} className={className}>
      {children}
    </header>
  );
}
