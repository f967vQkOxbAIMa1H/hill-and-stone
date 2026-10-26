// Creates the owner login with a generated one-time password.
// Usage: ADMIN_EMAIL=owner@example.com npm run admin:create            (optional ADMIN_NAME="Display name")
//        ADMIN_EMAIL=owner@example.com npm run admin:create -- --reset (new password for an existing login)
//
// The password is printed once to this terminal and never written anywhere: only its hash is stored.
// The owner must choose their own password at first sign-in.
import { config } from "dotenv";
config({ quiet: true });
import { randomBytes } from "node:crypto";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";
import { hashPassword } from "../src/lib/auth/password";

const db = new PrismaClient({ adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL! }) });

async function main() {
  const email = process.env.ADMIN_EMAIL?.trim().toLowerCase();
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new Error("Set ADMIN_EMAIL to the owner's email address.");
  if (!process.env.DATABASE_URL) throw new Error("Set DATABASE_URL to the database to create the login in.");
  const reset = process.argv.includes("--reset");

  const existing = await db.user.findUnique({ where: { email } });
  if (existing && !reset) throw new Error(`${email} already has a login. Run again with --reset to issue a new one-time password.`);

  // 18 random bytes = 144 bits, as 24 URL-safe characters.
  const password = randomBytes(18).toString("base64url");
  const passwordHash = await hashPassword(password);
  const user = await db.user.upsert({
    where: { email },
    update: { passwordHash, role: "OWNER", mustChangePassword: true, deactivatedAt: null },
    create: { email, name: process.env.ADMIN_NAME?.trim() || null, role: "OWNER", passwordHash, mustChangePassword: true },
  });
  // A new password signs out any existing sessions.
  await db.session.deleteMany({ where: { userId: user.id } });

  const host = new URL(process.env.DATABASE_URL).hostname;
  console.log(`\nOwner login ${existing ? "reset" : "created"} for ${user.email} (database host: ${host}).`);
  console.log("\n  One-time password (shown only now, not saved anywhere):\n");
  console.log(`  ${password}\n`);
  console.log("Sign in at /admin/login. You'll be asked to choose your own password straight away.\n");
}

main()
  .catch((e) => {
    console.error(e.message ?? e);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
