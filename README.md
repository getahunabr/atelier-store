# Atelier Store

Next.js (App Router) + TypeScript + Tailwind CSS, with Better Auth, Drizzle ORM, and Neon Postgres.

## Setup

```bash
npm install
cp .env.example .env.local   # fill in DATABASE_URL and BETTER_AUTH_SECRET
npm run dev
```

## Structure

```
src/
  app/api/auth/[...all]/route.ts   Better Auth route handler
  db/index.ts                      Drizzle client (Neon HTTP driver)
  db/schema/                       Drizzle table definitions (re-exported from index.ts)
  lib/auth.ts                      Better Auth server config
  lib/auth-client.ts               Better Auth React client
drizzle/                           Generated SQL migrations
drizzle.config.ts                  Drizzle Kit config
```

## Scripts

| Script | Purpose |
| --- | --- |
| `npm run dev` / `build` / `start` | Next.js |
| `npm run lint` / `typecheck` | ESLint / TypeScript |
| `npm run auth:generate` | Generate Better Auth tables into `src/db/schema/auth.ts` |
| `npm run db:generate` | Generate SQL migrations from the schema |
| `npm run db:migrate` | Apply migrations to the database |
| `npm run db:push` | Push schema directly (prototyping) |
| `npm run db:studio` | Open Drizzle Studio |

> **Note:** Better Auth validates its tables at runtime, so `/api/auth/*` returns 500 until the auth schema exists. Run `npm run auth:generate`, add `export * from "./auth";` to `src/db/schema/index.ts`, then `npm run db:generate && npm run db:migrate`.
