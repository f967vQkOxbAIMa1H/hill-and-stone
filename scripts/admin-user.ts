// Creates or updates an admin login.
// Usage: npx tsx scripts/admin-user.ts owner@hillandstone.com "Owner Name"   (prompts for a password)
//        ADMIN_PASSWORD=... npx tsx scripts/admin-user.ts email "Name"      (non-interactive)
import { config } from "dotenv";
config({ quiet: true });
import { createInterface } from "node:readline/promises";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";
import { hashPassword } from "../src/lib/auth/password";

const db = new PrismaClient({ adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL! }) });

async function main() {
  const [email, name] = process.argv.slice(2);
  if (!email) throw new Error('Usage: npx tsx scripts/admin-user.ts <email> ["Name"]');
  let password = process.env.ADMIN_PASSWORD;
  if (!password) {
    const rl = createInterface({ input: process.stdin, output: process.stdout });
    password = await rl.question("Password (12+ characters): ");
    rl.close();
  }
  if (password.length < 12) throw new Error("Use at least 12 characters.");
  const passwordHash = await hashPassword(password);
  const user = await db.user.upsert({
    where: { email: email.toLowerCase() },
    // Also the recovery path if an owner is locked out: clears a forced change and any revoked access.
    update: { passwordHash, mustChangePassword: false, deactivatedAt: null, ...(name ? { name } : {}) },
    create: { email: email.toLowerCase(), name: name ?? null, role: "OWNER", passwordHash },
  });
  // Changing a password signs out existing sessions.
  await db.session.deleteMany({ where: { userId: user.id } });
  console.log(`Admin login ready for ${user.email} (${user.role}).`);
}

main()
  .catch((e) => {
    console.error(e.message ?? e);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
