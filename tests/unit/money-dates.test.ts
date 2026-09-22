import { describe, expect, it } from "vitest";
import { addBusinessDays } from "@/lib/dates";
import { formatCents, lineTotalCents, quoteTotals } from "@/lib/money";

describe("money", () => {
  it("multiplies fractional quantities without float drift", () => {
    expect(lineTotalCents(4500, 8500)).toBe(38_250); // 4.5 h × $85
    expect(lineTotalCents(333, 100)).toBe(33);
  });
  it("totals with tax and deposit in cents", () => {
    const t = quoteTotals(
      [
        { quantityMilli: 1000, unitPriceCents: 10_000 },
        { quantityMilli: 1000, unitPriceCents: -1_000 }, // discount
      ],
      975,
      5000,
    );
    expect(t).toEqual({ subtotalCents: 9_000, taxCents: 878, totalCents: 9_878, depositCents: 4_939 });
  });
  it("formats USD", () => expect(formatCents(123_456)).toBe("$1,234.56"));
});

describe("addBusinessDays", () => {
  it("skips weekends in Central time", () => {
    // Friday 2026-09-25 3pm Central -> Monday
    const d = addBusinessDays(new Date("2026-09-25T20:00:00Z"), 1);
    expect(new Intl.DateTimeFormat("en-US", { timeZone: "America/Chicago", weekday: "long" }).format(d)).toBe("Monday");
  });
  it("counts weekdays normally", () => {
    const d = addBusinessDays(new Date("2026-09-22T15:00:00Z"), 1); // Tuesday
    expect(new Intl.DateTimeFormat("en-US", { timeZone: "America/Chicago", weekday: "long" }).format(d)).toBe("Wednesday");
  });
});
