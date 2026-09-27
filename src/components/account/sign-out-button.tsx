"use client";

import { useState } from "react";

import { authClient } from "@/lib/auth-client";

export function SignOutButton() {
  const [pending, setPending] = useState(false);

  async function signOut() {
    setPending(true);
    await authClient.signOut();
    // Full page load (deliberately not router.push) so no signed-in pages survive in the client router cache.
    // eslint-disable-next-line @next/next/no-location-assign-relative-destination
    window.location.assign("/");
  }

  return (
    <button type="button" onClick={signOut} disabled={pending} className="btn btn-secondary btn-sm">
      {pending ? "Signing out…" : "Sign out"}
    </button>
  );
}
