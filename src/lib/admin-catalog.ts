import "server-only";

import { and, eq, sql } from "drizzle-orm";

import { db } from "@/db";
import { categories, products, stock } from "@/db/schema";
import { LIMITS, type FieldErrors, type NewProductInput, type ProductDetailsInput, type ProductField, type SizeInput } from "@/lib/admin-product-input";
import { assertAdmin } from "@/lib/session";

// Catalog writes for the admin area. Called from admin server actions (already inside withAdmin);
// each also checks the role itself so it can never be reused unguarded. Inputs are validated by
// src/lib/admin-product-input.ts; the database constraints (unique slug/style code, unique size per
// product, non-negative stock and price) are the final word.

type Result<T, F extends string> = { ok: true; value: T } | { ok: false; errors: FieldErrors<F>; message?: string };

/** The Postgres constraint a failed statement violated (Drizzle wraps the driver error). */
function violatedConstraint(error: unknown): string | undefined {
  type Wrapped = { constraint?: string; cause?: unknown; sourceError?: unknown };
  for (let e = error as Wrapped | undefined, i = 0; e && i < 5; e = (e.cause ?? e.sourceError) as Wrapped | undefined, i++) {
    if (e.constraint) return e.constraint;
  }
  return undefined;
}

function uniqueErrors(error: unknown): FieldErrors<ProductField> | null {
  switch (violatedConstraint(error)) {
    case "products_slug_unique":
      return { slug: "Another product already uses this URL slug." };
    case "products_style_code_unique":
      return { styleCode: "Another product already uses this style code." };
    case "stock_product_id_size_unique":
      return { sizes: "Each size can only be listed once." };
    default:
      return null;
  }
}

async function categoryId(slug: string) {
  const row = await db.query.categories.findFirst({ where: eq(categories.slug, slug), columns: { id: true } });
  return row?.id;
}

const detailColumns = (input: ProductDetailsInput, categoryIdValue: number) => ({
  name: input.name,
  categoryId: categoryIdValue,
  priceCents: input.priceCents,
  styleCode: input.styleCode,
  releasedAt: input.releasedAt,
  tag: input.tag,
  description: input.description,
  details: input.details,
  care: input.care,
  images: input.images,
});

/** Creates a product and its sizes in one transaction. New products go last in "Featured" order. */
export async function createProduct(input: NewProductInput): Promise<Result<{ slug: string }, ProductField>> {
  await assertAdmin();
  const catId = await categoryId(input.categorySlug);
  if (!catId) return { ok: false, errors: { category: "Choose a category." } };

  const productId = sql`(select id from products where slug = ${input.slug})`;
  try {
    await db.batch([
      db.insert(products).values({
        ...detailColumns(input, catId),
        slug: input.slug,
        sortOrder: sql`(select coalesce(max(sort_order), -1) + 1 from products)`,
      }),
      db.insert(stock).values(
        input.sizes.map((size, i) => ({ productId, size: size.size, quantity: size.quantity, sortOrder: i })),
      ),
    ]);
  } catch (error) {
    // A retried request may have committed on its first attempt.
    const existing = await db.query.products.findFirst({ where: eq(products.slug, input.slug), columns: { styleCode: true } });
    if (existing?.styleCode === input.styleCode) return { ok: true, value: { slug: input.slug } };
    const errors = uniqueErrors(error);
    if (errors) return { ok: false, errors };
    throw error;
  }
  return { ok: true, value: { slug: input.slug } };
}

/**
 * Updates name, category, price and the other details. The slug is fixed once created (it's in
 * URLs and customers' bags). Existing orders keep their own price/name snapshots.
 */
export async function updateProductDetails(
  slug: string,
  input: ProductDetailsInput,
): Promise<Result<{ previousCategorySlug: string }, ProductField>> {
  await assertAdmin();
  const current = await db.query.products.findFirst({ where: eq(products.slug, slug), with: { category: true } });
  if (!current) return { ok: false, errors: {}, message: "This product no longer exists." };
  const catId = await categoryId(input.categorySlug);
  if (!catId) return { ok: false, errors: { category: "Choose a category." } };

  try {
    await db.update(products).set({ ...detailColumns(input, catId), updatedAt: new Date() }).where(eq(products.slug, slug));
  } catch (error) {
    const errors = uniqueErrors(error);
    if (errors) return { ok: false, errors };
    throw error;
  }
  return { ok: true, value: { previousCategorySlug: current.category.slug } };
}

export type StockUpdate =
  | { status: "updated"; quantity: number }
  | { status: "conflict"; quantity: number }
  | { status: "not_found" };

/**
 * Sets the available units of one size — only if it still holds `expected` (what the admin saw).
 * Checkout reserves stock by decrementing this same number, so a blind write could resurrect a unit
 * a customer is paying for; on a mismatch nothing is written and the current value is returned.
 */
export async function setStockQuantity(slug: string, stockId: number, expected: number, next: number): Promise<StockUpdate> {
  await assertAdmin();
  const productId = sql`(select id from products where slug = ${slug})`;
  const [updated] = await db
    .update(stock)
    .set({ quantity: next, updatedAt: new Date() })
    .where(and(eq(stock.id, stockId), eq(stock.productId, productId), eq(stock.quantity, expected)))
    .returning({ quantity: stock.quantity });
  if (updated) return { status: "updated", quantity: updated.quantity };

  const current = await db.query.stock.findFirst({ where: and(eq(stock.id, stockId), eq(stock.productId, productId)) });
  if (!current) return { status: "not_found" };
  // Already at the requested value (e.g. a retried request): nothing to do.
  if (current.quantity === next) return { status: "updated", quantity: next };
  return { status: "conflict", quantity: current.quantity };
}

/** Adds a size to an existing product (last in display order). */
export async function addProductSize(slug: string, input: SizeInput): Promise<Result<null, "size">> {
  await assertAdmin();
  const product = await db.query.products.findFirst({
    where: eq(products.slug, slug),
    columns: { id: true },
    with: { stock: { columns: { size: true } } },
  });
  if (!product) return { ok: false, errors: {}, message: "This product no longer exists." };
  // The unique (product_id, size) constraint is case-sensitive; "m" beside "M" would confuse
  // customers and bags, so compare case-insensitively here.
  if (product.stock.some((s) => s.size.toLowerCase() === input.size.toLowerCase())) {
    return { ok: false, errors: { size: `Size ${input.size} already exists.` } };
  }
  if (product.stock.length >= LIMITS.sizes) {
    return { ok: false, errors: { size: `A product can have at most ${LIMITS.sizes} sizes.` } };
  }
  try {
    await db.insert(stock).values({
      productId: product.id,
      size: input.size,
      quantity: input.quantity,
      sortOrder: sql`(select coalesce(max(sort_order), -1) + 1 from stock where product_id = ${product.id})`,
    });
  } catch (error) {
    if (violatedConstraint(error) === "stock_product_id_size_unique") {
      return { ok: false, errors: { size: `Size ${input.size} already exists.` } };
    }
    throw error;
  }
  return { ok: true, value: null };
}
