import "server-only";

import { assertAdmin, ForbiddenError } from "@/lib/session";

// The admin role check for server actions. Server actions are public endpoints — anyone holding an
// action id can POST to it, whatever the UI shows — so every export of an admin "use server" file
// must start with `return withAdmin(...)`. `npm run check:admin` fails the build otherwise.
//
// Pages use requireAdmin() (src/lib/session.ts); admin queries call assertAdmin() themselves.

export type Forbidden = { status: "forbidden" };

export type AdminSession = Awaited<ReturnType<typeof assertAdmin>>;

/**
 * Runs `handler` only for a signed-in admin (role read fresh from the database, so a revoked admin
 * is refused on their next request). Everyone else gets `{ status: "forbidden" }` and nothing runs.
 */
export async function withAdmin<Result>(handler: (admin: AdminSession) => Promise<Result>): Promise<Result | Forbidden> {
  let admin: AdminSession;
  try {
    admin = await assertAdmin();
  } catch (error) {
    if (error instanceof ForbiddenError) return { status: "forbidden" };
    throw error;
  }
  return handler(admin);
}
