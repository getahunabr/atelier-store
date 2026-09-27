import { neon, neonConfig } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";

import * as schema from "./schema";

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL is not set. Copy .env.example to .env.local and fill it in.");
}

const MAX_ATTEMPTS = 3;

/** Short description of a network error, including undici's nested cause (e.g. a connect timeout). */
function describeNetworkError(error: unknown) {
  const err = error as Error & { cause?: { code?: string; message?: string } };
  const cause = err.cause ? ` (${err.cause.code ?? ""} ${err.cause.message ?? ""})`.replace("( ", "(") : "";
  return `${err.message}${cause}`;
}

// Each query is an HTTPS request to Neon. A request that never gets a response — Neon waking from
// scale-to-zero, a dropped connection — surfaces only as Drizzle's generic "Failed query", so log
// the real cause and retry. Responses from Postgres, including SQL errors, are never retried.
// Every write must therefore be safe to repeat: checkout keys its order on a unique public id and
// guards status changes by the previous status; admin stock edits are absolute values applied only
// if the stock still holds the value the admin saw (never relative +/- adjustments).
neonConfig.fetchFunction = async (input: RequestInfo | URL, init?: RequestInit) => {
  for (let attempt = 1; ; attempt++) {
    try {
      return await fetch(input, init);
    } catch (error) {
      const reason = describeNetworkError(error);
      if (attempt >= MAX_ATTEMPTS || init?.signal?.aborted) {
        console.error(`[db] Neon request failed after ${attempt} attempts: ${reason}`);
        throw error;
      }
      console.warn(`[db] Neon request failed (attempt ${attempt}/${MAX_ATTEMPTS}), retrying: ${reason}`);
      await new Promise((resolve) => setTimeout(resolve, 300 * attempt));
    }
  }
};

const sql = neon(process.env.DATABASE_URL);

export const db = drizzle({ client: sql, schema });
