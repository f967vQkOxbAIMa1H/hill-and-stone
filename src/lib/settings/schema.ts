// Business settings the owner edits at /admin/settings/site. Client-safe.
import { z } from "zod";
import { stripTags } from "@/lib/sanitize";

const text = (max: number) => z.string().overwrite(stripTags).trim().max(max);
const nullableText = (max: number) =>
  z
    .string()
    .overwrite(stripTags)
    .trim()
    .max(max)
    .nullable()
    .transform((v) => (v ? v : null));
const intIn = (min: number, max: number, label: string) =>
  z.coerce.number({ error: `Enter a number for ${label}.` }).int(`Use a whole number for ${label}.`).min(min, `${label} must be at least ${min}.`).max(max, `${label} can be at most ${max}.`);

export const insuranceTypes = ["General liability", "Workers' compensation", "Commercial auto"] as const;

export const settingsSchema = z.object({
  contact: z.object({
    phone: text(30).refine((v) => v.replace(/\D/g, "").replace(/^1(?=\d{10}$)/, "").length === 10, "Enter a 10-digit phone number, like (479) 555-0100."),
    email: z.string().trim().toLowerCase().pipe(z.email("Enter an email like hello@yourdomain.com.")),
    hours: text(120).min(3, "Enter your hours, like Mon–Fri 7am–6pm."),
  }),
  /**
   * License and insurance details stay off the site until `showPublicly` is ticked (after the LLC is set up
   * with the City of Fayetteville and the state). The site always says "licensed and insured for minor home repair".
   */
  license: z.object({ number: nullableText(40), showPublicly: z.boolean().default(false) }),
  insurance: z
    .array(z.object({ type: z.enum(insuranceTypes), detail: nullableText(120) }))
    .length(insuranceTypes.length),
  warrantyMonths: intIn(1, 120, "Warranty months"),
  googleReviewsUrl: nullableText(300).refine((v) => !v || /^https:\/\/\S+$/.test(v), "Use a full https:// link, or leave it blank."),
  story: z.object({
    founderName: nullableText(80),
    coFounderName: nullableText(80),
    foundedYear: z
      .union([z.literal(""), z.null(), z.coerce.number().int().min(1950, "Use a year like 2019.").max(2100, "Use a year like 2019.")])
      .transform((v) => (v === "" || v === null ? null : v)),
    hometown: nullableText(60),
    crewSize: z
      .union([z.literal(""), z.null(), z.coerce.number().int().min(1, "Crew size must be at least 1.").max(500)])
      .transform((v) => (v === "" || v === null ? null : v)),
    founderBackground: nullableText(200),
  }),
  policies: z.object({
    replyBusinessDays: intIn(1, 10, "Reply time"),
    coiBusinessDays: intIn(1, 30, "Certificate turnaround"),
    backgroundRecheckYears: intIn(1, 10, "Background check interval"),
    confirmed: z.boolean(),
  }),
  quoteDefaults: z.object({
    tripFee: z.string().trim().regex(/^\d{1,5}(\.\d{1,2})?$/, "Enter a trip fee like 75 or 89.50."),
    taxRatePercent: z
      .string()
      .trim()
      .regex(/^\d{1,2}(\.\d{1,3})?$/, "Enter a rate like 9.75.")
      .refine((v) => Number(v) <= 20, "That tax rate looks too high."),
    validDays: intIn(1, 120, "Quote validity"),
    confirmed: z.boolean(),
  }),
});

export type Settings = z.output<typeof settingsSchema>;
export type SettingsInput = z.input<typeof settingsSchema>;
