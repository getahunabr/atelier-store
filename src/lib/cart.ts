"use client";

import { useSyncExternalStore } from "react";

import type { CartLineInput, CartQuote } from "./cart-types";

// Shopping bag kept in the browser (localStorage), shared by every component through
// useSyncExternalStore and synced across tabs via the `storage` event. It stores only what the
// customer chose (slug, size, quantity). Prices, stock limits and totals always come from the
// server via requestQuote (POST /api/cart/quote) — nothing here is trusted for pricing.

export type CartLine = CartLineInput;

const STORAGE_KEY = "atelier.bag.v1";
const EMPTY: CartLine[] = [];

let lines: CartLine[] | null = null;
const listeners = new Set<() => void>();

function isCartLine(value: unknown): value is CartLine {
  const line = value as CartLine;
  return (
    typeof line?.slug === "string" &&
    typeof line.size === "string" &&
    Number.isInteger(line.quantity) &&
    line.quantity > 0
  );
}

function read(): CartLine[] {
  if (lines) return lines;
  try {
    const parsed: unknown = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "[]");
    // Keep only intent fields; anything else in storage (e.g. a tampered "price") is dropped.
    lines = Array.isArray(parsed) ? parsed.filter(isCartLine).map(({ slug, size, quantity }) => ({ slug, size, quantity })) : [];
  } catch {
    lines = [];
  }
  return lines;
}

function write(next: CartLine[]) {
  lines = next;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  } catch {
    // Storage unavailable (private mode, quota): the bag still works for this page view.
  }
  listeners.forEach((listener) => listener());
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  const onStorage = (event: StorageEvent) => {
    if (event.key !== STORAGE_KEY) return;
    lines = null;
    listener();
  };
  window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(listener);
    window.removeEventListener("storage", onStorage);
  };
}

const same = (line: CartLine, slug: string, size: string) => line.slug === slug && line.size === size;
const lineKey = (slug: string, size: string) => `${slug}\u0000${size}`;

// Lines the bag lowered to match stock, by line key → quantity, so the bag can keep explaining the
// change after it's saved. Cleared when the customer changes or removes that line.
let adjustments: Record<string, number> = {};
const NO_ADJUSTMENTS: Record<string, number> = {};

function setAdjustment(slug: string, size: string, quantity: number | null) {
  const key = lineKey(slug, size);
  if (quantity === null && !(key in adjustments)) return;
  const next = { ...adjustments };
  if (quantity === null) delete next[key];
  else next[key] = quantity;
  adjustments = next;
}

function writeQuantity(slug: string, size: string, quantity: number) {
  const current = read();
  write(
    current.some((line) => same(line, slug, size))
      ? current.map((line) => (same(line, slug, size) ? { ...line, quantity } : line))
      : [...current, { slug, size, quantity }],
  );
}

/** Prices, stock-limited quantities and totals for these lines, computed by the server. */
export async function requestQuote(lines: CartLineInput[], signal?: AbortSignal): Promise<CartQuote> {
  const res = await fetch("/api/cart/quote", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ lines: lines.map(({ slug, size, quantity }) => ({ slug, size, quantity })) }),
    signal,
  });
  if (!res.ok) throw new Error(`Quote failed: HTTP ${res.status}`);
  return res.json();
}

export type AddResult =
  | { outcome: "added"; quantity: number }
  | { outcome: "at-limit"; available: number }
  | { outcome: "sold-out" };

/**
 * Adds one unit of a size after checking current stock on the server, so the bag never holds more
 * than is available. Saves the quantity the server allows.
 */
export async function addToCart(slug: string, size: string): Promise<AddResult> {
  const existing = read().find((line) => same(line, slug, size))?.quantity ?? 0;
  const quote = await requestQuote([{ slug, size, quantity: existing + 1 }]);
  const line = quote.lines[0];
  if (!line || line.quantity === 0) return { outcome: "sold-out" };
  setCartQuantity(slug, size, line.quantity);
  return line.quantity > existing ? { outcome: "added", quantity: line.quantity } : { outcome: "at-limit", available: line.available };
}

/** Customer sets a line's quantity (adding the line if needed); 0 removes it. */
export function setCartQuantity(slug: string, size: string, quantity: number) {
  if (quantity <= 0) return removeFromCart(slug, size);
  setAdjustment(slug, size, null);
  writeQuantity(slug, size, quantity);
}

/** The bag lowers a line to the stock the server allows, and remembers it did so. */
export function reduceToStock(slug: string, size: string, quantity: number) {
  setAdjustment(slug, size, quantity);
  writeQuantity(slug, size, quantity);
}

export function removeFromCart(slug: string, size: string) {
  setAdjustment(slug, size, null);
  write(read().filter((line) => !same(line, slug, size)));
}

/** After a confirmed payment: drops the purchased lines (safe to repeat, e.g. on reload). */
export function removePurchased(items: { slug: string; size: string }[]) {
  const bought = new Set(items.map((item) => lineKey(item.slug, item.size)));
  const current = read();
  if (!current.some((line) => bought.has(lineKey(line.slug, line.size)))) return;
  for (const key of bought) setAdjustment(...(key.split("\u0000") as [string, string]), null);
  write(current.filter((line) => !bought.has(lineKey(line.slug, line.size))));
}

export type CheckoutResult =
  | { outcome: "redirect"; url: string }
  | { outcome: "sign-in"; url: string }
  | { outcome: "changed"; quote: CartQuote }
  /** `detail` is the server's real reason — only sent outside production. */
  | { outcome: "unavailable"; detail?: string };

/**
 * Asks the server to start checkout for these lines. The server re-prices and reserves stock
 * itself; on success the caller sends the browser to the returned Stripe URL.
 */
export async function beginCheckout(lines: CartLineInput[]): Promise<CheckoutResult> {
  const res = await fetch("/api/checkout", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ lines: lines.map(({ slug, size, quantity }) => ({ slug, size, quantity })) }),
  });
  const body = await res.json().catch(() => null);
  if (res.status === 401) return { outcome: "sign-in", url: body?.signIn ?? "/account/sign-in?next=%2Fbag" };
  if (res.status === 409 && body?.quote) return { outcome: "changed", quote: body.quote };
  if (res.ok && typeof body?.url === "string") return { outcome: "redirect", url: body.url };
  const detail = typeof body?.detail === "string" ? body.detail : undefined;
  // Surface the real cause for developers; customers only ever see the generic message.
  console.error(`[checkout] HTTP ${res.status}${body?.code ? ` (${body.code})` : ""}${detail ? `: ${detail}` : ""}`);
  return { outcome: "unavailable", detail };
}

/** Quantities the bag reduced to match stock (key: slug + "\u0000" + size). */
export function useCartAdjustments() {
  return useSyncExternalStore(subscribe, () => adjustments, () => NO_ADJUSTMENTS);
}

/** Lines in the bag. Empty during server rendering and hydration, then the stored bag. */
export function useCart() {
  return useSyncExternalStore(subscribe, read, () => EMPTY);
}

export function useCartCount() {
  return useCart().reduce((sum, line) => sum + line.quantity, 0);
}
