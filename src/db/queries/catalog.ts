import "server-only";

import { and, asc, eq, inArray, ne, notInArray } from "drizzle-orm";
import { cache } from "react";

import { db } from "@/db";
import { categories, products, stock } from "@/db/schema";
import type { Category, Product } from "@/lib/catalog-types";

// The only module that reads the catalog. Rows are mapped to the domain types in
// src/lib/catalog-types.ts so components never see database shapes. `cache` dedupes calls
// within one request (e.g. generateMetadata + page).

type CategoryRow = typeof categories.$inferSelect;
type ProductRow = typeof products.$inferSelect & {
  category: CategoryRow;
  stock: (typeof stock.$inferSelect)[];
};

const withCategoryAndStock = {
  category: true as const,
  stock: { orderBy: [asc(stock.sortOrder)] },
};

function toCategory(row: CategoryRow): Category {
  return { slug: row.slug, name: row.name, href: `/${row.slug}`, description: row.description };
}

function toProduct(row: ProductRow): Product {
  return {
    slug: row.slug,
    name: row.name,
    price: row.priceCents / 100,
    category: toCategory(row.category),
    styleCode: row.styleCode,
    releasedAt: row.releasedAt,
    tag: row.tag ?? undefined,
    description: row.description,
    details: row.details,
    care: row.care,
    images: row.images,
    stock: row.stock.map((level) => ({ size: level.size, stock: level.quantity })),
  };
}

export const listCategories = cache(async () => {
  const rows = await db.query.categories.findMany({ orderBy: [asc(categories.sortOrder)] });
  return rows.map(toCategory);
});

export const getCategory = cache(async (slug: string) => {
  const row = await db.query.categories.findFirst({ where: eq(categories.slug, slug) });
  return row ? toCategory(row) : undefined;
});

/** Products in a category, in merchandising order. */
export const listProductsByCategory = cache(async (categorySlug: string) => {
  const rows = await db.query.products.findMany({
    where: inArray(
      products.categoryId,
      db.select({ id: categories.id }).from(categories).where(eq(categories.slug, categorySlug)),
    ),
    with: withCategoryAndStock,
    orderBy: [asc(products.sortOrder)],
  });
  return rows.map(toProduct);
});

export const getProduct = cache(async (slug: string) => {
  const row = await db.query.products.findFirst({
    where: eq(products.slug, slug),
    with: withCategoryAndStock,
  });
  return row ? toProduct(row) : undefined;
});

/** Products in the order given. Throws on an unknown slug so curation mistakes surface at build. */
export async function getProductsBySlugs(slugs: string[]) {
  const rows = await db.query.products.findMany({
    where: inArray(products.slug, slugs),
    with: withCategoryAndStock,
  });
  const bySlug = new Map(rows.map((row) => [row.slug, toProduct(row)]));
  return slugs.map((slug) => {
    const product = bySlug.get(slug);
    if (!product) throw new Error(`Unknown product slug: ${slug}`);
    return product;
  });
}

/** Same-category products first, then the rest of the catalog, in merchandising order. */
export async function getRelatedProducts(product: Product, limit = 6) {
  const categoryIds = db.select({ id: categories.id }).from(categories).where(eq(categories.slug, product.category.slug));
  const related = (inCategory: boolean, max: number) =>
    db.query.products.findMany({
      where: and(
        ne(products.slug, product.slug),
        inCategory ? inArray(products.categoryId, categoryIds) : notInArray(products.categoryId, categoryIds),
      ),
      with: withCategoryAndStock,
      orderBy: [asc(products.sortOrder)],
      limit: max,
    });

  const same = await related(true, limit);
  const rest = same.length < limit ? await related(false, limit - same.length) : [];
  return [...same, ...rest].map(toProduct);
}

export async function listProductSlugs() {
  const rows = await db.select({ slug: products.slug }).from(products).orderBy(asc(products.sortOrder));
  return rows.map((row) => row.slug);
}
