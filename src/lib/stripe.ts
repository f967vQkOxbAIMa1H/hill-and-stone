import "server-only";
import Stripe from "stripe";
import { env } from "@/lib/env";

let client: Stripe | null = null;

/** Stripe client, or null when STRIPE_SECRET_KEY isn't configured. */
export function getStripe(): Stripe | null {
  if (!env.STRIPE_SECRET_KEY) return null;
  if (!client) {
    const local = env.STRIPE_API_HOST === "localhost" || env.STRIPE_API_HOST === "127.0.0.1";
    client = new Stripe(env.STRIPE_SECRET_KEY, {
      maxNetworkRetries: 2,
      appInfo: { name: "hill-and-stone" },
      // Overrides exist only for stripe-mock; plain http is refused for anything but localhost.
      ...(env.STRIPE_API_HOST && local
        ? { host: env.STRIPE_API_HOST, port: Number(env.STRIPE_API_PORT ?? 12111), protocol: env.STRIPE_API_PROTOCOL ?? "http" }
        : {}),
    });
  }
  return client;
}

/**
 * Card covers Visa, Mastercard, American Express and Discover, and Checkout shows
 * Apple Pay and Google Pay automatically on supported devices. Cash App Pay is its own type.
 */
export const PAYMENT_METHOD_TYPES = ["card", "cashapp"] as const;
