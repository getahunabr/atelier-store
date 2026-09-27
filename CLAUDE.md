# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

@AGENTS.md

## Project

Atelier Store — a luxury-fashion ecommerce app: storefront, browser-side bag, Better Auth accounts, Stripe Checkout with order history, and an admin area for products and stock. Stack: Next.js 16 (App Router, `src/`, Turbopack), TypeScript, Tailwind CSS v4, Better Auth 1.7, Drizzle ORM, Neon Postgres, Stripe (hosted Checkout). npm. No test framework is committed yet.

## Commands

```bash
npm run dev          # dev server (localhost:3000)
npm run build        # production build (needs a reachable DATABASE_URL)
npm run lint         # ESLint + the admin guard check (scripts/check-admin-guards.mjs)
npm run typecheck    # tsc --noEmit
npm run check:admin  # the admin guard check alone

npm run auth:generate  # Better Auth CLI (`auth` package) -> src/db/schema/auth.ts
npm run db:generate    # drizzle-kit: SQL migrations into drizzle/
npm run db:migrate     # apply migrations
npm run db:seed        # sample catalog; refuses once orders exist (`-- --force` on a dev database only)
npm run admin:grant -- <email>    # admin role for an existing account (idempotent)
npm run admin:revoke -- <email>   # back to "user"; applies on the next request
```

Env vars (`.env.local`, template `.env.example`): `DATABASE_URL`, `DATABASE_URL_UNPOOLED`, `BETTER_AUTH_SECRET`, `BETTER_AUTH_URL`, `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`. Without `STRIPE_SECRET_KEY`, checkout answers 503 `stripe_not_configured`.

## Working rules

- **Secrets** — never read, print or edit `.env.local`/`.env`; scripts load them themselves. Only `.env.example` (placeholders) is edited. Presence checks may print whether a variable is set, never its value.
- **Shared dev database** — the dev server and every script use the same Neon database. The user's dev server runs on port 3000: don't stop or restart it; run verification against a separate `next start -p <port>` with `BETTER_AUTH_URL` set to that origin. Test accounts use `atelier-e2e-*@example.com`; put test products on `atelier-e2e-*` slugs and delete test data afterwards instead of re-seeding (the seed resets stock and is blocked once orders exist).

## Database

- **Scope** — catalog (`categories`, `products`, `stock`), Better Auth tables (`user` incl. admin `role`, `session`, `account`, `verification`), orders (`orders`, `order_items`, `stripe_events`). The bag is deliberately not in the database. Don't add reviews, wishlists, variants, warehouses, stock history or a DB cart unless asked.
- **Schema style** — snake_case names, `integer` identity PKs, `timestamptz` `created_at`/`updated_at`, unique `slug` for anything in a URL, money as integer cents. Guard invariants in the database (FKs, CHECKs for non-negative amounts/stock, UNIQUE `(product_id, size)`); derived states (in stock / low / sold out) are computed in `src/lib/stock.ts`, never stored.
- **Schema files** — re-export every table file from `src/db/schema/index.ts`; use relative imports inside schema files (drizzle-kit doesn't resolve `@/`). Domain types used by the schema live in `src/lib/*-types.ts`.
- **Migrations** — edit schema → `db:generate` → review SQL → commit `drizzle/` → `db:migrate`. Never `db:push` for real changes; never edit an applied migration. drizzle-kit uses `DATABASE_URL_UNPOOLED`; the app the pooled `DATABASE_URL`.
- **Driver** — Neon HTTP: no interactive transactions, so multi-statement atomic writes use `db.batch([...])` or a single CTE statement. Network failures are retried (up to 3 attempts), so **every write must be safe to repeat**. Drizzle's "Failed query" hides the cause in `error.cause`; look for `[db]` lines in the server log.
- **Reading data** — only `src/db/queries/*.ts` (`server-only`) query the database, wrap lookups in `cache()`, and map rows to DB-free types (`catalog-types`, `order-types`, `cart-types`). Client components never import `@/db` or the schema.
- **Stock** — `stock.quantity` is units **available to buy now**, not a physical count: checkout subtracts units when it reserves them for an order and adds them back if that checkout expires, is canceled or fails. One row per product + size (`ONE_SIZE` = "One size" for single-size items). Admin edits are absolute values applied only if the row still holds the value the admin saw (`WHERE quantity = expected`) — never blind writes or relative +/- adjustments.

## Orders, checkout and payments

- Every order belongs to a signed-in customer; expose only `public_id` (uuid), never `id`. Items snapshot name, image and unit price at checkout, so catalog edits never change past orders.
- **Pricing is server-only**: the bag stores intent (`{ slug, size, quantity }`); prices, stock caps and totals come from `POST /api/cart/quote` / `quoteCart`, and checkout re-quotes from the database and builds Stripe `price_data` from the order snapshot. Never accept prices, totals or payment status from the client.
- **Reservation** — creating the order, its items and the stock decrement happen in one `db.batch`; the `stock_quantity_non_negative` CHECK aborts the batch on oversell. Stripe `expires_at` equals the reservation (31 min); lapsed reservations are released by a sweep at checkout start.
- **Payment state** — `order_status` changes only on the server and only from the expected previous status (`UPDATE … WHERE status = …`), so retries, duplicate or out-of-order webhooks apply once. Transitions: pending_payment → processing / paid / expired / payment_failed / needs_review; processing → paid / payment_failed / needs_review; expired or payment_failed → needs_review if Stripe later reports money. A paid amount/currency that differs from `total_cents` → needs_review.
- **Confirmation** comes only from Stripe: the verified webhook (`/api/webhooks/stripe`, signature over the raw body, exactly the four `checkout.session.*` events, deduped in `stripe_events` insert-if-absent, 500 on failure so Stripe retries) or a server-side `sessions.retrieve`. Reaching `/checkout/success` proves nothing; only a paid order clears the purchased lines from the bag.
- **Ownership** — every order read, sync and cancel filters by the signed-in user's id in SQL; someone else's order is a 404, indistinguishable from a missing one.
- **Stripe rules** (see the stripe-best-practices skill): hosted Checkout Sessions, a restricted `rk_` key, an idempotency key per order, never `payment_method_types` (dynamic payment methods) or `automatic_tax` (no tax registration). Shipping is allowed to every country Stripe supports (`src/lib/shipping-countries.ts`); addresses store only what Stripe collected — postal code, state and city are optional.
- **Errors** — `/api/checkout` answers 503 with a `code` and always logs the real cause; the `detail` field is added only outside production. Never expose it in production, and don't promise emails or receipts the app doesn't send.

## Auth and authorization

- Self-managed Better Auth (don't move to Neon Managed Auth unless asked): email + password only, 30-day sessions with a 5-minute cookie cache, `admin` plugin (`role` can't be set at sign-up). `nextCookies()` must stay the **last** plugin. `BETTER_AUTH_URL` must match the serving origin (else `INVALID_ORIGIN`). After changing auth config/plugins: `auth:generate` → `db:generate` → `db:migrate`; never hand-edit `src/db/schema/auth.ts` (Better Auth validates the tables at runtime).
- `src/proxy.ts` (Next 16's middleware) only redirects requests **without** a session cookie; it never grants access and lets server-action POSTs through. Real checks live in `src/lib/session.ts`: `requireSession()` for customer pages, `requireAdmin()` for admin pages/layouts (fresh DB read, 404 for non-admins), `assertAdmin()` in admin queries and writes. `getSession()` can be 5 minutes stale — don't base authorization on it.
- **Admin entry points** — every admin page/layout awaits `requireAdmin()`; every export of an admin `"use server"` file starts with `return withAdmin(...)` (`src/lib/admin-guard.ts`); every function in `src/db/queries/admin.ts` starts with `await assertAdmin()`; admin writes in `src/lib/admin-catalog.ts` check the role too. `npm run lint` enforces this — keep new admin code inside those patterns. Hiding links is never the protection.
- `?next=` redirects go through `safeRedirectPath` (same-site paths only).
- After sign-in / sign-up / sign-out, do a full page load (`window.location.assign`); `router.replace` + `refresh` raced the client router cache. After a server action changes the session user, call `router.refresh()` from the client (the action's own render still sees the old cookie).

## Admin catalog decisions

- Product and category slugs are fixed once created (URLs and customers' bags reference them). Prices are whole dollars (the storefront's `formatPrice` shows no cents). New products go live immediately; there's no delete or hidden state (products on orders can't be deleted). Images are https URLs; there's no upload.
- Admin-facing copy says "Available" and shows "Held" (units reserved by open checkouts) beside it, so nobody subtracts held units twice.

## Next.js 16 / React notes

- Read `node_modules/next/dist/docs/` before relying on remembered APIs. Route props are `PageProps<"/route">` with Promise `params`/`searchParams`; `next typegen` regenerates them.
- Server actions: export plain `async function`s (not wrapped constants). React resets uncontrolled form fields after a form action, so forms that must keep input on validation errors use controlled inputs.
- ESLint forbids `setState` in effects: adjust state during render by comparing with the previous prop/result instead.
- Home, product and collection pages revalidate every 5 minutes (`revalidate = 300`); category and new-in pages render per request. Admin writes call `revalidatePath` for what they change; checkout doesn't, so cached pages can briefly show stale stock — the bag quote and checkout are always live.

## Design system

- Tailwind v4, CSS-first (no `tailwind.config`): tokens in `src/styles/tokens.css`, element defaults in `base.css`, `.btn*` / `.field` / `.eyebrow` / `.link` components and `@utility` layout primitives (`container-page`, `product-grid`, `media-frame`, `link-reveal`, …) in `components.css`. Use semantic tokens (`ink`, `canvas`, `surface`, `line`, `critical`, `success`), not raw colors. Light theme only. Only `@utility` classes can be `@apply`'d.
- Images go through the custom loader `src/lib/image-loader.ts` (Unsplash resized by Unsplash's CDN, anything else unoptimized); store Unsplash URLs without sizing params. Check sample photos at product-page size for third-party logos or labels before using them.
