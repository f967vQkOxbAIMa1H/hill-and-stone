import "server-only";
import { z } from "zod";

// Optional keys are filled in as later phases land; validation fails fast on bad values.
const optional = z.string().trim().optional().transform((v) => v || undefined);

const schema = z.object({
  DATABASE_URL: z.url(),
  NEXT_PUBLIC_APP_URL: z.url().default("http://localhost:3000"),
  CONTRACTOR_NOTIFY_EMAIL: z.email().optional(),
  RESEND_API_KEY: optional,
  EMAIL_FROM: optional,
  STRIPE_SECRET_KEY: optional,
  STRIPE_WEBHOOK_SECRET: optional,
  // Local testing only: point the SDK at stripe-mock (e.g. localhost:12111 over http).
  STRIPE_API_HOST: optional,
  STRIPE_API_PORT: optional,
  STRIPE_API_PROTOCOL: z.enum(["http", "https"]).optional(),
  STORAGE_BUCKET: optional,
  STORAGE_ENDPOINT: optional,
  STORAGE_ACCESS_KEY_ID: optional,
  STORAGE_SECRET_ACCESS_KEY: optional,
});

export const env = schema.parse(process.env);
