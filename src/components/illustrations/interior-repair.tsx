import { cn } from "@/lib/utils";
import { at, lineArt } from "./timing";

/** Interior Repairs: a crack runs down a wall, then a putty knife smooths a patch over it. ~1.9s. */
export function InteriorRepair({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 240 160" {...lineArt} className={cn("text-navy-950", className)}>
      <rect className="ill-draw" style={at(0, 700)} pathLength={1} x="20" y="12" width="200" height="136" />
      <path className="ill-draw" style={at(250, 500)} pathLength={1} d="M20 132H220" />
      <rect className="ill-draw" style={at(350, 400)} pathLength={1} x="170" y="84" width="18" height="26" rx="2" strokeWidth={1.5} />
      <path className="ill-fade" style={at(650, 250)} d="M177 93V97M181 93V97" strokeWidth={1.5} />
      <path className="ill-draw" style={at(450, 550)} pathLength={1} d="M98 26L106 42L99 56L111 70L104 82L112 94" />
      <rect className="ill-wipe-down" style={at(1100, 800)} x="82" y="20" width="46" height="82" rx="6" fill="var(--color-stone-100)" stroke="none" />
      <g className="ill-travel" style={at(1100, 800, { "--from-y": "-70px" })}>
        <path d="M84 98H126L119 112H91Z" fill="var(--color-white)" />
        <rect x="101" y="112" width="8" height="18" rx="3" fill="currentColor" stroke="none" />
      </g>
    </svg>
  );
}
