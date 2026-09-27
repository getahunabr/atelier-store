// Loads src/db/seed-data.ts into the catalog tables: `npm run db:seed`.
// Idempotent: categories and products are upserted by slug and each seeded product's stock rows
// are replaced. Rows not in the seed data are left alone. Everything runs in one db.batch, which
// the Neon HTTP driver executes as a single transaction.

import { count, getTableColumns, inArray, sql, type Table } from "drizzle-orm";

import { db } from "./index";
import { categories, products, stock } from "./schema";
import { categories as seedCategories, products as seedProducts } from "./seed-data";

/** `SET col = excluded.col` for an upsert, keyed by the table's TS property names. */
function fromExcluded<T extends Table>(table: T, keys: (keyof T["$inferInsert"] & string)[]) {
  const columns = getTableColumns(table);
  return Object.fromEntries(keys.map((key) => [key, sql.raw(`excluded."${columns[key].name}"`)]));
}

const categoryId = (slug: string) => sql`(select id from ${categories} where ${categories.slug} = ${slug})`;
const productId = (slug: string) => sql`(select id from ${products} where ${products.slug} = ${slug})`;

async function main() {
  const productSlugs = seedProducts.map((product) => product.slug);

  // The seed replaces every seeded product's stock rows with the sample quantities. Once the store
  // has orders, that would wipe stock edited in the admin and ignore units held by open checkouts
  // (their later release would then inflate stock) — so it refuses unless explicitly forced.
  const [{ n: orderCount }] = await db.select({ n: count() }).from(sql`orders`);
  if (orderCount > 0 && !process.argv.includes("--force")) {
    console.error(
      `Refusing to seed: the database has ${orderCount} order(s), and seeding resets stock for the sample products ` +
        `(overwriting admin stock edits). Re-run with \`npm run db:seed -- --force\` only on a development database.`,
    );
    process.exit(1);
  }

  await db.batch([
    db
      .insert(categories)
      .values(seedCategories.map((category, index) => ({ ...category, sortOrder: index })))
      .onConflictDoUpdate({
        target: categories.slug,
        set: { ...fromExcluded(categories, ["name", "description", "sortOrder"]), updatedAt: sql`now()` },
      }),

    db
      .insert(products)
      .values(
        seedProducts.map((product, index) => ({
          categoryId: categoryId(product.category),
          slug: product.slug,
          name: product.name,
          styleCode: product.styleCode,
          description: product.description,
          priceCents: Math.round(product.price * 100),
          tag: product.tag ?? null,
          details: product.details,
          care: product.care,
          images: product.images,
          releasedAt: product.releasedAt,
          sortOrder: index,
        })),
      )
      .onConflictDoUpdate({
        target: products.slug,
        set: {
          ...fromExcluded(products, [
            "categoryId",
            "name",
            "styleCode",
            "description",
            "priceCents",
            "tag",
            "details",
            "care",
            "images",
            "releasedAt",
            "sortOrder",
          ]),
          updatedAt: sql`now()`,
        },
      }),

    db.delete(stock).where(inArray(stock.productId, db.select({ id: products.id }).from(products).where(inArray(products.slug, productSlugs)))),

    db.insert(stock).values(
      seedProducts.flatMap((product) =>
        product.variants.map((level, index) => ({
          productId: productId(product.slug),
          size: level.size,
          quantity: level.stock,
          sortOrder: index,
        })),
      ),
    ),
  ]);

  const [[c], [p], [s]] = await Promise.all([
    db.select({ n: count() }).from(categories),
    db.select({ n: count() }).from(products),
    db.select({ n: count() }).from(stock),
  ]);
  console.log(`Seeded. Tables now hold ${c.n} categories, ${p.n} products, ${s.n} stock rows.`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
