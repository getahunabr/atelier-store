// Cart types shared by the browser and the server. Must never import the database.

import type { Img } from "./catalog-types";

/** What the browser keeps: the customer's intent only — never prices. */
export type CartLineInput = { slug: string; size: string; quantity: number };

/**
 * - ok: quantity is available as requested
 * - reduced: fewer are in stock than requested; `quantity` was lowered to what's available
 * - sold_out: the size exists but has no stock
 * - unavailable: the product or size no longer exists
 */
export type QuoteLineStatus = "ok" | "reduced" | "sold_out" | "unavailable";

export type QuoteLine = {
  slug: string;
  size: string;
  requestedQuantity: number;
  /** Quantity that can actually be bought (0 when sold out or unavailable). */
  quantity: number;
  /** Units in stock for this size right now. */
  available: number;
  unitPriceCents: number;
  lineTotalCents: number;
  status: QuoteLineStatus;
  /** Display data from the catalog; absent when the product no longer exists. */
  product?: { name: string; href: string; image: Img };
};

/** Prices, stock and totals computed on the server from the database. */
export type CartQuote = {
  lines: QuoteLine[];
  itemCount: number;
  subtotalCents: number;
  currency: "USD";
};

export const CART_MAX_LINES = 50;
/** Sanity cap per line; real limits come from stock. */
export const CART_MAX_QUANTITY = 99;
