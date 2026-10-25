import type { ServiceCategory } from "@/generated/prisma/enums";
import { PlayOnView } from "@/components/ui/play-on-view";
import { ExteriorRepair } from "./exterior-repair";
import { HomeImprovement } from "./home-improvement";
import { InteriorRepair } from "./interior-repair";
import { PropertyMaintenance } from "./property-maintenance";

const drawings: Partial<Record<ServiceCategory, (p: { className?: string }) => React.ReactNode>> = {
  INTERIOR_REPAIRS: InteriorRepair,
  EXTERIOR_REPAIRS: ExteriorRepair,
  PROPERTY_MAINTENANCE: PropertyMaintenance,
  HOME_IMPROVEMENTS: HomeImprovement,
};

/**
 * A service's animated drawing. Plays once when it scrolls into view; hovering or focusing the
 * `replayFrom` ancestor (the card link, the scope sheet) plays it again.
 */
export function ServiceIllustration({ category, replayFrom, className }: { category: ServiceCategory; replayFrom?: string; className?: string }) {
  const Drawing = drawings[category];
  if (!Drawing) return null;
  return (
    <PlayOnView replayFrom={replayFrom} className={className}>
      <Drawing className="h-full w-full" />
    </PlayOnView>
  );
}
