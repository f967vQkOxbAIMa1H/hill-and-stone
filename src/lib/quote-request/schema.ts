// Shared by the form (client) and the API route (server).
import { z } from "zod";
import { stripTags } from "@/lib/sanitize";
import { BudgetRange, ContactMethod, ProjectTimeline, ServiceCategory } from "@/generated/prisma/enums";

const text = (max: number) => z.string().overwrite(stripTags).trim().max(max, `Keep this under ${max} characters.`);

export const quoteRequestSchema = z.object({
  firstName: text(60).min(1, "Enter your first name."),
  lastName: text(60).min(1, "Enter your last name."),
  email: z.string().trim().toLowerCase().pipe(z.email("Enter an email like name@example.com.")),
  phone: z
    .string()
    .trim()
    .transform((v) => v.replace(/\D/g, "").replace(/^1(?=\d{10}$)/, ""))
    .pipe(z.string().length(10, "Enter a 10-digit phone number, like (479) 555-0142.")),
  line1: text(120).min(3, "Enter the street address where the work is."),
  line2: text(60).optional().default(""),
  city: text(60).min(2, "Enter the city."),
  postalCode: z.string().trim().regex(/^\d{5}$/, "Enter a 5-digit ZIP code."),
  preferredContact: z.enum(ContactMethod, { error: "Choose how you'd like us to reach you." }),
  category: z.enum(ServiceCategory, { error: "Choose the kind of work." }),
  description: text(4000).min(20, "Tell us a bit more: at least a sentence or two about what needs doing."),
  timeline: z.enum(ProjectTimeline, { error: "Choose a timeline." }),
  budgetRange: z.enum(BudgetRange, { error: "Choose a budget range, or \"Not sure yet\"." }),
});

export type QuoteRequestInput = z.input<typeof quoteRequestSchema>;
export type QuoteRequest = z.output<typeof quoteRequestSchema>;

export const attributionSchema = z
  .object({
    utmSource: text(200),
    utmMedium: text(200),
    utmCampaign: text(200),
    utmTerm: text(200),
    utmContent: text(200),
    gclid: text(300),
    fbclid: text(300),
    landingPage: text(500),
    referrer: text(500),
  })
  .partial();

export type FieldErrors = Partial<Record<keyof QuoteRequestInput | "photos" | "form", string>>;

export function flattenErrors(error: z.ZodError): FieldErrors {
  const out: FieldErrors = {};
  for (const issue of error.issues) {
    const key = issue.path[0] as keyof FieldErrors;
    if (key && !out[key]) out[key] = issue.message;
  }
  return out;
}
