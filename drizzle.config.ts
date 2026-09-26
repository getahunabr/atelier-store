import { config } from "dotenv";
import { defineConfig } from "drizzle-kit";

config({ path: [".env.local", ".env"], quiet: true });

export default defineConfig({
  schema: "./src/db/schema",
  out: "./drizzle",
  dialect: "postgresql",
  dbCredentials: {
    // Migrations should use Neon's direct (unpooled) connection; fall back to the app URL.
    url: (process.env.DATABASE_URL_UNPOOLED || process.env.DATABASE_URL)!,
  },
});
