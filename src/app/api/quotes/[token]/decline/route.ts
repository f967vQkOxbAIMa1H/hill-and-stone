import { NextResponse } from "next/server";
import { z } from "zod";
import { stripTags } from "@/lib/sanitize";
import { clientIp, rateLimit } from "@/lib/rate-limit";
import { declineQuote, QuoteActionError } from "@/lib/quotes/payments";
import { getQuoteByToken } from "@/lib/quotes/queries";
import { declineReasons } from "@/lib/quotes/state";

const body = z.object({
  reason: z.enum(declineReasons.map((r) => r.value) as [string, ...string[]], { error: "Choose a reason." }),
  note: z.string().overwrite(stripTags).trim().max(1000, "Keep your note under 1,000 characters.").optional(),
});

export async function POST(request: Request, { params }: RouteContext<"/api/quotes/[token]/decline">) {
  const { token } = await params;
  if (!rateLimit(`decline:${clientIp(request.headers)}`, 10, 10 * 60_000)) {
    return NextResponse.json({ error: "Too many attempts. Wait a few minutes and try again." }, { status: 429 });
  }
  const parsed = body.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Choose a reason." }, { status: 400 });

  const quote = await getQuoteByToken(token);
  if (!quote) return NextResponse.json({ error: "This quote link isn't valid." }, { status: 404 });

  try {
    await declineQuote(quote, parsed.data.reason as never, parsed.data.note || null, {
      ipAddress: clientIp(request.headers),
      userAgent: request.headers.get("user-agent")?.slice(0, 300) ?? undefined,
    });
    return NextResponse.json({ ok: true });
  } catch (error) {
    if (error instanceof QuoteActionError) return NextResponse.json({ error: error.message }, { status: 409 });
    throw error;
  }
}
