"use client";

import { useActionState } from "react";

import { refreshStorefront, type RefreshState } from "@/app/admin/actions";

const timeFormat = new Intl.DateTimeFormat("en-US", { hour: "numeric", minute: "2-digit", second: "2-digit" });

export function RefreshStorefrontForm() {
  const [state, action, pending] = useActionState<RefreshState, FormData>(refreshStorefront, { status: "idle" });

  return (
    <form action={action} className="flex flex-wrap items-center gap-x-6 gap-y-3">
      <button type="submit" disabled={pending} className="btn btn-secondary btn-sm">
        {pending ? "Refreshing…" : "Refresh storefront"}
      </button>
      <p aria-live="polite" className="text-body-sm text-ink-muted">
        {state.status === "done" && state.at && `Refreshed at ${timeFormat.format(new Date(state.at))}.`}
        {state.status === "forbidden" && <span className="text-critical">You don&apos;t have permission to do that.</span>}
      </p>
    </form>
  );
}
