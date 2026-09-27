import "server-only";

import { and, asc, desc, eq, inArray } from "drizzle-orm";
import { cache } from "react";

import { db } from "@/db";
import { orderItems, orders } from "@/db/schema";
import { orderReference, type OrderListItem, type OrderStatus, type OrderView } from "@/lib/order-types";

// A customer's orders. Every query takes the signed-in customer's id and filters on it in SQL, so
// one customer can never read another's orders — an unknown or foreign order id is simply "not
// found". Rows are mapped to the DB-free types in src/lib/order-types.ts.

/**
 * Orders shown in the history: checkouts the customer completed. Abandoned or canceled checkouts
 * (`expired`) and ones still at Stripe (`pending_payment`) were never placed from the customer's
 * point of view; their detail page still works by link (e.g. the checkout success page).
 */
const HISTORY_STATUSES: OrderStatus[] = ["paid", "processing", "needs_review", "payment_failed"];

const HISTORY_LIMIT = 50;

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

type OrderRow = typeof orders.$inferSelect & { items: (typeof orderItems.$inferSelect)[] };

export function toOrderView(row: OrderRow): OrderView {
  return {
    publicId: row.publicId,
    reference: orderReference(row.publicId),
    status: row.status,
    createdAt: row.createdAt,
    paidAt: row.paidAt,
    subtotalCents: row.subtotalCents,
    totalCents: row.totalCents,
    amountPaidCents: row.amountPaidCents,
    email: row.email,
    shippingAddress: row.shippingAddress,
    items: row.items.map((item) => ({
      id: item.id,
      slug: item.productSlug,
      name: item.productName,
      size: item.size,
      imageSrc: item.imageSrc,
      unitPriceCents: item.unitPriceCents,
      quantity: item.quantity,
      lineTotalCents: item.lineTotalCents,
    })),
  };
}

/** The customer's placed orders, newest first. */
export const listCustomerOrders = cache(async (userId: string): Promise<OrderListItem[]> => {
  const rows = await db.query.orders.findMany({
    where: and(eq(orders.userId, userId), inArray(orders.status, HISTORY_STATUSES)),
    orderBy: [desc(orders.createdAt), desc(orders.id)],
    limit: HISTORY_LIMIT,
    with: { items: { orderBy: [asc(orderItems.id)] } },
  });

  return rows.map((row) => {
    const [first, ...rest] = row.items;
    return {
      publicId: row.publicId,
      reference: orderReference(row.publicId),
      status: row.status,
      createdAt: row.createdAt,
      totalCents: row.totalCents,
      itemCount: row.items.reduce((sum, item) => sum + item.quantity, 0),
      images: row.items
        .filter((item) => item.imageSrc)
        .slice(0, 3)
        .map((item) => ({ src: item.imageSrc!, alt: item.productName })),
      summary: first ? (rest.length ? `${first.productName} and ${rest.length} more` : first.productName) : "",
    };
  });
});

/** One of the customer's orders by its public id, or null if it doesn't exist or isn't theirs. */
export const getCustomerOrder = cache(async (userId: string, publicId: string): Promise<OrderView | null> => {
  // Postgres rejects malformed uuids with an error; treat them as not found instead.
  if (!UUID.test(publicId)) return null;
  const row = await db.query.orders.findFirst({
    where: and(eq(orders.publicId, publicId), eq(orders.userId, userId)),
    with: { items: { orderBy: [asc(orderItems.id)] } },
  });
  return row ? toOrderView(row) : null;
});
