"use client";

import { useActionState, useId, useState } from "react";

import { updateStockAction, type StockFormState } from "@/app/admin/products/actions";
import { Spinner } from "@/components/ui/spinner";

const timeFormat = new Intl.DateTimeFormat("en-US", { hour: "numeric", minute: "2-digit" });

type Props = {
  productSlug: string;
  /** For accessible names, e.g. "Woven Leather Tote". */
  productName: string;
  stockId: number;
  size: string;
  /** Available units as rendered by the server. */
  quantity: number;
};

/**
 * Edits one size's available units. The hidden `expected` is always the last value the server
 * reported (initial render, a save, a conflict, or a later re-render), so the server can refuse the
 * write if a checkout changed stock in between. On a conflict the typed value is kept and the admin
 * can switch to the current value or save theirs deliberately.
 */
export function StockRowForm({ productSlug, productName, stockId, size, quantity }: Props) {
  const [state, action, pending] = useActionState(updateStockAction.bind(null, productSlug), { status: "idle" } as StockFormState);
  const [known, setKnown] = useState(quantity);
  const [draft, setDraft] = useState(String(quantity));
  const [seenQuantity, setSeenQuantity] = useState(quantity);
  const [seenState, setSeenState] = useState(state);
  const id = useId();

  // Adjust during render (no effects): a new server render (revalidation) or action result is the
  // newest known value. An untouched input follows it; a value the admin is typing is kept.
  if (quantity !== seenQuantity) {
    setSeenQuantity(quantity);
    setKnown(quantity);
    if (draft.trim() === String(known)) setDraft(String(quantity));
  }
  if (state !== seenState) {
    setSeenState(state);
    if (state.quantity !== undefined && (state.status === "saved" || state.status === "conflict")) {
      setKnown(state.quantity);
      if (state.status === "saved") setDraft(String(state.quantity));
    }
  }

  const dirty = draft.trim() !== String(known);
  const invalid = state.status === "invalid";
  const label = `Units available for ${productName}, size ${size}`;
  const messageId = `${id}-message`;

  return (
    <form action={action} className="flex flex-col gap-2">
      <input type="hidden" name="stockId" value={stockId} />
      <input type="hidden" name="expected" value={known} />
      <div className="flex items-center gap-3">
        <label htmlFor={`${id}-qty`} className="sr-only">
          {label}
        </label>
        <input
          id={`${id}-qty`}
          name="quantity"
          inputMode="numeric"
          autoComplete="off"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          aria-invalid={invalid}
          aria-describedby={state.status !== "idle" ? messageId : undefined}
          disabled={pending}
          className="field min-h-10 w-24 disabled:bg-surface"
        />
        <button
          type="submit"
          disabled={pending || !dirty}
          aria-busy={pending}
          aria-label={`Save stock for ${productName}, size ${size}`}
          className={`btn btn-secondary btn-sm ${pending ? "disabled:opacity-100" : ""}`}
        >
          {pending && <Spinner />}
          {pending ? "Saving…" : "Save"}
        </button>
      </div>
      <p id={messageId} aria-live="polite" className="text-caption empty:hidden">
        {state.status === "saved" && state.at && !dirty && <span className="text-success">Saved at {timeFormat.format(new Date(state.at))}</span>}
        {state.status === "invalid" && <span className="text-critical">{state.message}</span>}
        {state.status === "error" && <span className="text-critical">{state.message}</span>}
        {state.status === "forbidden" && <span className="text-critical">You don&apos;t have permission to do that.</span>}
        {state.status === "conflict" && (
          <span className="text-critical">
            {state.message}{" "}
            <button type="button" onClick={() => setDraft(String(known))} className="link text-ink">
              Use {known}
            </button>{" "}
            or save {draft || "your value"} again.
          </span>
        )}
      </p>
    </form>
  );
}
