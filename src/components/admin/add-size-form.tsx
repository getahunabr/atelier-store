"use client";

import { useActionState, useId, useState } from "react";

import { addSizeAction, type AddSizeState } from "@/app/admin/products/actions";
import { Spinner } from "@/components/ui/spinner";

/** Adds a size (with its starting stock) to a product. The server validates and de-duplicates. */
export function AddSizeForm({ productSlug }: { productSlug: string }) {
  const [state, action, pending] = useActionState(addSizeAction.bind(null, productSlug), { status: "idle" } as AddSizeState);
  const [size, setSize] = useState("");
  const [quantity, setQuantity] = useState("0");
  const id = useId();

  const [seenState, setSeenState] = useState(state);
  // Clear the fields once a size is added (adjusted during render, not in an effect).
  if (state !== seenState) {
    setSeenState(state);
    if (state.status === "saved") {
      setSize("");
      setQuantity("0");
    }
  }

  const failed = state.status === "invalid" || state.status === "error" || state.status === "forbidden";

  return (
    <form action={action} className="mt-6 border-t border-line pt-6">
      <fieldset disabled={pending}>
        <legend className="eyebrow">Add a size</legend>
        <div className="mt-4 flex flex-wrap items-end gap-3">
          <div className="flex flex-col gap-2">
            <label htmlFor={`${id}-size`} className="text-caption text-ink-muted">
              Size
            </label>
            <input
              id={`${id}-size`}
              name="size"
              value={size}
              maxLength={40}
              placeholder="e.g. XL or 43"
              onChange={(e) => setSize(e.target.value)}
              aria-invalid={failed}
              aria-describedby={failed ? `${id}-message` : undefined}
              className="field min-h-10 w-40"
            />
          </div>
          <div className="flex flex-col gap-2">
            <label htmlFor={`${id}-qty`} className="text-caption text-ink-muted">
              Available units
            </label>
            <input id={`${id}-qty`} name="quantity" inputMode="numeric" value={quantity} onChange={(e) => setQuantity(e.target.value)} className="field min-h-10 w-24" />
          </div>
          <button type="submit" aria-busy={pending} className={`btn btn-secondary btn-sm ${pending ? "disabled:opacity-100" : ""}`}>
            {pending && <Spinner />}
            {pending ? "Adding…" : "Add size"}
          </button>
        </div>
      </fieldset>
      <p id={`${id}-message`} aria-live="polite" className="mt-2 text-caption empty:hidden">
        {state.status === "saved" && <span className="text-success">Size added.</span>}
        {failed && <span className="text-critical">{state.status === "forbidden" ? "You don't have permission to do that." : state.message}</span>}
      </p>
    </form>
  );
}
