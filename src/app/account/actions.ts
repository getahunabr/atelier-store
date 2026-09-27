"use server";

import { headers } from "next/headers";

import { auth } from "@/lib/auth";
import { getSession } from "@/lib/session";

export type ProfileState =
  | { status: "idle" }
  | { status: "saved"; name: string }
  | { status: "invalid"; fieldError: string }
  | { status: "error"; message: string; signIn?: boolean };

const NAME_MAX = 100;

/**
 * Updates the signed-in customer's display name. Server actions can be called directly, so this
 * checks the session and validates the input itself rather than trusting the form.
 */
export async function updateProfile(_previous: ProfileState, formData: FormData): Promise<ProfileState> {
  if (!(await getSession())) {
    return { status: "error", message: "Your session has ended.", signIn: true };
  }

  const name = String(formData.get("name") ?? "").trim();
  if (!name) return { status: "invalid", fieldError: "Enter your name." };
  if (name.length > NAME_MAX) return { status: "invalid", fieldError: `Use ${NAME_MAX} characters or fewer.` };

  try {
    // Better Auth updates the user row and refreshes the session cookie (via nextCookies).
    await auth.api.updateUser({ headers: await headers(), body: { name } });
  } catch {
    return { status: "error", message: "We couldn't save your details. Please try again." };
  }

  // The client refreshes after this so the account shell re-renders with the updated session cookie
  // (a re-render inside this request would still see the old 5-minute session cache).
  return { status: "saved", name };
}
