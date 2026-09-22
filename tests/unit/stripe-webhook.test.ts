import Stripe from "stripe";
import { beforeEach, describe, expect, it, vi } from "vitest";

const fulfill = vi.fn(async () => ({ state: "fulfilled" as const }));
const ended = vi.fn(async () => {});
vi.mock("@/lib/quotes/payments", () => ({ fulfillCheckoutSession: fulfill, markSessionEnded: ended }));

const { POST } = await import("@/app/api/webhooks/stripe/route");
const stripe = new Stripe("sk_test_unit");
const secret = "whsec_unit_test_secret";

function signed(event: object, overrideSecret = secret) {
  const payload = JSON.stringify(event);
  const header = stripe.webhooks.generateTestHeaderString({ payload, secret: overrideSecret });
  return new Request("http://localhost/api/webhooks/stripe", {
    method: "POST",
    body: payload,
    headers: { "stripe-signature": header, "content-type": "application/json" },
  });
}

const event = (type: string, object: object = { id: "cs_test_1", object: "checkout.session" }) => ({
  id: "evt_test_1",
  object: "event",
  type,
  data: { object },
});

describe("Stripe webhook", () => {
  beforeEach(() => {
    fulfill.mockClear();
    ended.mockClear();
  });

  it("rejects a missing signature", async () => {
    const res = await POST(new Request("http://localhost/api/webhooks/stripe", { method: "POST", body: "{}" }));
    expect(res.status).toBe(400);
  });

  it("rejects a signature made with the wrong secret", async () => {
    const res = await POST(signed(event("checkout.session.completed"), "whsec_attacker"));
    expect(res.status).toBe(400);
    expect(fulfill).not.toHaveBeenCalled();
  });

  it("rejects a tampered body", async () => {
    const req = signed(event("checkout.session.completed"));
    const tampered = new Request(req.url, {
      method: "POST",
      headers: req.headers,
      body: JSON.stringify(event("checkout.session.completed", { id: "cs_other" })),
    });
    expect((await POST(tampered)).status).toBe(400);
  });

  it("fulfills completed and async-succeeded sessions", async () => {
    expect((await POST(signed(event("checkout.session.completed")))).status).toBe(200);
    expect((await POST(signed(event("checkout.session.async_payment_succeeded")))).status).toBe(200);
    expect(fulfill).toHaveBeenCalledTimes(2);
  });

  it("records failed and expired sessions", async () => {
    await POST(signed(event("checkout.session.async_payment_failed")));
    await POST(signed(event("checkout.session.expired")));
    expect(ended.mock.calls.map((c) => (c as unknown[])[1])).toEqual(["FAILED", "CANCELED"]);
  });

  it("acknowledges unrelated events without acting", async () => {
    const res = await POST(signed(event("customer.created", { id: "cus_1", object: "customer" })));
    expect(res.status).toBe(200);
    expect(fulfill).not.toHaveBeenCalled();
  });

  it("returns 500 so Stripe retries when fulfillment throws", async () => {
    fulfill.mockRejectedValueOnce(new Error("db down"));
    expect((await POST(signed(event("checkout.session.completed")))).status).toBe(500);
  });
});
