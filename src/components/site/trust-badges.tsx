import { BadgeCheck, ShieldCheck, UserCheck } from "lucide-react";
import type { SiteConfig } from "@/lib/site";
import { cn } from "@/lib/utils";

/** The three promises customers ask about first, as one credential plate under the hero's buttons. */
export function TrustBadges({ site, className }: { site: SiteConfig; className?: string }) {
  const badges = [
    { icon: UserCheck, title: "Background\u2011checked", body: `Every technician, rechecked every ${site.backgroundRecheckYears} years` },
    { icon: ShieldCheck, title: "Workmanship warranty", body: `${site.warranty.replace(" workmanship warranty", "")} on our labor` },
    { icon: BadgeCheck, title: "Satisfaction guarantee", body: "You pay when you're happy with the work" },
  ];
  return (
    <div className={className}>
      <ul aria-label="Our guarantees" className="grid divide-y divide-navy-200 border-y border-navy-200 sm:grid-cols-3 sm:divide-x sm:divide-y-0">
        {badges.map(({ icon: Icon, title, body }, i) => (
          <li key={title} className={cn("flex gap-3 py-4 sm:flex-col sm:gap-2 sm:px-4", i === 0 && "sm:pl-0")}>
            <Icon aria-hidden className="mt-0.5 size-5 shrink-0 text-copper-700 sm:mt-0" />
            <div>
              <p className="leading-tight font-bold">{title}</p>
              <p className="mt-1 text-sm leading-snug text-navy-600">{body}</p>
            </div>
          </li>
        ))}
      </ul>
      <p className="mt-3 text-sm text-navy-600">{site.licenseStatement}.</p>
    </div>
  );
}
