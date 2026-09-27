import { cn } from "@/lib/utils";

/** Why there's no price list: rates are project-specific. Keep prices, starting prices and hourly rates off the site. */
export function PricingNote({ className }: { className?: string }) {
  return (
    <div className={cn("border-l-2 border-copper-500 pl-4", className)}>
      <p className="font-bold">Every job is priced on its own</p>
      <p className="mt-1 max-w-[60ch] text-navy-600">
        We don&apos;t post rates or a price list. You get a custom written quote, or a price during a maintenance visit, before any
        work starts. Payment is due on completion, with no deposit.
      </p>
    </div>
  );
}
