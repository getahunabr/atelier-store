# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

@AGENTS.md

## Project

Atelier Store — an ecommerce app in early scaffold stage. Stack: Next.js 16 (App Router, `src/` dir, Turbopack), TypeScript, Tailwind CSS v4, Better Auth 1.7, Drizzle ORM, Neon Postgres. Package manager is npm. No test framework is configured yet.

## Commands

```bash
npm run dev          # dev server (localhost:3000)
npm run build        # production build
npm run lint         # ESLint (flat config, eslint-config-next)
npm run typecheck    # tsc --noEmit

npm run auth:generate  # Better Auth CLI -> writes src/db/schema/auth.ts
npm run db:generate    # drizzle-kit: SQL migrations into drizzle/
npm run db:migrate     # apply migrations
npm run db:push        # push schema directly (prototyping only; use generate + migrate for real changes)
npm run db:studio      # Drizzle Studio
npm run db:seed        # load src/db/seed-data.ts into the catalog tables (idempotent)
```

Env vars come from `.env.local` (copy `.env.example`): `DATABASE_URL`, `DATABASE_URL_UNPOOLED`, `BETTER_AUTH_SECRET`, `BETTER_AUTH_URL`.

## Database conventions

- **Scope** — the database holds only `categories`, `products` and `stock` (`src/db/schema/catalog.ts`). Don't add carts, orders, payments, reviews, wishlists or product variants unless asked. `stock` is one row per product + size with a quantity only (no per-size price or SKU); one-size items use the size `ONE_SIZE`.
- **Schema style** — explicit snake_case table/column names, `integer` identity primary keys, `created_at`/`updated_at` as `timestamptz` (`updated_at` via `$onUpdate`), unique `slug` for anything addressed by URL. Money is stored as integer cents (`price_cents`) and converted to dollars only when mapping to domain types. Guard invariants in the database: foreign keys (`products → categories` ON DELETE RESTRICT, `stock → products` ON DELETE CASCADE), CHECK constraints for non-negative amounts, UNIQUE `(product_id, size)`. Keep states that can be derived (in stock / low / sold out) out of the database — `src/lib/stock.ts` computes them.
- **Schema files** — every table file in `src/db/schema/` must be re-exported from `src/db/schema/index.ts` (drizzle-kit and `drizzle({ schema })` both read that barrel). Use relative imports in schema files; drizzle-kit doesn't resolve the `@/` alias.
- **Migrations** — edit the schema → `npm run db:generate` → review the SQL → commit `drizzle/` → `npm run db:migrate`. Never `db:push` for real changes and never edit a migration that has been applied. drizzle-kit uses `DATABASE_URL_UNPOOLED` (Neon direct connection); the app uses the pooled `DATABASE_URL`. Apply to a Neon dev branch before main.
- **Driver** — `src/db/index.ts` uses the Neon HTTP driver, which has no interactive transactions: use `db.batch([...])` for multi-statement writes that must be atomic. It throws at import time if `DATABASE_URL` is unset.
- **Reading data** — only `src/db/queries/*.ts` (`import "server-only"`) query the database. They map rows to DB-free domain types in `src/lib/catalog-types.ts` and wrap lookups in React `cache()`. Components — especially client components — import types from `catalog-types`, never from `@/db` or the schema.
- **Seeding** — `src/db/seed-data.ts` is the sample catalog (array order = `sort_order`); `npm run db:seed` upserts by slug and replaces stock rows in one batch, so it is safe to re-run.
- **Rendering** — the home page and product pages are built from the database and revalidate every 5 minutes (`revalidate = 300`); category pages query per request. `next build` therefore needs a reachable `DATABASE_URL`.
- **Secrets** — never read, print or edit `.env.local`/`.env`; scripts load them themselves. Only `.env.example` (placeholders) is edited.

## Architecture

- **Auth** — `src/lib/auth.ts` (server config, Drizzle adapter with `provider: "pg"`) is mounted by the catch-all `src/app/api/auth/[...all]/route.ts` via `toNextJsHandler`. `src/lib/auth-client.ts` is the React client (same-origin, no baseURL). `nextCookies()` must remain the **last** plugin so server actions can set auth cookies. No sign-in methods are enabled yet.
- **Better Auth schema coupling** — Better Auth 1.7 validates its Drizzle tables at runtime; until `user`, `session`, `account`, `verification` exist, every `/api/auth/*` request returns 500 (`SCHEMA_MISMATCH`). Workflow after changing auth config/plugins: `npm run auth:generate` → ensure `export * from "./auth"` is in the schema barrel → `db:generate` → `db:migrate`. Don't hand-edit the generated `auth.ts`; regenerate it.
- **Design system** — Tailwind v4, CSS-first (no `tailwind.config`). `src/app/globals.css` only imports `src/styles/tokens.css` (`@theme` tokens; responsive `--gutter`/`--section-space`/`--header-height` on `:root`, exposed as `px-gutter`, `py-section`, `h-header`), `base.css` (element defaults), and `components.css` (`.btn*`, `.link`, `.eyebrow`, `.nav-link`, `.field` in the components layer; layout primitives like `container-page`, `product-grid`, `media-frame`, `rail`, `link-reveal` as `@utility`). Use semantic tokens (`ink`, `canvas`, `surface`, `line`, `text-body`, ...) rather than raw palette colors. Light theme only. Fonts come from `next/font` in `layout.tsx` via `--font-sans-face` / `--font-serif-face`. In v4 only `@utility` classes can be `@apply`'d, not `@layer components` classes.
- **Images** — `next.config.ts` sets a global custom loader (`src/lib/image-loader.ts`): Unsplash URLs are resized by Unsplash's own CDN via query params; any other `src` is returned unoptimized. Add a branch there when real product media gets a storage/CDN. Store bare Unsplash URLs (`https://images.unsplash.com/photo-<id>`) without params.
- **Sample images** — `src/data/images.ts` has `unsplash()` and `unsplashDetail()` (a focal-point zoom crop used for detail shots), used by the seed data.
- **Storefront content** — `src/data/storefront.ts` is editorial content (hero, collection tiles, nav, footer) and the curated home-page product slugs (`featuredSlugs`, `giftSlugs`), resolved with `getProductsBySlugs`. Layout chrome (`SiteHeader`, `SiteFooter`, skip link) lives in `app/layout.tsx`.
- **Product pages** — `app/products/[slug]` is generated for every product (`generateStaticParams`); products added later render on first request; unknown slugs 404. `src/lib/stock.ts` maps units to in stock / low (≤ `LOW_STOCK_THRESHOLD`) / sold out, used by both `ProductCard` ("Sold out" tag) and the client `PurchasePanel` (size picker). The add-to-bag button reflects availability only — there is no cart yet.
- **Category pages** — `app/[category]/page.tsx` serves every slug in the `categories` table (`/women`, `/men`, `/handbags`, ...) and 404s anything else. A new static top-level route (e.g. `app/bag`) takes precedence over it. Filters and sort live in the URL (`?size=&price=&stock=in&sort=`) and are parsed/applied by pure functions in `src/lib/catalog-filters.ts` (invalid values are ignored); `CatalogView` is the client toolbar that rewrites the URL with `router.replace`. "Newest" sorts by each product's `releasedAt`.
- **Sample imagery rule** — check Unsplash photos at product-page size for third-party logos/labels before using them; several were rejected or cropped for this (see comments in `src/db/seed-data.ts`).
- The Better Auth CLI is the `auth` package (not the deprecated `@better-auth/cli`); keep its version in step with `better-auth`.
