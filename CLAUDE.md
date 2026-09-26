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
npm run db:push        # push schema directly (prototyping only)
npm run db:studio      # Drizzle Studio
```

Env vars come from `.env.local` (copy `.env.example`): `DATABASE_URL` (Neon **pooled** connection string), `BETTER_AUTH_SECRET`, `BETTER_AUTH_URL`. `drizzle.config.ts` loads `.env.local` then `.env` via dotenv; Next loads them itself.

## Architecture

- **DB client** — `src/db/index.ts` builds a single Drizzle instance on the Neon HTTP driver (`drizzle-orm/neon-http`) and throws at import time if `DATABASE_URL` is unset, so anything importing `@/db` (including `next build`, which evaluates the auth route) needs that env var.
- **Schema** — `src/db/schema/` holds table files, re-exported from `src/db/schema/index.ts`. That barrel is both what drizzle-kit reads (`schema: "./src/db/schema"`) and what's passed to `drizzle({ schema })`, so new table files must be re-exported there.
- **Auth** — `src/lib/auth.ts` (server config, Drizzle adapter with `provider: "pg"`) is mounted by the catch-all `src/app/api/auth/[...all]/route.ts` via `toNextJsHandler`. `src/lib/auth-client.ts` is the React client (same-origin, no baseURL). `nextCookies()` must remain the **last** plugin so server actions can set auth cookies. No sign-in methods are enabled yet.
- **Better Auth schema coupling** — Better Auth 1.7 validates its Drizzle tables at runtime; until `user`, `session`, `account`, `verification` exist, every `/api/auth/*` request returns 500 (`SCHEMA_MISMATCH`). Workflow after changing auth config/plugins: `npm run auth:generate` → ensure `export * from "./auth"` is in the schema barrel → `db:generate` → `db:migrate`. Don't hand-edit the generated `auth.ts`; regenerate it.
- **Design system** — Tailwind v4, CSS-first (no `tailwind.config`). `src/app/globals.css` only imports `src/styles/tokens.css` (`@theme` tokens; responsive `--gutter`/`--section-space`/`--header-height` on `:root`, exposed as `px-gutter`, `py-section`, `h-header`), `base.css` (element defaults), and `components.css` (`.btn*`, `.link`, `.eyebrow`, `.nav-link`, `.field` in the components layer; layout primitives like `container-page`, `product-grid`, `media-frame`, `rail`, `link-reveal` as `@utility`). Use semantic tokens (`ink`, `canvas`, `surface`, `line`, `text-body`, ...) rather than raw palette colors. Light theme only. Fonts come from `next/font` in `layout.tsx` via `--font-sans-face` / `--font-serif-face`. In v4 only `@utility` classes can be `@apply`'d, not `@layer components` classes.
- **Images** — `next.config.ts` sets a global custom loader (`src/lib/image-loader.ts`): Unsplash URLs are resized by Unsplash's own CDN via query params; any other `src` is returned unoptimized. Add a branch there when real product media gets a storage/CDN. Store bare Unsplash URLs (`https://images.unsplash.com/photo-<id>`) without params.
- **Storefront content** — sample data, no DB yet. `src/data/products.ts` is the single product catalog (categories, per-size `variants` with stock counts, images); `src/data/storefront.ts` holds home-page content and picks products by slug via `getProducts`. `src/data/images.ts` has `unsplash()` and `unsplashDetail()` (a focal-point zoom crop used for detail shots). Most linked routes (categories, bag, account) don't exist yet. Layout chrome (`SiteHeader`, `SiteFooter`, skip link) lives in `app/layout.tsx`.
- **Product pages** — `app/products/[slug]` is statically generated from the catalog (`generateStaticParams`); unknown slugs 404. Stock state is derived, never stored: `src/lib/stock.ts` maps units to in stock / low (≤ `LOW_STOCK_THRESHOLD`) / sold out, used by both `ProductCard` ("Sold out" tag) and the client `PurchasePanel` (size picker). The add-to-bag button reflects availability only — there is no cart yet.
- **Category pages** — `app/[category]/page.tsx` serves every key in `categories` (`/women`, `/men`, `/handbags`, ...) with `dynamicParams = false`, so any other top-level path 404s; a new static top-level route (e.g. `app/bag`) takes precedence over it. Filters and sort live in the URL (`?size=&price=&stock=in&sort=`) and are parsed/applied by pure functions in `src/lib/catalog-filters.ts` (invalid values are ignored); `CatalogView` is the client toolbar that rewrites the URL with `router.replace`. "Newest" sorts by each product's `releasedAt`.
- **Sample imagery rule** — check Unsplash photos at product-page size for third-party logos/labels before using them; several were rejected or cropped for this (see comments in `products.ts`).
- The Better Auth CLI is the `auth` package (not the deprecated `@better-auth/cli`); keep its version in step with `better-auth`.
