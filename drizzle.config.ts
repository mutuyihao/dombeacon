import { defineConfig } from "drizzle-kit";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

/**
 * Lightweight .env loader so `npx drizzle-kit push` honors DATABASE_PATH
 * the same way the runtime does, without pulling in a `dotenv` dependency.
 *
 * Skips lines without `=`, ignores comments, and never overwrites variables
 * that are already set in the environment.
 */
const loadDotEnv = () => {
  const path = resolve(process.cwd(), ".env");
  if (!existsSync(path)) return;
  const text = readFileSync(path, "utf8");
  for (const rawLine of text.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) continue;
    const eq = line.indexOf("=");
    if (eq === -1) continue;
    const key = line.slice(0, eq).trim();
    if (!key || process.env[key] !== undefined) continue;
    let value = line.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    process.env[key] = value;
  }
};

loadDotEnv();

const dbPath = (process.env.DATABASE_PATH || "./data/app.db").trim();

export default defineConfig({
  schema: "./server/db/schema.ts",
  out: "./server/db/migrations",
  dialect: "sqlite",
  dbCredentials: {
    url: `file:${dbPath}`,
  },
});
