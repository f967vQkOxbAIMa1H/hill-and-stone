import { cn } from "@/lib/utils";
import { at, lineArt } from "./timing";

/** Home Improvements: a crooked shelf settles level as the bubble centers, then gets dressed. ~2.1s. */
export function HomeImprovement({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 240 160" {...lineArt} className={cn("text-navy-950", className)}>
      <path className="ill-draw" style={at(0, 600)} pathLength={1} d="M20 140H220" opacity={0.5} />
      <path className="ill-draw" style={at(100, 500)} pathLength={1} d="M76 100V122L92 100M164 100V122L148 100" />
      <g className="ill-swing" style={{ ...at(500, 800, { "--from-angle": "-7deg" }), transformOrigin: "center" }}>
        <rect x="50" y="92" width="140" height="8" fill="var(--color-white)" />
        <rect x="86" y="76" width="68" height="14" rx="3" fill="var(--color-white)" />
        <rect x="110" y="80" width="20" height="6" rx="3" strokeWidth={1.5} />
        <circle className="ill-travel" style={at(500, 900, { "--from-x": "-7px" })} cx="120" cy="83" r="2" fill="currentColor" stroke="none" />
      </g>
      <g className="ill-pop" style={at(1450, 380)}>
        <rect x="160" y="62" width="9" height="30" fill="var(--color-stone-100)" />
        <rect x="170" y="66" width="9" height="26" />
      </g>
      <g className="ill-pop" style={at(1650, 380)}>
        <path d="M58 92L62 74H76L80 92Z" fill="var(--color-stone-100)" />
        <path d="M69 74C69 64 62 60 58 58M69 74C70 66 76 62 80 60" strokeWidth={1.5} />
      </g>
    </svg>
  );
}
