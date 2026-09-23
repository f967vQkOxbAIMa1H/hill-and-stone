import { describe, expect, it } from "vitest";
import { isUntracked, redactPath } from "@/lib/analytics";

describe("analytics privacy", () => {
  it("never reports a quote token", () => {
    expect(redactPath("/quote/p3ja2bqo940LWNsckO1gpfJCEDKCJ1Zlf-ZClJyPlHA")).toBe("/quote/[token]");
    expect(redactPath("/services")).toBe("/services");
  });
  it("doesn't track the admin", () => {
    expect(isUntracked("/admin")).toBe(true);
    expect(isUntracked("/admin/quotes/abc")).toBe(true);
    expect(isUntracked("/administer-a-quote")).toBe(false);
  });
});
