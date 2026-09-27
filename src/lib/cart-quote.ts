import "server-only";

import { findProductsBySlugs } from "@/db/queries/catalog";
import {
  CART_MAX_LINES,
  CART_MAX_QUANTITY,
  type CartLineInput,
  type CartQuote,
  type QuoteLine,
} from "@/lib/cart-types";

// Server-side cart pricing and stock validation. The browser only sends slugs, sizes and
// quantities; everything with a price or a limit on it is decided here from current database rows.
// Any other fields in the request (e.g. a "price") are ignored.

const SLUG = /^[a-z0-9-]{1,100}$/;

export class CartInputError extends Error {}

/** Validates untrusted input into clean lines, merging duplicates of the same product + size. */
export function parseCartLines(body: unknown): CartLineInput[] {
  const raw = (body as { lines?: unknown })?.lines;
  if (!Array.isArray(raw)) throw new CartInputError("Expected { lines: [...] }.");
  if (raw.length > CART_MAX_LINES) throw new CartInputError(`A bag can hold at most ${CART_MAX_LINES} lines.`);

  const merged = new Map<string, CartLineInput>();
  for (const item of raw) {
    const { slug, size, quantity } = (item ?? {}) as Record<string, unknown>;
    if (typeof slug !== "string" || !SLUG.test(slug)) throw new CartInputError("Invalid product.");
    if (typeof size !== "string" || size.length === 0 || size.length > 40) throw new CartInputError("Invalid size.");
    if (typeof quantity !== "number" || !Number.isInteger(quantity) || quantity < 1 || quantity > CART_MAX_QUANTITY) {
      throw new CartInputError(`Quantity must be a whole number from 1 to ${CART_MAX_QUANTITY}.`);
    }
    const key = `${slug}\u0000${size}`;
    const existing = merged.get(key);
    merged.set(key, { slug, size, quantity: Math.min((existing?.quantity ?? 0) + quantity, CART_MAX_QUANTITY) });
  }
  return [...merged.values()];
}

export async function quoteCart(lines: CartLineInput[]): Promise<CartQuote> {
  const products = new Map((await findProductsBySlugs([...new Set(lines.map((l) => l.slug))])).map((p) => [p.slug, p]));

  const quoted: QuoteLine[] = lines.map((line) => {
    const product = products.get(line.slug);
    const level = product?.stock.find((s) => s.size === line.size);
    const unitPriceCents = product ? Math.round(product.price * 100) : 0;
    const base = { slug: line.slug, size: line.size, requestedQuantity: line.quantity, unitPriceCents };

    if (!product || !level) {
      return { ...base, quantity: 0, available: 0, lineTotalCents: 0, status: "unavailable" };
    }
    const display = { name: product.name, href: `/products/${product.slug}`, image: product.images[0] };
    if (level.stock <= 0) {
      return { ...base, quantity: 0, available: 0, lineTotalCents: 0, status: "sold_out", product: display };
    }
    const quantity = Math.min(line.quantity, level.stock);
    return {
      ...base,
      quantity,
      available: level.stock,
      lineTotalCents: unitPriceCents * quantity,
      status: quantity < line.quantity ? "reduced" : "ok",
      product: display,
    };
  });

  return {
    lines: quoted,
    itemCount: quoted.reduce((sum, l) => sum + l.quantity, 0),
    subtotalCents: quoted.reduce((sum, l) => sum + l.lineTotalCents, 0),
    currency: "USD",
  };
}
