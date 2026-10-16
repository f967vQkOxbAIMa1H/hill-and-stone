import { beforeEach, describe, expect, it, vi } from "vitest";
import { coiRequestSchema } from "@/lib/coi";
import { rateLimit, slidingEstimate } from "@/lib/rate-limit";

// A fake RateLimitHit table with the same atomic upsert semantics as Postgres.
const { rows, dbDown } = vi.hoisted(() => ({ rows: new Map<string, number>(), dbDown: { value: false } }));
vi.mock("@/lib/db", () => {
  const id = (w: { key_windowStart: { key: string; windowStart: Date } }) => `${w.key_windowStart.key}@${w.key_windowStart.windowStart.getTime()}`;
  const guard = () => {
    if (dbDown.value) throw new Error("connection refused");
  };
  return {
    db: {
      rateLimitHit: {
        upsert: async ({ where }: { where: Parameters<typeof id>[0] }) => {
          guard();
          const k = id(where);
          rows.set(k, (rows.get(k) ?? 0) + 1);
          return { count: rows.get(k)! };
        },
        findUnique: async ({ where }: { where: Parameters<typeof id>[0] }) => {
          guard();
          const c = rows.get(id(where));
          return c === undefined ? null : { count: c };
        },
        deleteMany: async () => ({ count: 0 }),
      },
    },
  };
});
import { quoteRequestSchema } from "@/lib/quote-request/schema";
import { stripTags } from "@/lib/sanitize";

describe("stripTags", () => {
  it("removes script blocks, tags, handlers and comments", () => {
    expect(stripTags(`Fix the door<script>alert("x")</script> please`)).toBe("Fix the door please");
    expect(stripTags(`<img src=x onerror="alert(1)">Trim`)).toBe("Trim");
    expect(stripTags(`<b>Bold</b> and <a href="javascript:alert(1)">link</a>`)).toBe("Bold and link");
    expect(stripTags("Before<!-- hidden -->after")).toBe("Beforeafter");
  });

  it("keeps ordinary text that uses angle brackets", () => {
    expect(stripTags("The gap is < 2 inches and > 1 inch")).toBe("The gap is < 2 inches and > 1 inch");
    expect(stripTags("Budget <$500")).toBe("Budget <$500");
  });
});

describe("form schemas strip HTML before saving", () => {
  it("quote requests", () => {
    const parsed = quoteRequestSchema.shape.description.parse("Leaky sink <script>steal()</script>under the counter");
    expect(parsed).toBe("Leaky sink under the counter");
    expect(quoteRequestSchema.shape.firstName.parse("<b>Dana</b>")).toBe("Dana");
  });

  it("certificate requests", () => {
    expect(coiRequestSchema.shape.notes.parse(`<iframe src="//evil"></iframe>Send to HOA`)).toBe("Send to HOA");
  });
});

describe("rateLimit", () => {
  beforeEach(() => {
    rows.clear();
    dbDown.value = false;
    vi.useRealTimers();
  });

  it("allows 5 per window, then refuses, counting in the shared store", async () => {
    const key = `test:${Math.random()}`;
    const results = [];
    for (let i = 0; i < 6; i++) results.push(await rateLimit(key, 5, 15 * 60_000));
    expect(results).toEqual([true, true, true, true, true, false]);
    // Keys are hashed: no raw IPs or emails in the table.
    expect([...rows.keys()].some((k) => k.includes("test:"))).toBe(false);
  });

  it("carries the previous window's hits across the boundary", async () => {
    vi.useFakeTimers();
    const windowMs = 60_000;
    vi.setSystemTime(Math.ceil(Date.now() / windowMs) * windowMs - 1_000); // 1s before a boundary
    for (let i = 0; i < 5; i++) await rateLimit("burst", 5, windowMs);
    vi.setSystemTime(Math.ceil(Date.now() / windowMs) * windowMs + 1_000); // 1s after it
    expect(await rateLimit("burst", 5, windowMs)).toBe(false);
  });

  it("falls back to the in-memory limiter when the database is down", async () => {
    dbDown.value = true;
    const key = `down:${Math.random()}`;
    const results = [];
    for (let i = 0; i < 4; i++) results.push(await rateLimit(key, 3, 60_000));
    expect(results).toEqual([true, true, true, false]);
  });

  it("estimates hits across a sliding window", () => {
    expect(slidingEstimate(10, 2, 0.25)).toBe(9.5);
    expect(slidingEstimate(10, 2, 1)).toBe(2);
    expect(slidingEstimate(10, 2, -1)).toBe(12);
  });
});
