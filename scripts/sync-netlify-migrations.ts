// Copies Prisma's migrations into netlify/database/migrations, where Netlify Database applies them on
// every deploy (preview branches first, production just before publish). Prisma stays the source of
// truth: create migrations with `npm run db:migrate`, which runs this afterwards.
// Never edit or delete a mirrored migration once it has been deployed; add a new one instead.
import { cpSync, existsSync, mkdirSync, readdirSync } from "node:fs";
import path from "node:path";

const from = "prisma/migrations";
const to = "netlify/database/migrations";
mkdirSync(to, { recursive: true });
let copied = 0;
for (const name of readdirSync(from).sort()) {
  const sql = path.join(from, name, "migration.sql");
  if (!existsSync(sql)) continue; // migration_lock.toml and stray files
  mkdirSync(path.join(to, name), { recursive: true });
  cpSync(sql, path.join(to, name, "migration.sql"));
  copied++;
}
console.log(`Mirrored ${copied} migrations into ${to}.`);
