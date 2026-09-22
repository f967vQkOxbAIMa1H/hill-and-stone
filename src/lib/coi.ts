import { z } from "zod";

// Certificate of insurance request. Shared by the form and the API route.
export const coiRequestSchema = z.object({
  name: z.string().trim().min(1, "Enter your name.").max(100),
  email: z.string().trim().toLowerCase().pipe(z.email("Enter an email like name@example.com.")),
  organization: z.string().trim().max(120).optional().default(""),
  address: z.string().trim().min(3, "Enter the property address the certificate is for.").max(200),
  notes: z.string().trim().max(1000).optional().default(""),
});
export type CoiRequestInput = z.input<typeof coiRequestSchema>;
