import "server-only";
import { z } from "zod";
import { appUrl } from "@/lib/site";

// Optional keys are filled in as later phases land; validation fails fast on bad values.
const optional = z.string().trim().optional().transform((v) => v || undefined);

const schema = z.object({
  // Required everywhere except Netlify, where Netlify Database supplies the connection (see src/lib/db.ts).
  DATABASE_URL: z.url().optional().or(z.literal("").transform(() => undefined)),
  NEXT_PUBLIC_APP_URL: z.url().default(appUrl).transform((u) => u.replace(/\/$/, "")),
  /** The business inbox for new requests, accepted quotes, certificate requests and low-rating feedback. */
  ADMIN_NOTIFICATION_EMAIL: z.email().optional(),
  /** Older name for ADMIN_NOTIFICATION_EMAIL, still read so existing deploys keep working. */
  CONTRACTOR_NOTIFY_EMAIL: z.email().optional(),
  RESEND_API_KEY: optional,
  EMAIL_FROM: optional,
  /** Reply-To for customer emails that don't set one; defaults to the public contact email. */
  EMAIL_REPLY_TO: z.email().optional(),
  STRIPE_SECRET_KEY: optional,
  STRIPE_WEBHOOK_SECRET: optional,
  // Local testing only: point the SDK at stripe-mock (e.g. localhost:12111 over http).
  STRIPE_API_HOST: optional,
  STRIPE_API_PORT: optional,
  STRIPE_API_PROTOCOL: z.enum(["http", "https"]).optional(),
  CRON_SECRET: optional,
  STORAGE_BUCKET: optional,
  STORAGE_ENDPOINT: optional,
  STORAGE_ACCESS_KEY_ID: optional,
  STORAGE_SECRET_ACCESS_KEY: optional,
});

const parsed = schema.parse(process.env);

export const env = { ...parsed, ADMIN_NOTIFICATION_EMAIL: parsed.ADMIN_NOTIFICATION_EMAIL ?? parsed.CONTRACTOR_NOTIFY_EMAIL };
