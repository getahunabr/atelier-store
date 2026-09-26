"use client";

import { useState } from "react";

import { ONE_SIZE, type Variant } from "@/data/products";

import { StockStatus } from "./stock-status";

export function PurchasePanel({ variants }: { variants: Variant[] }) {
  const oneSize = variants.length === 1 && variants[0].size === ONE_SIZE;
  const [selected, setSelected] = useState<Variant | null>(oneSize ? variants[0] : null);

  const total = variants.reduce((sum, variant) => sum + variant.stock, 0);
  const soldOut = total === 0;
  const canAdd = selected !== null && selected.stock > 0;

  return (
    <div className="flex flex-col gap-6">
      {!oneSize && (
        <fieldset>
          <legend className="eyebrow">Size</legend>
          <div className="mt-3 grid grid-cols-5 gap-2 sm:grid-cols-6 lg:grid-cols-5 xl:grid-cols-6">
            {variants.map((variant) => {
              const unavailable = variant.stock === 0;
              return (
                <label
                  key={variant.size}
                  className={`relative flex min-h-12 items-center justify-center border text-body-sm transition-colors has-checked:border-ink has-checked:bg-ink has-checked:text-canvas has-focus-visible:outline-1 has-focus-visible:outline-offset-2 has-focus-visible:outline-ink ${
                    unavailable
                      ? "cursor-not-allowed border-line text-ink-subtle line-through"
                      : "cursor-pointer border-line hover:border-ink"
                  }`}
                >
                  <input
                    type="radio"
                    name="size"
                    value={variant.size}
                    disabled={unavailable}
                    checked={selected?.size === variant.size}
                    onChange={() => setSelected(variant)}
                    className="sr-only"
                  />
                  {variant.size}
                  {unavailable && <span className="sr-only">, sold out</span>}
                </label>
              );
            })}
          </div>
        </fieldset>
      )}

      <div aria-live="polite">
        {selected && !oneSize ? (
          <StockStatus units={selected.stock} prefix={`Size ${selected.size}: `} />
        ) : (
          <StockStatus units={total} />
        )}
      </div>

      {/* Cart is not built yet; the button reflects availability only. */}
      <button type="button" disabled={!canAdd} className="btn btn-primary w-full">
        {soldOut ? "Sold out" : canAdd ? "Add to bag" : "Select a size"}
      </button>
    </div>
  );
}
