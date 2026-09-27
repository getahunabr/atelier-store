// Server-side validation of admin product forms. Pure functions: FormData in, a typed value or
// per-field error messages out. Nothing from the browser is trusted — the form's own checks are
// only a convenience.

import type { Img } from "@/lib/catalog-types";

export type ProductField =
  | "name"
  | "slug"
  | "category"
  | "price"
  | "styleCode"
  | "releasedAt"
  | "tag"
  | "description"
  | "details"
  | "care"
  | "images"
  | "sizes";

export type FieldErrors<F extends string> = Partial<Record<F, string>>;
type Parsed<T, F extends string> = { ok: true; value: T } | { ok: false; errors: FieldErrors<F> };

export type ProductDetailsInput = {
  name: string;
  categorySlug: string;
  priceCents: number;
  styleCode: string;
  releasedAt: string;
  tag: string | null;
  description: string;
  details: string[];
  care: string[];
  images: Img[];
};

export type SizeInput = { size: string; quantity: number };
export type NewProductInput = ProductDetailsInput & { slug: string; sizes: SizeInput[] };

export const LIMITS = {
  name: 120,
  slug: 100, // the bag accepts slugs up to 100 characters (src/lib/cart-quote.ts)
  styleCode: 30,
  tag: 24,
  description: 2000,
  lines: 20,
  line: 300,
  images: 8,
  alt: 200,
  url: 500,
  size: 40, // matches the bag's size limit
  sizes: 20,
  quantity: 99_999,
  /** Stripe Checkout's largest single USD amount is $999,999.99; prices are whole dollars. */
  priceCents: 99_999_900,
} as const;

const SLUG = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const STYLE_CODE = /^[A-Z0-9][A-Z0-9-]*$/;
const PRICE = /^\d+(?:\.\d{1,2})?$/;
const DATE = /^\d{4}-\d{2}-\d{2}$/;

const text = (form: FormData, key: string) => {
  const value = form.get(key);
  return typeof value === "string" ? value.trim() : "";
};
const texts = (form: FormData, key: string) => form.getAll(key).map((v) => (typeof v === "string" ? v.trim() : ""));
const lines = (value: string) =>
  value
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

/** "1,890" / "1890.5" → 189050 cents, or null. */
export function parsePriceCents(value: string): number | null {
  const plain = value.replace(/[$,\s]/g, "");
  if (!PRICE.test(plain)) return null;
  const [whole, fraction = ""] = plain.split(".");
  const cents = Number(whole) * 100 + Number(fraction.padEnd(2, "0"));
  return Number.isSafeInteger(cents) ? cents : null;
}

/** Whole number of units, 0–99,999, or null. */
export function parseQuantity(value: string): number | null {
  const trimmed = value.trim();
  if (!/^\d{1,5}$/.test(trimmed)) return null; // digits only: no sign, decimals or exponent
  const n = Number(trimmed);
  return n <= LIMITS.quantity ? n : null;
}

function isValidDate(value: string) {
  if (!DATE.test(value)) return false;
  const date = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(date.getTime()) && date.toISOString().startsWith(value);
}

/** https image URL; Unsplash URLs are stored bare (the image loader adds sizing params). */
function normalizeImageUrl(value: string): string | null {
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    return null;
  }
  if (url.protocol !== "https:" || value.length > LIMITS.url) return null;
  if (url.hostname === "images.unsplash.com") return `${url.origin}${url.pathname}`;
  return url.toString();
}

export function parseProductDetails(form: FormData): Parsed<ProductDetailsInput, ProductField> {
  const errors: FieldErrors<ProductField> = {};

  const name = text(form, "name");
  if (!name) errors.name = "Enter a product name.";
  else if (name.length > LIMITS.name) errors.name = `Use at most ${LIMITS.name} characters.`;

  const categorySlug = text(form, "category");
  if (!SLUG.test(categorySlug)) errors.category = "Choose a category.";

  const priceText = text(form, "price");
  const priceCents = parsePriceCents(priceText);
  if (!priceText) errors.price = "Enter a price.";
  else if (priceCents === null) errors.price = "Enter a price in dollars, e.g. 1890.";
  // The storefront shows whole-dollar prices (formatPrice), so cents would be displayed rounded.
  else if (priceCents % 100 !== 0) errors.price = "Use a whole-dollar price (cents aren't shown in the store).";
  else if (priceCents <= 0) errors.price = "The price must be more than $0.";
  else if (priceCents > LIMITS.priceCents) errors.price = "The price can be at most $999,999.";

  const styleCode = text(form, "styleCode").toUpperCase();
  if (!styleCode) errors.styleCode = "Enter a style code, e.g. AT-24017.";
  else if (styleCode.length > LIMITS.styleCode || !STYLE_CODE.test(styleCode))
    errors.styleCode = "Use letters, numbers and hyphens only (e.g. AT-24017).";

  const releasedAt = text(form, "releasedAt");
  if (!isValidDate(releasedAt)) errors.releasedAt = "Enter a valid release date.";

  const tag = text(form, "tag");
  if (tag.length > LIMITS.tag) errors.tag = `Use at most ${LIMITS.tag} characters.`;

  const description = text(form, "description");
  if (!description) errors.description = "Enter a description.";
  else if (description.length > LIMITS.description) errors.description = `Use at most ${LIMITS.description} characters.`;

  const details = lines(text(form, "details"));
  const care = lines(text(form, "care"));
  for (const [field, list] of [["details", details], ["care", care]] as const) {
    if (list.length > LIMITS.lines) errors[field] = `Use at most ${LIMITS.lines} lines.`;
    else if (list.some((line) => line.length > LIMITS.line)) errors[field] = `Keep each line under ${LIMITS.line} characters.`;
  }

  const srcs = texts(form, "imageSrc");
  const alts = texts(form, "imageAlt");
  const images: Img[] = [];
  for (let i = 0; i < Math.max(srcs.length, alts.length); i++) {
    const src = srcs[i] ?? "";
    const alt = alts[i] ?? "";
    if (!src && !alt) continue;
    const normalized = normalizeImageUrl(src);
    if (!normalized) {
      errors.images = `Image ${i + 1}: enter a full https:// image URL.`;
      break;
    }
    if (!alt || alt.length > LIMITS.alt) {
      errors.images = `Image ${i + 1}: describe the image for screen readers (1–${LIMITS.alt} characters).`;
      break;
    }
    images.push({ src: normalized, alt });
  }
  if (!errors.images && images.length === 0) errors.images = "Add at least one image.";
  if (!errors.images && images.length > LIMITS.images) errors.images = `Use at most ${LIMITS.images} images.`;

  if (Object.keys(errors).length) return { ok: false, errors };
  return {
    ok: true,
    value: { name, categorySlug, priceCents: priceCents!, styleCode, releasedAt, tag: tag || null, description, details, care, images },
  };
}

function parseSize(size: string, quantityText: string): { value?: SizeInput; error?: string } {
  if (!size) return { error: "Enter a size (use “One size” for single-size products)." };
  if (size.length > LIMITS.size) return { error: `Keep sizes under ${LIMITS.size} characters.` };
  const quantity = parseQuantity(quantityText);
  if (quantity === null) return { error: `Stock for ${size} must be a whole number from 0 to ${LIMITS.quantity.toLocaleString("en-US")}.` };
  return { value: { size, quantity } };
}

export function parseNewProduct(form: FormData): Parsed<NewProductInput, ProductField> {
  const details = parseProductDetails(form);
  const errors: FieldErrors<ProductField> = details.ok ? {} : { ...details.errors };

  const slug = text(form, "slug").toLowerCase();
  if (!slug) errors.slug = "Enter a URL slug, e.g. woven-leather-tote.";
  else if (slug.length > LIMITS.slug || !SLUG.test(slug)) errors.slug = "Use lowercase letters, numbers and single hyphens.";

  const sizeNames = texts(form, "size");
  const quantities = texts(form, "quantity");
  const sizes: SizeInput[] = [];
  const seen = new Set<string>();
  for (let i = 0; i < Math.max(sizeNames.length, quantities.length); i++) {
    if (!sizeNames[i] && !quantities[i]) continue;
    const parsed = parseSize(sizeNames[i] ?? "", quantities[i] ?? "");
    if (parsed.error) {
      errors.sizes = parsed.error;
      break;
    }
    const key = parsed.value!.size.toLowerCase();
    if (seen.has(key)) {
      errors.sizes = `Size ${parsed.value!.size} is listed twice.`;
      break;
    }
    seen.add(key);
    sizes.push(parsed.value!);
  }
  if (!errors.sizes && sizes.length === 0) errors.sizes = "Add at least one size.";
  if (!errors.sizes && sizes.length > LIMITS.sizes) errors.sizes = `Use at most ${LIMITS.sizes} sizes.`;

  if (!details.ok || Object.keys(errors).length) return { ok: false, errors };
  return { ok: true, value: { ...details.value, slug, sizes } };
}

/** A size to add to an existing product. */
export function parseNewSize(form: FormData): Parsed<SizeInput, "size"> {
  const parsed = parseSize(text(form, "size"), text(form, "quantity"));
  return parsed.value ? { ok: true, value: parsed.value } : { ok: false, errors: { size: parsed.error } };
}

export type StockUpdateInput = { stockId: number; expected: number; quantity: number };

/**
 * One size's stock update. `quantity` is what the admin wants available now; `expected` is the value
 * they saw (a concurrency token, never written); `stockId` is scoped to the product by the writer.
 */
export function parseStockUpdate(form: FormData): Parsed<StockUpdateInput, "quantity" | "form"> {
  const stockIdText = text(form, "stockId");
  const stockId = /^\d{1,10}$/.test(stockIdText) ? Number(stockIdText) : NaN;
  const expected = parseQuantity(text(form, "expected"));
  if (!Number.isSafeInteger(stockId) || stockId <= 0 || expected === null) {
    return { ok: false, errors: { form: "This form is out of date. Reload the page and try again." } };
  }
  const quantityText = text(form, "quantity");
  const quantity = parseQuantity(quantityText);
  if (!quantityText) return { ok: false, errors: { quantity: "Enter the number of units available." } };
  if (quantity === null) return { ok: false, errors: { quantity: `Use a whole number from 0 to ${LIMITS.quantity.toLocaleString("en-US")}.` } };
  return { ok: true, value: { stockId, expected, quantity } };
}
