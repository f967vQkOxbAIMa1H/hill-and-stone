import type { CSSProperties } from "react";

/** Start time and duration (ms) for one part of an illustration, plus any extra custom properties. */
export const at = (start: number, dur?: number, extra?: Record<string, string>) =>
  ({ "--at": `${start}ms`, ...(dur ? { "--dur": `${dur}ms` } : {}), ...extra }) as CSSProperties;

/** Shared <svg> props: one line weight, navy (currentColor) strokes. */
export const lineArt = {
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 2,
  strokeLinecap: "round",
  strokeLinejoin: "round",
  "aria-hidden": true,
} as const;
