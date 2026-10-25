import { cn } from "@/lib/utils";
import { at, lineArt } from "./timing";

/** Exterior Repairs: a pressure washer passes over grimy siding and leaves it clean. ~2.3s. */
export function ExteriorRepair({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 240 160" {...lineArt} className={cn("text-navy-950", className)}>
      {/* Grime, then the clean pass that covers it, then the siding drawn on top of both. */}
      <path className="ill-fade" style={at(300, 300)} d="M40 22C80 28 120 20 150 30L166 136C130 128 90 140 56 132Z" fill="currentColor" fillOpacity={0.16} stroke="none" />
      <rect className="ill-wipe" style={at(800, 1000)} x="22" y="22" width="166" height="114" fill="var(--color-white)" stroke="none" />
      <path className="ill-draw" style={at(0, 600)} pathLength={1} d="M20 20H190V138H20Z" />
      <path className="ill-draw" style={at(200, 600)} pathLength={1} d="M20 50H190M20 79H190M20 108H190" strokeWidth={1.5} />
      <g className="ill-travel" style={at(800, 1000, { "--from-x": "-110px" })}>
        <path className="ill-flash" style={at(800, 1000)} d="M146 96L128 84M146 96L124 98M146 96L130 112" strokeWidth={1.5} />
        <path d="M146 96L204 62" strokeWidth={3} />
        <path d="M200 64L216 54L224 68L210 76Z" fill="currentColor" />
        <path d="M220 66C234 82 236 112 228 146" />
      </g>
      {/* Clean. */}
      <path className="ill-pop" style={at(1850, 380)} d="M62 36V52M54 44H70" strokeWidth={1.5} />
      <path className="ill-pop" style={at(2000, 380)} d="M100 86V98M94 92H106" strokeWidth={1.5} />
    </svg>
  );
}
