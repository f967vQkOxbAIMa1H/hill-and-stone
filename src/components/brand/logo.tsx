import { cn } from "@/lib/utils";

/** Mark: an Ozark ridge line resting on a laid stone. */
export function LogoMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" aria-hidden className={cn("size-8", className)}>
      <path d="M2 17 L11 7 L16 12 L21 6 L30 17 Z" fill="currentColor" />
      <rect x="2" y="20" width="28" height="10" rx="2" className="fill-copper-500" />
    </svg>
  );
}

export function Logo({ className, tone = "dark" }: { className?: string; tone?: "dark" | "light" }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-2.5",
        tone === "dark" ? "text-navy-950" : "text-stone-50",
        className,
      )}
    >
      <LogoMark />
      <span className="font-wide text-xl leading-none font-extrabold tracking-[-0.02em]">Hill &amp; Stone</span>
    </span>
  );
}
