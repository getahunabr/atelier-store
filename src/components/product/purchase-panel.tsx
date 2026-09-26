"use client";

import { useState } from "react";

import { ONE_SIZE, type StockLevel } from "@/lib/catalog-types";

import { StockStatus } from "./stock-status";

export function PurchasePanel({ stock }: { stock: StockLevel[] }) {
  const oneSize = stock.length === 1 && stock[0].size === ONE_SIZE;
  const [selected, setSelected] = useState<StockLevel | null>(oneSize ? stock[0] : null);

  const total = stock.reduce((sum, level) => sum + level.stock, 0);
  const soldOut = total === 0;
  const canAdd = selected !== null && selected.stock > 0;

  return (
    <div className="flex flex-col gap-6">
      {!oneSize && (
        <fieldset>
          <legend className="eyebrow">Size</legend>
          <div className="mt-3 grid grid-cols-5 gap-2 sm:grid-cols-6 lg:grid-cols-5 xl:grid-cols-6">
            {stock.map((level) => {
              const unavailable = level.stock === 0;
              return (
                <label
                  key={level.size}
                  className={`relative flex min-h-12 items-center justify-center border text-body-sm transition-colors has-checked:border-ink has-checked:bg-ink has-checked:text-canvas has-focus-visible:outline-1 has-focus-visible:outline-offset-2 has-focus-visible:outline-ink ${
                    unavailable
                      ? "cursor-not-allowed border-line text-ink-subtle line-through"
                      : "cursor-pointer border-line hover:border-ink"
                  }`}
                >
                  <input
                    type="radio"
                    name="size"
                    value={level.size}
                    disabled={unavailable}
                    checked={selected?.size === level.size}
                    onChange={() => setSelected(level)}
                    className="sr-only"
                  />
                  {level.size}
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
