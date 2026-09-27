import { NextResponse } from "next/server";
import { clientIp, rateLimit } from "@/lib/rate-limit";
import { createCheckout, QuoteActionError } from "@/lib/quotes/payments";
import { getQuoteByToken } from "@/lib/quotes/queries";

/** Opens Stripe Checkout for the balance due. Only works once the job is complete and payment was requested. */
export async function POST(request: Request, { params }: RouteContext<"/api/quotes/[token]/checkout">) {
  const { token } = await params;
  if (!rateLimit(`checkout:${clientIp(request.headers)}`, 10, 10 * 60_000)) {
    return NextResponse.json({ error: "Too many attempts. Wait a few minutes and try again." }, { status: 429 });
  }
  const quote = await getQuoteByToken(token);
  if (!quote) return NextResponse.json({ error: "This quote link isn't valid." }, { status: 404 });

  try {
    const url = await createCheckout(quote);
    return NextResponse.json({ url });
  } catch (error) {
    if (error instanceof QuoteActionError) {
      const status = error.code === "not_available" ? 409 : error.code === "payments_unavailable" ? 503 : 502;
      return NextResponse.json({ error: error.message }, { status });
    }
    throw error;
  }
}
