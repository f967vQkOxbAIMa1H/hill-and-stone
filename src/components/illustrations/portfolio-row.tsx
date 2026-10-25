import { cn } from "@/lib/utils";

const HOUSES = [0, 1, 2, 3];

/**
 * Property-manager section: a row of homes drawn in, then checked off one after another, the same
 * standard from property to property. Cream line work for the navy section; plays inside PlayOnView.
 */
export function PortfolioRow({ className }: { className?: string }) {
  const t = (at: number, dur?: number) => ({ "--at": `${at}ms`, ...(dur ? { "--dur": `${dur}ms` } : {}) }) as React.CSSProperties;
  return (
    <svg
      viewBox="0 0 480 150"
      className={cn("text-stone-50", className)}
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path className="ill-draw" style={t(0, 700)} pathLength={1} d="M8 128H472" opacity={0.5} />
      {HOUSES.map((i) => {
        const x = 20 + i * 116;
        return (
          <g key={i}>
            <path className="ill-draw" style={t(150 + i * 140, 650)} pathLength={1} d={`M${x} 128V70L${x + 38} 40L${x + 76} 70V128`} />
            <path className="ill-draw" style={t(450 + i * 140, 400)} pathLength={1} d={`M${x + 30} 128V98H${x + 46}V128`} />
            <g className="ill-pop" style={t(1250 + i * 260, 380)}>
              <circle cx={x + 70} cy="44" r="15" fill="var(--color-stone-100)" stroke="none" />
              <path d={`M${x + 63} 44.5L${x + 68} 49.5L${x + 77} 39.5`} stroke="var(--color-navy-950)" strokeWidth={2.5} />
            </g>
          </g>
        );
      })}
    </svg>
  );
}
