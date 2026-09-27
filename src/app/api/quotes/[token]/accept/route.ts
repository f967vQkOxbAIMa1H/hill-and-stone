import { NextResponse } from "next/server";
import { clientIp, rateLimit } from "@/lib/rate-limit";
import { acceptQuote, QuoteActionError } from "@/lib/quotes/payments";
import { getQuoteByToken } from "@/lib/quotes/queries";

/** Accepting a quote charges nothing: payment is due upon completion. */
export async function POST(request: Request, { params }: RouteContext<"/api/quotes/[token]/accept">) {
  const { token } = await params;
  if (!rateLimit(`accept:${clientIp(request.headers)}`, 10, 10 * 60_000)) {
    return NextResponse.json({ error: "Too many attempts. Wait a few minutes and try again." }, { status: 429 });
  }

  const quote = await getQuoteByToken(token);
  if (!quote) return NextResponse.json({ error: "This quote link isn't valid." }, { status: 404 });

  try {
    await acceptQuote(quote, {
      ipAddress: clientIp(request.headers),
      userAgent: request.headers.get("user-agent")?.slice(0, 300) ?? undefined,
    });
    return NextResponse.json({ ok: true });
  } catch (error) {
    if (error instanceof QuoteActionError) return NextResponse.json({ error: error.message }, { status: 409 });
    throw error;
  }
}
