"use server";

import { revalidatePath } from "next/cache";

import { withAdmin } from "@/lib/admin-guard";

export type RefreshState = { status: "idle" | "done" | "forbidden"; at?: string };

/**
 * Clears the cached storefront pages (home and product pages revalidate every 5 minutes) so catalog
 * edits made in the database show immediately.
 */
export async function refreshStorefront(): Promise<RefreshState> {
  return withAdmin(async () => {
    revalidatePath("/", "layout");
    return { status: "done" as const, at: new Date().toISOString() };
  });
}
