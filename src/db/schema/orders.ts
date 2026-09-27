import { relations, sql } from "drizzle-orm";
import {
  check,
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  text,
  timestamp,
  unique,
  uuid,
} from "drizzle-orm/pg-core";

// Relative import: drizzle-kit loads this file without the tsconfig "@/" alias.
import type { ShippingAddress } from "../../lib/order-types";

import { user } from "./auth";
import { products } from "./catalog";
import { createdAt, updatedAt } from "./columns";

// Orders for Stripe Checkout (flow in src/lib/checkout.ts). Money is integer cents; every item
// snapshots name, size and price at checkout so later catalog changes never alter a past order.

/**
 * Our order lifecycle, changed only by the server (checkout start, Stripe webhooks, the success
 * page asking Stripe). Allowed transitions:
 *   pending_payment → paid | processing | expired | needs_review
 *   processing      → paid | payment_failed | needs_review
 *   expired | payment_failed → needs_review   (Stripe reports money received after we released stock)
 */
export const orderStatus = pgEnum("order_status", [
  "pending_payment", // order created, stock reserved, waiting for Stripe Checkout
  "processing", // checkout completed but a delayed payment method hasn't settled yet
  "paid", // Stripe confirmed payment
  "payment_failed", // delayed payment failed; stock released
  "expired", // Checkout session expired or was abandoned; stock released
  "needs_review", // Stripe reported something inconsistent (e.g. amount mismatch)
]);

/** Stripe Checkout Session `payment_status`, stored verbatim as last reported by Stripe. */
export const stripePaymentStatus = pgEnum("stripe_payment_status", ["unpaid", "paid", "no_payment_required"]);

export type { ShippingAddress };

export const orders = pgTable(
  "orders",
  {
    id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
    /** Unguessable id for URLs and Stripe metadata; never expose `id`. */
    publicId: uuid("public_id").notNull().unique().defaultRandom(),
    /** The signed-in customer who placed the order. Orders are kept, so users with orders can't be deleted. */
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "restrict" }),
    status: orderStatus("status").notNull().default("pending_payment"),
    currency: text("currency").notNull().default("usd"),
    /** Computed by us from order_items at checkout. */
    subtotalCents: integer("subtotal_cents").notNull(),
    totalCents: integer("total_cents").notNull(),
    /** When the stock reservation lapses if payment hasn't completed. */
    reservedUntil: timestamp("reserved_until", { withTimezone: true }).notNull(),

    // --- Stripe (all written from Stripe's side: API responses or verified webhooks) ---
    stripeCheckoutSessionId: text("stripe_checkout_session_id").unique(),
    stripePaymentIntentId: text("stripe_payment_intent_id").unique(),
    stripePaymentStatus: stripePaymentStatus("stripe_payment_status"),
    /** Amount Stripe reports as charged; compared with total_cents. */
    amountPaidCents: integer("amount_paid_cents"),
    /** Email and shipping address as collected by Stripe Checkout. */
    email: text("email"),
    shippingAddress: jsonb("shipping_address").$type<ShippingAddress>(),

    paidAt: timestamp("paid_at", { withTimezone: true }),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [
    index("orders_user_id_created_at_idx").on(t.userId, t.createdAt),
    // Finding lapsed reservations (pending orders past reserved_until).
    index("orders_status_reserved_until_idx").on(t.status, t.reservedUntil),
    check("orders_currency_format", sql`${t.currency} ~ '^[a-z]{3}$'`),
    check("orders_subtotal_non_negative", sql`${t.subtotalCents} >= 0`),
    check("orders_total_non_negative", sql`${t.totalCents} >= 0`),
    check("orders_amount_paid_non_negative", sql`${t.amountPaidCents} IS NULL OR ${t.amountPaidCents} >= 0`),
    check("orders_paid_has_paid_at", sql`${t.status} <> 'paid' OR ${t.paidAt} IS NOT NULL`),
    check("orders_stripe_session_id_format", sql`${t.stripeCheckoutSessionId} IS NULL OR ${t.stripeCheckoutSessionId} LIKE 'cs\\_%'`),
    check("orders_stripe_payment_intent_id_format", sql`${t.stripePaymentIntentId} IS NULL OR ${t.stripePaymentIntentId} LIKE 'pi\\_%'`),
  ],
);

export const orderItems = pgTable(
  "order_items",
  {
    id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
    orderId: integer("order_id")
      .notNull()
      .references(() => orders.id, { onDelete: "cascade" }),
    /** Products with orders can't be deleted (history and stock release depend on the link). */
    productId: integer("product_id")
      .notNull()
      .references(() => products.id, { onDelete: "restrict" }),
    size: text("size").notNull(),
    // Snapshots taken at checkout.
    productSlug: text("product_slug").notNull(),
    productName: text("product_name").notNull(),
    imageSrc: text("image_src"),
    unitPriceCents: integer("unit_price_cents").notNull(),
    quantity: integer("quantity").notNull(),
    lineTotalCents: integer("line_total_cents").notNull(),
    createdAt: createdAt(),
  },
  (t) => [
    // No separate order_id index: the unique (order_id, product_id, size) index serves order_id lookups.
    index("order_items_product_id_idx").on(t.productId),
    unique("order_items_order_product_size_unique").on(t.orderId, t.productId, t.size),
    check("order_items_quantity_positive", sql`${t.quantity} > 0`),
    check("order_items_unit_price_non_negative", sql`${t.unitPriceCents} >= 0`),
    check("order_items_line_total_matches", sql`${t.lineTotalCents} = ${t.unitPriceCents} * ${t.quantity}`),
  ],
);

/**
 * Stripe webhook events already handled, for idempotency and audit. Insert-if-absent on the Stripe
 * event id before processing; a duplicate delivery finds the row and is skipped.
 */
export const stripeEvents = pgTable(
  "stripe_events",
  {
    /** Stripe event id (evt_…). */
    id: text("id").primaryKey(),
    type: text("type").notNull(),
    orderId: integer("order_id").references(() => orders.id, { onDelete: "set null" }),
    receivedAt: timestamp("received_at", { withTimezone: true }).notNull().defaultNow(),
    processedAt: timestamp("processed_at", { withTimezone: true }),
  },
  (t) => [
    index("stripe_events_order_id_idx").on(t.orderId),
    check("stripe_events_id_format", sql`${t.id} LIKE 'evt\\_%'`),
  ],
);

export const ordersRelations = relations(orders, ({ one, many }) => ({
  user: one(user, { fields: [orders.userId], references: [user.id] }),
  items: many(orderItems),
  stripeEvents: many(stripeEvents),
}));

export const orderItemsRelations = relations(orderItems, ({ one }) => ({
  order: one(orders, { fields: [orderItems.orderId], references: [orders.id] }),
  product: one(products, { fields: [orderItems.productId], references: [products.id] }),
}));

export const stripeEventsRelations = relations(stripeEvents, ({ one }) => ({
  order: one(orders, { fields: [stripeEvents.orderId], references: [orders.id] }),
}));
