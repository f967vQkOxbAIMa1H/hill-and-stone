import { BadgeCheck, FileCheck2, ShieldCheck, UserCheck } from "lucide-react";
import { getSite } from "@/lib/settings";
import type { SiteConfig } from "@/lib/site";
import { cn } from "@/lib/utils";
import { ScrollReveal } from "@/components/ScrollReveal";

// Each commitment carries a specific, checkable detail rather than a slogan, and only appears once the
// owner turns that claim on in settings. With every claim off the list is empty and callers hide it.
export const commitments = (site: SiteConfig) =>
  [
    (site.insured || site.bonded || site.licenseNumber) && {
      icon: FileCheck2,
      title: [site.licenseNumber && "Licensed", site.insured && "insured", site.bonded && "bonded"]
        .filter(Boolean)
        .join(", ")
        .replace(/, ([^,]*)$/, " and $1")
        .replace(/^./, (c) => c.toUpperCase()),
      body: [
        site.credentialLine,
        site.insuranceSummary && `${site.insuranceSummary}.`,
        site.insured && "We send a certificate of insurance on request.",
      ]
        .filter(Boolean)
        .join(" "),
    },
    site.backgroundChecked && {
      icon: UserCheck,
      title: "Background-checked",
      body: `Everyone who comes to your house has passed a criminal background check, rechecked every ${site.backgroundRecheckYears} years.`,
    },
    site.warranty && {
      icon: ShieldCheck,
      title: "Workmanship warranty",
      body: `A ${site.warranty.replace(" warranty", "")} on our labor. If something we built or fixed fails, we come back and make it right.`,
    },
    site.satisfactionGuarantee && {
      icon: BadgeCheck,
      title: "Satisfaction guarantee",
      body: "We walk the job with you before we call it finished. You don't pay the final invoice until you're happy with the work.",
    },
  ].filter((c): c is { icon: typeof FileCheck2; title: string; body: string } => !!c);

export async function TrustList({ className, tone = "light" }: { className?: string; tone?: "light" | "dark" }) {
  const site = await getSite();
  const dark = tone === "dark";
  return (
    <dl className={cn("grid gap-x-10 sm:grid-cols-2", className)}>
      {commitments(site).map(({ icon: Icon, title, body }, i) => (
        <ScrollReveal key={title} delay={(i % 2) * 0.15} className={cn("flex gap-4 border-t py-6", dark ? "border-navy-800" : "border-navy-200")}>
          <Icon aria-hidden className={cn("mt-0.5 size-6 shrink-0", dark ? "text-stone-100" : "text-accent-700")} />
          <div>
            <dt className={cn("font-bold", dark ? "text-stone-50" : "text-navy-950")}>{title}</dt>
            <dd className={cn("mt-1.5", dark ? "text-navy-300" : "text-navy-600")}>{body}</dd>
          </div>
        </ScrollReveal>
      ))}
    </dl>
  );
}
