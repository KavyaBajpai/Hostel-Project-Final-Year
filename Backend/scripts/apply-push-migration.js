/**
 * Applies drizzle/0005_push_subscriptions.sql to the configured Neon database.
 * Run from Backend/: npm run db:migrate:push
 */
import { readFileSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";
import postgres from "postgres";
import { config } from "dotenv";

const __dirname = dirname(fileURLToPath(import.meta.url));
config({ path: join(__dirname, "..", ".env") });

const url = process.env.DATABASE_URL;
if (!url) {
  console.error("DATABASE_URL is not set in Backend/.env");
  process.exit(1);
}

const sqlPath = join(__dirname, "..", "drizzle", "0005_push_subscriptions.sql");
const migrationSql = readFileSync(sqlPath, "utf8");

const db = postgres(url, { max: 1 });

async function main() {
  console.log("Applying 0005_push_subscriptions.sql ...");
  await db.unsafe(migrationSql);
  await db.end();
  console.log("Done. push_subscriptions table is ready.");
}

main().catch((err) => {
  console.error("Migration failed:", err);
  process.exit(1);
});
