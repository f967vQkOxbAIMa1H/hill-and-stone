import { LogoMark } from "@/components/brand/LogoMark";
import { cn } from "@/lib/utils";

export { LogoMark };

/**
 * Header lockup: the mark beside two stacked, letter-spaced lines, "HILL & STONE" over "HOME SOLUTIONS".
 * tone="current" inherits color from the parent (the adaptive header sets it); "dark" is navy, "light" cream.
 */
export function Logo({ className, tone = "dark" }: { className?: string; tone?: "dark" | "light" | "current" }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-3",
        tone === "dark" && "text-navy-950",
        tone === "light" && "text-stone-50",
        className,
      )}
    >
      <LogoMark className="h-8 sm:h-9" />
      <span className="flex flex-col gap-[0.3em] leading-none uppercase">
        <span className="text-[0.9375rem] font-bold tracking-[0.2em] sm:text-base">Hill &amp; Stone</span>
        <span className="text-[0.625rem] font-semibold tracking-[0.34em] opacity-80 sm:text-[0.6875rem]">Home Solutions</span>
      </span>
    </span>
  );
}
