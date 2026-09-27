import { relations, sql } from "drizzle-orm";
import { check, date, index, integer, jsonb, pgTable, text, unique } from "drizzle-orm/pg-core";

// Relative import: drizzle-kit loads this file without the tsconfig "@/" alias.
import type { Img } from "../../lib/catalog-types";

import { createdAt, updatedAt } from "./columns";

export const categories = pgTable("categories", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  /** URL segment, e.g. "handbags" → /handbags. */
  slug: text("slug").notNull().unique(),
  name: text("name").notNull(),
  description: text("description").notNull(),
  sortOrder: integer("sort_order").notNull().default(0),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
});

export const products = pgTable(
  "products",
  {
    id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
    categoryId: integer("category_id")
      .notNull()
      .references(() => categories.id, { onDelete: "restrict" }),
    slug: text("slug").notNull().unique(),
    name: text("name").notNull(),
    styleCode: text("style_code").notNull().unique(),
    description: text("description").notNull(),
    priceCents: integer("price_cents").notNull(),
    tag: text("tag"),
    details: text("details").array().notNull().default(sql`'{}'::text[]`),
    care: text("care").array().notNull().default(sql`'{}'::text[]`),
    /** Ordered; the first image is the listing/card image. */
    images: jsonb("images").$type<Img[]>().notNull(),
    releasedAt: date("released_at", { mode: "string" }).notNull(),
    /** Merchandising order ("Featured" sort). */
    sortOrder: integer("sort_order").notNull().default(0),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [
    index("products_category_id_idx").on(t.categoryId),
    check("products_price_cents_non_negative", sql`${t.priceCents} >= 0`),
  ],
);

/**
 * Units available to buy now, per product and size — not the physical count: checkout subtracts
 * units when it reserves them for an order and adds them back if that checkout doesn't complete.
 * Admin edits set this value only if it still holds what the admin saw. One-size products have a
 * single "One size" row.
 */
export const stock = pgTable(
  "stock",
  {
    id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
    productId: integer("product_id")
      .notNull()
      .references(() => products.id, { onDelete: "cascade" }),
    size: text("size").notNull(),
    quantity: integer("quantity").notNull().default(0),
    /** Size display order (XS → XL, 36 → 41). */
    sortOrder: integer("sort_order").notNull().default(0),
    updatedAt: updatedAt(),
  },
  (t) => [
    unique("stock_product_id_size_unique").on(t.productId, t.size),
    check("stock_quantity_non_negative", sql`${t.quantity} >= 0`),
  ],
);

export const categoriesRelations = relations(categories, ({ many }) => ({
  products: many(products),
}));

export const productsRelations = relations(products, ({ one, many }) => ({
  category: one(categories, { fields: [products.categoryId], references: [categories.id] }),
  stock: many(stock),
}));

export const stockRelations = relations(stock, ({ one }) => ({
  product: one(products, { fields: [stock.productId], references: [products.id] }),
}));
