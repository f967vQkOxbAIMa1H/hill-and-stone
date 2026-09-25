import { BadgeCheck, FileCheck2, ShieldCheck, UserCheck } from "lucide-react";
import { getSite } from "@/lib/settings";
import type { SiteConfig } from "@/lib/site";
import { cn } from "@/lib/utils";
import { ScrollReveal } from "@/components/ScrollReveal";

// Each commitment carries a specific, checkable detail rather than a slogan.
export const commitments = (site: SiteConfig) => [
  {
    icon: FileCheck2,
    title: "Licensed and insured",
    body: [
      site.licenseNumber ? `${site.licenseLabel} ${site.licenseNumber}.` : "Licensed for home improvement work in Arkansas.",
      site.insuranceSummary ? `${site.insuranceSummary}.` : "Fully insured.",
      "We send a certificate of insurance on request.",
    ].join(" "),
  },
  {
    icon: UserCheck,
    title: "Background-checked technicians",
    body: `Everyone who comes to your house has passed a criminal background check, rechecked every ${site.backgroundRecheckYears} years, and works for us directly.`,
  },
  {
    icon: ShieldCheck,
    title: "Workmanship warranty",
    body: `A ${site.warranty.replace(" warranty", "")} on our labor. If something we built or fixed fails, we come back and make it right.`,
  },
  {
    icon: BadgeCheck,
    title: "Satisfaction guarantee",
    body: "We walk the job with you before we call it finished. You don't pay the final invoice until you're happy with the work.",
  },
];

export async function TrustList({ className, tone = "light" }: { className?: string; tone?: "light" | "dark" }) {
  const site = await getSite();
  const dark = tone === "dark";
  return (
    <dl className={cn("grid gap-x-10 sm:grid-cols-2", className)}>
      {commitments(site).map(({ icon: Icon, title, body }, i) => (
        <ScrollReveal key={title} delay={(i % 2) * 0.15} className={cn("flex gap-4 border-t py-6", dark ? "border-navy-800" : "border-navy-200")}>
          <Icon aria-hidden className={cn("mt-0.5 size-6 shrink-0", dark ? "text-copper-500" : "text-copper-700")} />
          <div>
            <dt className={cn("font-bold", dark ? "text-stone-50" : "text-navy-950")}>{title}</dt>
            <dd className={cn("mt-1.5", dark ? "text-navy-300" : "text-navy-600")}>{body}</dd>
          </div>
        </ScrollReveal>
      ))}
    </dl>
  );
}
