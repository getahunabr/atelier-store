import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { nextCookies } from "better-auth/next-js";
import { admin } from "better-auth/plugins/admin";

import { db } from "@/db";

// Fail fast in a running production server without a real secret (sessions would be signed with
// Better Auth's default). Skipped during `next build`, which also runs with NODE_ENV=production.
if (
  process.env.NODE_ENV === "production" &&
  process.env.NEXT_PHASE !== "phase-production-build" &&
  !process.env.BETTER_AUTH_SECRET
) {
  throw new Error("BETTER_AUTH_SECRET is not set. Generate one with `npx auth secret` and add it to the environment.");
}

const DAY = 60 * 60 * 24;

export const auth = betterAuth({
  database: drizzleAdapter(db, { provider: "pg" }),
  emailAndPassword: {
    enabled: true,
    // No email provider is configured yet, so accounts can't be verified by email.
    requireEmailVerification: false,
    minPasswordLength: 8,
  },
  session: {
    // Persistent, sliding sessions: 30 days, renewed at most once a day while in use.
    expiresIn: 30 * DAY,
    updateAge: DAY,
    // Signed session snapshot in a cookie saves a database read per request. Role checks bypass
    // it (see requireAdmin in src/lib/session.ts) so revoking admin takes effect immediately.
    cookieCache: { enabled: true, maxAge: 5 * 60 },
  },
  plugins: [
    // Adds user.role ("user" by default, "admin" for admins). The role can't be set at sign-up.
    admin({ defaultRole: "user", adminRoles: ["admin"] }),
    nextCookies(), // must stay last
  ],
});

export type Session = typeof auth.$Infer.Session;
