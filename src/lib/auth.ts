import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { nextCookies } from "better-auth/next-js";

import { db } from "@/db";

export const auth = betterAuth({
  database: drizzleAdapter(db, { provider: "pg" }),
  // Enable sign-in methods (emailAndPassword, socialProviders, ...) here when building auth flows.
  plugins: [nextCookies()], // must stay last
});
