// Labels for quote-request choices. Safe to import on the client.
import type { BudgetRange, ContactMethod, ProjectTimeline, ServiceCategory } from "@/generated/prisma/enums";

export const categoryOptions: { value: ServiceCategory; label: string }[] = [
  { value: "GENERAL_REPAIRS", label: "General repairs" },
  { value: "CARPENTRY_DOORS_TRIM", label: "Carpentry, doors & trim" },
  { value: "DRYWALL_PAINTING", label: "Drywall & painting" },
  { value: "FLOORING_FIXTURES_HARDWARE", label: "Flooring, fixtures & hardware" },
  { value: "EXTERIOR_REPAIRS", label: "Exterior repairs" },
  { value: "RENOVATIONS_CUSTOM", label: "Small renovation or custom project" },
  { value: "OTHER", label: "Something else" },
];

export const timelineOptions: { value: ProjectTimeline; label: string }[] = [
  { value: "ASAP", label: "As soon as possible" },
  { value: "WITHIN_2_WEEKS", label: "Within 2 weeks" },
  { value: "WITHIN_A_MONTH", label: "Within a month" },
  { value: "FLEXIBLE", label: "I'm flexible" },
];

export const budgetOptions: { value: BudgetRange; label: string }[] = [
  { value: "UNDER_500", label: "Under $500" },
  { value: "FROM_500_TO_1500", label: "$500–1,500" },
  { value: "FROM_1500_TO_5000", label: "$1,500–5,000" },
  { value: "FROM_5000_TO_15000", label: "$5,000–15,000" },
  { value: "OVER_15000", label: "Over $15,000" },
  { value: "NOT_SURE", label: "Not sure yet" },
];

export const contactOptions: { value: ContactMethod; label: string }[] = [
  { value: "PHONE", label: "Call me" },
  { value: "TEXT", label: "Text me" },
  { value: "EMAIL", label: "Email me" },
];

export const labelFor = <T extends string>(options: { value: T; label: string }[], value: T) =>
  options.find((o) => o.value === value)?.label ?? value;

export const UPLOAD_LIMITS = {
  maxFiles: 10,
  maxBytes: 10 * 1024 * 1024,
  types: ["image/jpeg", "image/png", "image/webp"] as const,
  accept: ".jpg,.jpeg,.png,.webp,image/jpeg,image/png,image/webp",
};
