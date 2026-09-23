import { useId } from "react";
import { LogoMark } from "@/components/brand/logo";
import { cn } from "@/lib/utils";

/**
 * Stand-in for a missing photo: Ozark ridge contours on navy, from the logo's hill motif.
 * Looks intentional rather than empty, and never pretends to be a real photo.
 */
export function BrandPanel({
  label,
  className,
  tone = "navy",
  mark = true,
}: {
  label?: string;
  className?: string;
  tone?: "navy" | "stone";
  mark?: boolean;
}) {
  const id = useId().replace(/:/g, "");
  const dark = tone === "navy";
  return (
    <div
      role={label ? "img" : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : true}
      className={cn("flex flex-col overflow-hidden", dark ? "bg-navy-950 text-stone-50" : "bg-stone-100 text-navy-950", className)}
    >
      <div className="relative flex flex-1 items-end">
        <svg aria-hidden className="absolute inset-0 h-full w-full" preserveAspectRatio="xMidYMax slice" viewBox="0 0 400 300">
          <defs>
            <pattern id={`ridge-${id}`} width="400" height="36" patternUnits="userSpaceOnUse">
              <path d="M0 30 L60 12 L100 22 L150 4 L210 20 L260 10 L320 26 L360 14 L400 30" fill="none" stroke="currentColor" strokeWidth="1.25" opacity={dark ? 0.14 : 0.12} />
            </pattern>
          </defs>
          <rect width="400" height="300" fill={`url(#ridge-${id})`} />
          <path d="M0 300 L0 236 L70 196 L120 222 L190 170 L250 214 L310 186 L400 232 L400 300 Z" className={dark ? "fill-navy-900" : "fill-navy-200"} />
        </svg>
        {(mark || label) && (
          <div className="relative flex w-full items-center gap-3 p-4 sm:p-5">
            {mark && <LogoMark className={cn("size-7 shrink-0", dark ? "text-stone-50" : "text-navy-950")} />}
            {label && <span className={cn("text-sm font-semibold", dark ? "text-stone-50" : "text-navy-950")}>{label}</span>}
          </div>
        )}
      </div>
      {/* The stone course under the hills, as in the logo mark. */}
      <div aria-hidden className="h-2.5 shrink-0 bg-copper-500" />
    </div>
  );
}
