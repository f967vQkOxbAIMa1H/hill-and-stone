import { NextResponse } from "next/server";
import type Stripe from "stripe";
import { env } from "@/lib/env";
import { fulfillCheckoutSession, markSessionEnded } from "@/lib/quotes/payments";
import { getStripe } from "@/lib/stripe";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const stripe = getStripe();
  if (!stripe || !env.STRIPE_WEBHOOK_SECRET) {
    return NextResponse.json({ error: "Stripe is not configured" }, { status: 503 });
  }

  // Signature verification needs the raw body, byte for byte.
  const payload = await request.text();
  const signature = request.headers.get("stripe-signature");
  let event: Stripe.Event;
  try {
    if (!signature) throw new Error("missing stripe-signature header");
    event = stripe.webhooks.constructEvent(payload, signature, env.STRIPE_WEBHOOK_SECRET);
  } catch (error) {
    console.warn("Stripe webhook rejected:", error instanceof Error ? error.message : error);
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  try {
    switch (event.type) {
      case "checkout.session.completed":
      case "checkout.session.async_payment_succeeded": {
        const result = await fulfillCheckoutSession(event.data.object);
        return NextResponse.json({ received: true, result: result.state });
      }
      case "checkout.session.async_payment_failed":
        await markSessionEnded(event.data.object, "FAILED");
        break;
      case "checkout.session.expired":
        await markSessionEnded(event.data.object, "CANCELED");
        break;
      default:
        // Not subscribed on purpose; acknowledge so Stripe doesn't retry.
        break;
    }
    return NextResponse.json({ received: true });
  } catch (error) {
    // A 500 makes Stripe retry, which is what we want for database hiccups. Fulfillment is idempotent.
    console.error("Stripe webhook handler failed", event.type, event.id, error);
    return NextResponse.json({ error: "Handler failed" }, { status: 500 });
  }
}
