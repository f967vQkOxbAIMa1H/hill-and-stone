// Portfolio project and review inputs, shared by admin forms (client) and server actions.
import { z } from "zod";
import { isPublicRating, PUBLIC_MIN_RATING } from "@/lib/reviews";
import { stripTags } from "@/lib/sanitize";
import { ServiceCategory } from "@/generated/prisma/enums";

const optionalText = (max: number) => z.string().overwrite(stripTags).trim().max(max).optional().default("");
const optionalDate = z
  .string()
  .trim()
  .optional()
  .default("")
  .refine((v) => !v || /^\d{4}-\d{2}-\d{2}$/.test(v), "Use a date like 2026-09-14.");

export const slugify = (s: string) =>
  s
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^\w\s-]/g, "")
    .trim()
    .replace(/[\s_]+/g, "-")
    .replace(/-+/g, "-")
    .slice(0, 80);

export const projectSchema = z.object({
  id: z.string().optional(),
  title: z.string().overwrite(stripTags).trim().min(3, "Give the project a title.").max(120),
  slug: z
    .string()
    .trim()
    .max(80)
    .optional()
    .default("")
    .refine((v) => !v || /^[a-z0-9]+(-[a-z0-9]+)*$/.test(v), "Use lowercase letters, numbers and dashes, like back-door-trim."),
  category: z.enum(ServiceCategory, { error: "Choose a category." }),
  city: z.string().overwrite(stripTags).trim().min(2, "Enter the city.").max(60),
  summary: z.string().overwrite(stripTags).trim().min(10, "Describe the problem in a sentence.").max(300),
  scopeOfWork: z.string().overwrite(stripTags).trim().min(10, "Describe what you did.").max(3000),
  results: optionalText(1000),
  materials: optionalText(1000), // one per line
  durationDays: z
    .string()
    .trim()
    .optional()
    .default("")
    .refine((v) => !v || (/^\d{1,3}$/.test(v) && Number(v) > 0), "Enter a whole number of days."),
  completedAt: optionalDate,
  featured: z.boolean().default(false),
  published: z.boolean().default(false),
});
export type ProjectInput = z.input<typeof projectSchema>;

export const imageRoles = ["before", "after", "gallery"] as const;
export type ImageRole = (typeof imageRoles)[number];

export const reviewSources = [
  { value: "google", label: "Google" },
  { value: "facebook", label: "Facebook" },
  { value: "nextdoor", label: "Nextdoor" },
  { value: "direct", label: "Sent to us directly" },
  { value: "website", label: "Submitted on our website" },
] as const;

export const reviewSchema = z
  .object({
    id: z.string().optional(),
    authorName: z.string().overwrite(stripTags).trim().min(2, "Enter the customer's name as they want it shown, like “Dana R.”").max(80),
    city: z.string().overwrite(stripTags).trim().min(2, "Enter the city.").max(60),
    body: z.string().overwrite(stripTags).trim().min(10, "Paste the review text.").max(2000),
    rating: z.coerce.number().int().min(1).max(5),
    source: z.enum(reviewSources.map((s) => s.value) as [string, ...string[]]),
    sourceUrl: z
      .string()
      .trim()
      .optional()
      .default("")
      .refine((v) => !v || /^https:\/\/\S+$/.test(v), "Use a full https:// link, or leave it blank."),
    reviewedAt: optionalDate,
    projectId: z.string().optional().default(""),
    featured: z.boolean().default(false),
    published: z.boolean().default(false),
    permission: z.boolean().default(false),
  })
  .refine((r) => !r.published || r.permission, {
    path: ["permission"],
    message: "Confirm you have the customer's permission before publishing.",
  })
  .refine((r) => !r.published || isPublicRating(r.rating), {
    path: ["published"],
    message: `Reviews under ${PUBLIC_MIN_RATING} stars stay private and can't be published.`,
  });
export type ReviewInput = z.input<typeof reviewSchema>;
