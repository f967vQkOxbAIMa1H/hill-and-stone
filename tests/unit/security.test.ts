import { describe, expect, it } from "vitest";
import { coiRequestSchema } from "@/lib/coi";
import { rateLimit } from "@/lib/rate-limit";
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
  it("allows 5 per window, then refuses", () => {
    const key = `test:${Math.random()}`;
    const results = Array.from({ length: 6 }, () => rateLimit(key, 5, 15 * 60_000));
    expect(results).toEqual([true, true, true, true, true, false]);
  });
});
