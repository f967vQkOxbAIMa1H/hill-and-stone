// Team account inputs, shared by the forms (client) and server actions.
import { z } from "zod";
import { staffRoles } from "@/lib/auth/permissions";

export const passwordRule = z
  .string()
  .min(12, "Use at least 12 characters.")
  .max(200, "Use at most 200 characters.")
  .refine((v) => new Set(v).size >= 5, "Use a less repetitive password.");

export const staffSchema = z.object({
  id: z.string().optional(),
  name: z.string().trim().min(2, "Enter their full name.").max(80),
  email: z.string().trim().toLowerCase().pipe(z.email("Enter an email like name@yourdomain.com.")),
  phone: z
    .string()
    .trim()
    .optional()
    .default("")
    .refine((v) => !v || v.replace(/\D/g, "").length === 10, "Enter a 10-digit phone number, or leave it blank."),
  role: z.enum(staffRoles, { error: "Choose a role." }),
});
export type StaffInput = z.input<typeof staffSchema>;

export const newStaffSchema = staffSchema.extend({
  tempPassword: passwordRule,
  sendNotice: z.boolean().default(true),
});
export type NewStaffInput = z.input<typeof newStaffSchema>;

export const changePasswordSchema = z
  .object({
    current: z.string().min(1, "Enter your current password."),
    next: passwordRule,
    confirm: z.string(),
  })
  .refine((v) => v.next === v.confirm, { path: ["confirm"], message: "The two new passwords don't match." })
  .refine((v) => v.next !== v.current, { path: ["next"], message: "Choose a password different from your current one." });
export type ChangePasswordInput = z.input<typeof changePasswordSchema>;
