import { cn } from "@/lib/utils";
import { at, lineArt } from "./timing";

const ROWS = [0, 1, 2];

/** Property Maintenance: a punch list on a clipboard, ticked off line by line. ~2s. */
export function PropertyMaintenance({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 240 160" {...lineArt} className={cn("text-navy-950", className)}>
      <rect className="ill-draw" style={at(0, 700)} pathLength={1} x="70" y="14" width="100" height="136" rx="4" />
      <rect className="ill-pop" style={at(400, 300)} x="100" y="8" width="40" height="14" rx="3" fill="var(--color-stone-100)" />
      {ROWS.map((i) => {
        const y = 46 + i * 32;
        return (
          <g key={i}>
            <rect className="ill-draw" style={at(450 + i * 120, 350)} pathLength={1} x="86" y={y} width="14" height="14" />
            <path className="ill-draw" style={at(550 + i * 120, 400)} pathLength={1} d={`M110 ${y + 7}H152`} strokeWidth={1.5} />
            <path className="ill-draw" style={at(1050 + i * 320, 350)} pathLength={1} d={`M88 ${y + 6}L93 ${y + 12}L104 ${y - 3}`} strokeWidth={2.5} />
          </g>
        );
      })}
    </svg>
  );
}
