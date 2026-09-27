import { timestamp } from "drizzle-orm/pg-core";

// Shared column helpers for the hand-written schema files (not re-exported from the barrel).

export const createdAt = () => timestamp("created_at", { withTimezone: true }).notNull().defaultNow();

export const updatedAt = () =>
  timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date());
