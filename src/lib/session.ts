import "server-only";

import { headers } from "next/headers";
import { notFound, redirect } from "next/navigation";
import { cache } from "react";

import { auth } from "@/lib/auth";
import { signInPath } from "@/lib/safe-redirect";

// Server-side session handling. The authoritative checks live here and run in layouts, pages,
// server actions and route handlers. src/proxy.ts only does an optimistic cookie-presence redirect.

const ADMIN_ROLE = "admin";

/** The signed-in customer's session, or null. May use the 5-minute cookie cache. Deduped per request. */
export const getSession = cache(async () => auth.api.getSession({ headers: await headers() }));

/** Session read straight from the database (no cookie cache) — use for authorization decisions. */
const getFreshSession = cache(async () =>
  auth.api.getSession({ headers: await headers(), query: { disableCookieCache: true } }),
);

export function isAdmin(user: { role?: string | null } | null | undefined) {
  return (user?.role ?? "").split(",").map((role) => role.trim()).includes(ADMIN_ROLE);
}

/** The path proxy.ts recorded for this request, so a sign-in redirect can return to it. */
async function currentPath() {
  return (await headers()).get("x-pathname") ?? undefined;
}

/**
 * For customer pages and layouts: the session, or a redirect to sign-in that returns here.
 * `fresh` reads the database instead of the 5-minute cookie cache — use it where role or profile
 * changes must show immediately (e.g. the account shell's menu).
 */
export async function requireSession({ fresh = false }: { fresh?: boolean } = {}) {
  const session = fresh ? await getFreshSession() : await getSession();
  if (!session) redirect(signInPath(await currentPath()));
  return session;
}

/**
 * For admin pages and layouts. Signed out → sign-in. Signed in without the admin role → 404, so the
 * admin area's existence isn't revealed. Always checked against the database.
 */
export async function requireAdmin() {
  const session = await getFreshSession();
  if (!session) redirect(signInPath(await currentPath()));
  if (!isAdmin(session.user)) notFound();
  return session;
}

export class ForbiddenError extends Error {
  constructor() {
    super("Forbidden");
    this.name = "ForbiddenError";
  }
}

/**
 * For admin server actions and route handlers, which layouts and proxy.ts do NOT protect: call this
 * first in every one. Throws instead of redirecting so a direct POST gets no side effects.
 */
export async function assertAdmin() {
  const session = await getFreshSession();
  if (!session || !isAdmin(session.user)) throw new ForbiddenError();
  return session;
}
