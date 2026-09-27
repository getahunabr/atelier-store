import "server-only";

import { and, asc, count, eq, inArray, lte, sql, sum } from "drizzle-orm";
import { cache } from "react";

import { db } from "@/db";
import { categories, orderItems, orders, products, stock, user } from "@/db/schema";
import type { Img } from "@/lib/catalog-types";
import { LOW_STOCK_THRESHOLD } from "@/lib/stock";
import { assertAdmin } from "@/lib/session";

// Reads for the admin area. Every exported function checks the admin role itself (first statement,
// enforced by `npm run check:admin`), so admin data can't leak through a non-admin page even if one
// imported these by mistake. Pages still call requireAdmin() first, which redirects/404s properly.

/** Store-wide counts for the admin overview. */
export async function getAdminOverview() {
  await assertAdmin();
  const [[categoryCount], [productCount], [units], [customers], [admins]] = await Promise.all([
    db.select({ n: count() }).from(categories),
    db.select({ n: count() }).from(products),
    db.select({ n: sum(stock.quantity) }).from(stock),
    db.select({ n: count() }).from(user),
    db.select({ n: count() }).from(user).where(eq(user.role, "admin")),
  ]);
  return {
    categories: categoryCount.n,
    products: productCount.n,
    unitsInStock: Number(units.n ?? 0),
    accounts: customers.n,
    admins: admins.n,
  };
}

export type AdminCategoryOption = { slug: string; name: string; productCount: number };

/** Categories in display order, with how many products each has. */
export async function listAdminCategories(): Promise<AdminCategoryOption[]> {
  await assertAdmin();
  const rows = await db
    .select({ slug: categories.slug, name: categories.name, productCount: count(products.id) })
    .from(categories)
    .leftJoin(products, eq(products.categoryId, categories.id))
    .groupBy(categories.id)
    .orderBy(asc(categories.sortOrder), asc(categories.name));
  return rows;
}

export type AdminProductRow = {
  slug: string;
  name: string;
  styleCode: string;
  category: { slug: string; name: string };
  priceCents: number;
  image?: Img;
  unitsInStock: number;
  sizes: number;
  soldOutSizes: number;
};

/** Products for the admin list, in "Featured" order, optionally for one category. */
export async function listAdminProducts(categorySlug?: string): Promise<AdminProductRow[]> {
  await assertAdmin();
  const rows = await db.query.products.findMany({
    with: { category: true, stock: true },
    where: categorySlug
      ? inArray(products.categoryId, db.select({ id: categories.id }).from(categories).where(eq(categories.slug, categorySlug)))
      : undefined,
    orderBy: [asc(products.sortOrder), asc(products.id)],
  });
  return rows.map((row) => ({
    slug: row.slug,
    name: row.name,
    styleCode: row.styleCode,
    category: { slug: row.category.slug, name: row.category.name },
    priceCents: row.priceCents,
    image: row.images[0],
    unitsInStock: row.stock.reduce((total, s) => total + s.quantity, 0),
    sizes: row.stock.length,
    soldOutSizes: row.stock.filter((s) => s.quantity === 0).length,
  }));
}

export type AdminStockRow = {
  id: number;
  size: string;
  /** Units available to buy now (already excludes units held by open checkouts). */
  quantity: number;
  /** Units reserved by checkouts that haven't settled (pending payment / processing). */
  held: number;
};

export type AdminProduct = {
  slug: string;
  name: string;
  styleCode: string;
  categorySlug: string;
  priceCents: number;
  releasedAt: string;
  tag: string | null;
  description: string;
  details: string[];
  care: string[];
  images: Img[];
  stock: AdminStockRow[];
  createdAt: Date;
  updatedAt: Date;
};

/** Order statuses whose units are subtracted from stock but may still come back (expiry, failure). */
const HOLDING_STATUSES = ["pending_payment", "processing"] as const;

/** One product with everything the edit page needs, or null. */
export async function getAdminProduct(slug: string): Promise<AdminProduct | null> {
  await assertAdmin();
  return loadAdminProduct(slug);
}

// Once per request (metadata + page).
const loadAdminProduct = cache(async (slug: string): Promise<AdminProduct | null> => {
  const row = await db.query.products.findFirst({
    where: eq(products.slug, slug),
    with: { category: true, stock: { orderBy: [asc(stock.sortOrder), asc(stock.id)] } },
  });
  if (!row) return null;

  const held = await db
    .select({ size: orderItems.size, units: sql<number>`sum(${orderItems.quantity})::int` })
    .from(orderItems)
    .innerJoin(orders, eq(orders.id, orderItems.orderId))
    .where(and(eq(orderItems.productId, row.id), inArray(orders.status, [...HOLDING_STATUSES])))
    .groupBy(orderItems.size);
  const heldBySize = new Map(held.map((h) => [h.size, h.units]));

  return {
    slug: row.slug,
    name: row.name,
    styleCode: row.styleCode,
    categorySlug: row.category.slug,
    priceCents: row.priceCents,
    releasedAt: row.releasedAt,
    tag: row.tag,
    description: row.description,
    details: row.details,
    care: row.care,
    images: row.images,
    stock: row.stock.map((s) => ({ id: s.id, size: s.size, quantity: s.quantity, held: heldBySize.get(s.size) ?? 0 })),
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
});

export type StockFilter = "all" | "low" | "sold-out";

export type AdminStockListRow = AdminStockRow & {
  product: { slug: string; name: string; image?: Img };
  category: { slug: string; name: string };
};

/**
 * Every size of every product with available and held units, in storefront order. "low" means
 * 1..LOW_STOCK_THRESHOLD available (what the store shows as "Only N left"); "sold-out" means 0.
 */
export async function listAdminStock(filter: StockFilter = "all", categorySlug?: string): Promise<AdminStockListRow[]> {
  await assertAdmin();
  const held = db
    .select({
      productId: orderItems.productId,
      size: orderItems.size,
      units: sql<number>`sum(${orderItems.quantity})::int`.as("units"),
    })
    .from(orderItems)
    .innerJoin(orders, eq(orders.id, orderItems.orderId))
    .where(inArray(orders.status, [...HOLDING_STATUSES]))
    .groupBy(orderItems.productId, orderItems.size)
    .as("held");

  const rows = await db
    .select({
      id: stock.id,
      size: stock.size,
      quantity: stock.quantity,
      held: sql<number>`coalesce(${held.units}, 0)`,
      productSlug: products.slug,
      productName: products.name,
      images: products.images,
      categorySlug: categories.slug,
      categoryName: categories.name,
    })
    .from(stock)
    .innerJoin(products, eq(products.id, stock.productId))
    .innerJoin(categories, eq(categories.id, products.categoryId))
    .leftJoin(held, and(eq(held.productId, stock.productId), eq(held.size, stock.size)))
    .where(
      and(
        categorySlug ? eq(categories.slug, categorySlug) : undefined,
        filter === "sold-out" ? eq(stock.quantity, 0) : undefined,
        filter === "low" ? and(sql`${stock.quantity} > 0`, lte(stock.quantity, LOW_STOCK_THRESHOLD)) : undefined,
      ),
    )
    .orderBy(asc(products.sortOrder), asc(products.id), asc(stock.sortOrder), asc(stock.id));

  return rows.map((r) => ({
    id: r.id,
    size: r.size,
    quantity: r.quantity,
    held: Number(r.held),
    product: { slug: r.productSlug, name: r.productName, image: r.images[0] },
    category: { slug: r.categorySlug, name: r.categoryName },
  }));
}
