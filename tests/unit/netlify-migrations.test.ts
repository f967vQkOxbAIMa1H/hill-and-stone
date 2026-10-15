import { existsSync, readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

// Netlify Database applies netlify/database/migrations on deploy; Prisma writes prisma/migrations.
const prismaDir = "prisma/migrations";
const netlifyDir = "netlify/database/migrations";
const migrations = (dir: string) => readdirSync(dir).filter((n) => existsSync(path.join(dir, n, "migration.sql"))).sort();

describe("Netlify migration mirror", () => {
  it("has every Prisma migration, byte for byte (run npm run db:sync-netlify)", () => {
    const names = migrations(prismaDir);
    expect(migrations(netlifyDir)).toEqual(names);
    for (const n of names) {
      expect(readFileSync(path.join(netlifyDir, n, "migration.sql"), "utf8")).toBe(readFileSync(path.join(prismaDir, n, "migration.sql"), "utf8"));
    }
  });
  it("uses names Netlify accepts: <digits>_<lowercase slug>", () => {
    for (const n of migrations(netlifyDir)) expect(n).toMatch(/^\d+_[a-z0-9_-]+$/);
  });
});
