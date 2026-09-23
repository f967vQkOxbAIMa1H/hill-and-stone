import { mkdtemp, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";
import { assertSafeKey, driverFromEnv, localDriver } from "@/lib/storage/drivers";

const expire = vi.fn(async () => ({ checked: 2, expired: 1 }));
vi.mock("@/lib/quotes/expire", () => ({ expireOverdueQuotes: expire }));
process.env.CRON_SECRET = "cron-unit-secret";
const { GET } = await import("@/app/api/cron/expire-quotes/route");

describe("expire-quotes cron route", () => {
  beforeEach(() => expire.mockClear());
  it("rejects missing or wrong secrets", async () => {
    expect((await GET(new Request("http://x/api/cron/expire-quotes"))).status).toBe(401);
    expect((await GET(new Request("http://x", { headers: { authorization: "Bearer nope" } }))).status).toBe(401);
    expect(expire).not.toHaveBeenCalled();
  });
  it("runs the job with the right secret", async () => {
    const res = await GET(new Request("http://x", { headers: { authorization: "Bearer cron-unit-secret" } }));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ checked: 2, expired: 1 });
  });
});

describe("storage drivers", () => {
  let dir = "";
  afterAll(() => rm(dir, { recursive: true, force: true }));

  it("rejects unsafe keys", () => {
    for (const bad of ["", "/abs.png", "../up.png", "a/../b.png", "a//b.png", "a\\b.png", "./a.png"]) expect(() => assertSafeKey(bad)).toThrow();
    expect(() => assertSafeKey("projects/abc/1.png")).not.toThrow();
  });

  it("local driver stores, reads and deletes", async () => {
    dir = await mkdtemp(path.join(os.tmpdir(), "hs-storage-"));
    const d = localDriver(dir);
    await d.put("leads/2026-09/a.png", Buffer.from("hello"), "image/png");
    expect((await d.get("leads/2026-09/a.png"))?.toString()).toBe("hello");
    await expect(d.put("leads/2026-09/a.png", Buffer.from("x"), "image/png")).rejects.toThrow(); // never overwrites
    await d.delete(["leads/2026-09/a.png"]);
    expect(await d.get("leads/2026-09/a.png")).toBeNull();
  });

  it("picks the driver from env and requires S3 credentials", () => {
    expect(driverFromEnv({}).name).toBe("local");
    expect(() => driverFromEnv({ STORAGE_DRIVER: "s3" })).toThrow(/STORAGE_BUCKET/);
    expect(driverFromEnv({ STORAGE_DRIVER: "s3", STORAGE_BUCKET: "b", STORAGE_ACCESS_KEY_ID: "k", STORAGE_SECRET_ACCESS_KEY: "s" }).name).toBe("s3");
  });
});
