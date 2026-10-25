import { cn } from "@/lib/utils";

/**
 * Hero drawing: a house elevation that draws itself, gets a fresh coat of paint, has its leaning fence
 * picket set straight, and is stamped finished. Pure CSS (globals.css, "Illustrations"), so it plays
 * as the page loads without waiting for JS; with reduced motion it renders finished. About 2.9s.
 *
 * Each part's timing is --at (start) and --dur, in ms.
 */
export function HeroHouse({ className }: { className?: string }) {
  const t = (at: number, dur?: number) => ({ "--at": `${at}ms`, ...(dur ? { "--dur": `${dur}ms` } : {}) }) as React.CSSProperties;
  return (
    <svg
      viewBox="12 84 504 276"
      aria-hidden
      className={cn("ill-autoplay text-navy-950", className)}
      fill="none"
      stroke="currentColor"
      strokeWidth={2.5}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {/* Fresh paint, laid down behind the roller as it passes. */}
      <rect className="ill-wipe" style={t(1500, 900)} x="112" y="196" width="216" height="143" fill="var(--color-stone-100)" stroke="none" />

      {/* Ground */}
      <path className="ill-draw" style={t(0, 600)} pathLength={1} d="M24 340H508" />

      {/* House */}
      <path className="ill-draw" style={t(150, 900)} pathLength={1} d="M110 340V196H330V340" />
      <path className="ill-draw" style={t(300, 800)} pathLength={1} d="M92 206L220 104L348 206" />
      <path className="ill-draw" style={t(650, 400)} pathLength={1} d="M282 148V114H306V167" />

      {/* Windows and door sit on top of the paint. */}
      <g fill="var(--color-white)">
        <rect className="ill-draw" style={t(800, 500)} pathLength={1} x="132" y="222" width="48" height="44" />
        <rect className="ill-draw" style={t(900, 500)} pathLength={1} x="260" y="222" width="48" height="44" />
        <rect className="ill-draw" style={t(1000, 500)} pathLength={1} x="199" y="268" width="42" height="72" />
      </g>
      <path className="ill-draw" style={t(1100, 400)} pathLength={1} d="M156 222V266M132 244H180M284 222V266M260 244H308" strokeWidth={1.75} />
      <circle className="ill-pop" style={t(1300, 300)} cx="233" cy="306" r="2.5" fill="currentColor" stroke="none" />

      {/* Tree */}
      <path className="ill-draw" style={t(400, 500)} pathLength={1} d="M58 340V292" />
      <circle className="ill-draw" style={t(550, 700)} pathLength={1} cx="58" cy="266" r="28" />

      {/* Fence: rails, then pickets. One leans until it is set straight. */}
      <path className="ill-draw" style={t(900, 600)} pathLength={1} d="M384 300H504M384 326H504" />
      {[392, 414, 436, 480, 502].map((x, i) => (
        <path key={x} className="ill-draw" style={t(1000 + i * 70, 350)} pathLength={1} d={`M${x} 340V280`} />
      ))}
      <g className="ill-fade" style={t(1150, 250)}>
        <path className="ill-swing" style={{ ...t(1800, 650), "--from-angle": "-16deg" } as React.CSSProperties} d="M458 340V280" />
      </g>

      {/* Paint roller: sweeps across the wall and comes to rest at its right edge. */}
      <g className="ill-travel" style={{ ...t(1500, 900), "--from-x": "-222px" } as React.CSSProperties}>
        <rect x="336" y="232" width="18" height="52" rx="4" fill="var(--color-white)" />
        <path d="M354 258H366V300" />
        <rect x="361" y="300" width="10" height="32" rx="3" fill="currentColor" stroke="none" />
      </g>

      {/* Finished. */}
      <g className="ill-pop" style={t(2450, 420)}>
        <circle cx="446" cy="164" r="24" fill="currentColor" stroke="none" />
        <path d="M435 164.5L443 172.5L458 156" stroke="var(--color-stone-50)" strokeWidth={3} />
      </g>
    </svg>
  );
}
