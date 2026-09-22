import { NextResponse } from "next/server";
import { z } from "zod";
import { clientIp, rateLimit } from "@/lib/rate-limit";
import { createCheckout, QuoteActionError } from "@/lib/quotes/payments";
import { getQuoteByToken } from "@/lib/quotes/queries";

const body = z.object({ option: z.enum(["deposit", "full", "balance"]) });

export async function POST(request: Request, { params }: RouteContext<"/api/quotes/[token]/checkout">) {
  const { token } = await params;
  if (!rateLimit(`checkout:${clientIp(request.headers)}`, 10, 10 * 60_000)) {
    return NextResponse.json({ error: "Too many attempts. Wait a few minutes and try again." }, { status: 429 });
  }
  const parsed = body.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Choose how much to pay." }, { status: 400 });

  const quote = await getQuoteByToken(token);
  if (!quote) return NextResponse.json({ error: "This quote link isn't valid." }, { status: 404 });

  try {
    const url = await createCheckout(quote, parsed.data.option);
    return NextResponse.json({ url });
  } catch (error) {
    if (error instanceof QuoteActionError) {
      const status = error.code === "not_available" ? 409 : error.code === "payments_unavailable" ? 503 : 502;
      return NextResponse.json({ error: error.message }, { status });
    }
    throw error;
  }
}
