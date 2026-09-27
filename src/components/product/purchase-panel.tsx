"use client";

import Link from "next/link";
import { useState } from "react";

import { addToCart } from "@/lib/cart";
import { ONE_SIZE, type Category, type StockLevel } from "@/lib/catalog-types";
import { stockState } from "@/lib/stock";

import { StockStatus } from "./stock-status";

type Props = {
  slug: string;
  stock: StockLevel[];
  /** Where to send customers when every size is sold out. */
  category: Pick<Category, "name" | "href">;
};

export function PurchasePanel({ slug, stock, category }: Props) {
  // The page's stock can be up to 5 minutes old. When adding to the bag tells us the live figure for
  // a size (sold out, or fewer than shown), it's corrected here so the picker stops offering it.
  const [levels, setLevels] = useState(stock);
  const [seenStock, setSeenStock] = useState(stock);
  if (stock !== seenStock) {
    // A fresh server render is newer than any local correction.
    setSeenStock(stock);
    setLevels(stock);
  }

  const oneSize = levels.length === 1 && levels[0].size === ONE_SIZE;
  const [selectedSize, setSelectedSize] = useState<string | null>(oneSize ? levels[0].size : null);
  const [notice, setNotice] = useState<{ ok: boolean; text: string; link?: boolean } | null>(null);
  const [adding, setAdding] = useState(false);

  const selected = levels.find((level) => level.size === selectedSize) ?? null;
  const total = levels.reduce((sum, level) => sum + level.stock, 0);
  const soldOut = total === 0;
  const canAdd = selected !== null && selected.stock > 0;
  const anyLow = !oneSize && levels.some((level) => stockState(level.stock) === "low_stock");

  const correct = (size: string, units: number) =>
    setLevels((current) => current.map((level) => (level.size === size ? { ...level, stock: units } : level)));

  // The server checks live stock before anything is saved to the bag (see addToCart).
  const add = async () => {
    if (!selected || adding) return;
    setAdding(true);
    setNotice(null);
    try {
      const result = await addToCart(slug, selected.size);
      if (result.outcome === "added") {
        setNotice({ ok: true, text: "Added to your bag.", link: true });
      } else if (result.outcome === "at-limit") {
        correct(selected.size, result.available);
        setNotice({ ok: false, text: `Your bag already holds all ${result.available} available.`, link: true });
      } else {
        correct(selected.size, 0);
        if (!oneSize) setSelectedSize(null);
        setNotice({ ok: false, text: oneSize ? "Sorry — this piece has just sold out." : `Sorry — size ${selected.size} has just sold out.` });
      }
    } catch {
      setNotice({ ok: false, text: "We couldn't add this to your bag. Check your connection and try again." });
    } finally {
      setAdding(false);
    }
  };

  return (
    <div className="flex flex-col gap-6">
      {!oneSize && (
        <fieldset>
          <legend className="eyebrow">Size</legend>
          <div className="mt-3 grid grid-cols-5 gap-2 sm:grid-cols-6 lg:grid-cols-5 xl:grid-cols-6">
            {levels.map((level) => {
              const state = stockState(level.stock);
              const unavailable = state === "out_of_stock";
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
                    checked={selectedSize === level.size}
                    onChange={() => {
                      setSelectedSize(level.size);
                      setNotice(null);
                    }}
                    className="sr-only"
                  />
                  {level.size}
                  {unavailable && <span className="sr-only">, sold out</span>}
                  {state === "low_stock" && (
                    <>
                      <span aria-hidden="true" className="absolute top-1.5 right-1.5 size-1.5 rounded-full bg-critical" />
                      <span className="sr-only">, only {level.stock} left</span>
                    </>
                  )}
                </label>
              );
            })}
          </div>
          {anyLow && (
            <p aria-hidden="true" className="mt-3 flex items-center gap-2 text-caption text-ink-muted">
              <span className="size-1.5 rounded-full bg-critical" />
              Only a few left in this size
            </p>
          )}
        </fieldset>
      )}

      <div aria-live="polite">
        {selected && !oneSize ? (
          <StockStatus units={selected.stock} prefix={`Size ${selected.size}: `} />
        ) : (
          <StockStatus units={total} />
        )}
      </div>

      <button type="button" disabled={!canAdd || adding} onClick={add} className="btn btn-primary w-full">
        {soldOut ? "Sold out" : adding ? "Adding…" : canAdd ? "Add to bag" : "Select a size"}
      </button>

      {soldOut && (
        <p className="text-body-sm text-ink-muted">
          {oneSize ? "This piece is sold out." : "Every size is sold out."}{" "}
          <Link href={category.href} className="link text-ink">
            Explore more {category.name.toLowerCase()}
          </Link>
          .
        </p>
      )}

      <div aria-live="polite">
        {notice && (
          <p className={`flex flex-wrap items-center gap-x-4 gap-y-2 text-body-sm ${notice.ok ? "" : "text-ink-muted"}`}>
            {notice.text}
            {notice.link && (
              <Link href="/bag" className="eyebrow link-reveal">
                View bag
              </Link>
            )}
          </p>
        )}
      </div>
    </div>
  );
}
