import "server-only";

import { randomUUID } from "node:crypto";
import { and, eq, inArray, lt, sql, type SQL } from "drizzle-orm";
import type Stripe from "stripe";

import { db } from "@/db";
import { orderItems, orders, stock } from "@/db/schema";
import type { ShippingAddress } from "@/db/schema";
import { quoteCart } from "@/lib/cart-quote";
import type { CartLineInput, CartQuote } from "@/lib/cart-types";
import { ONE_SIZE } from "@/lib/catalog-types";
import { SHIPPING_COUNTRIES } from "@/lib/shipping-countries";
import type { CheckoutStripe } from "@/lib/stripe";

// Checkout, from bag to Stripe and back. Prices and stock come only from PostgreSQL; the browser
// sends slugs, sizes and quantities. Payment is only ever confirmed from Stripe's side (a server-side
// session lookup here, and the webhook handler) — never because the browser reached a page.
//
// Every write is safe to repeat (the database client retries network failures, and Stripe may
// deliver events twice): the reservation is one transaction keyed by a unique public id, and every
// status change only applies from the expected previous status.

/** Stripe requires expires_at at least 30 minutes out; the stock hold matches the session lifetime. */
const RESERVATION_MINUTES = 31;
/** Pending orders are released this long after their session expired, if nothing else did it first. */
const RELEASE_GRACE_MINUTES = 2;

type OrderStatus = (typeof orders.$inferSelect)["status"];

// ---------------------------------------------------------------------------------------------
// Stock release (guarded, idempotent)
// ---------------------------------------------------------------------------------------------

/**
 * Moves matching orders from one of `from` to `to` and returns their reserved stock — in a single
 * statement, so the status change and the restock happen together or not at all. Orders that
 * already left `from` are untouched, which makes repeated calls harmless.
 */
async function releaseOrders(where: SQL, to: "expired" | "payment_failed", from: OrderStatus[]) {
  const result = await db.execute(sql`
    with released as (
      update ${orders} set status = ${to}, updated_at = now()
      where ${where} and ${orders.status} in (${sql.join(from.map((s) => sql`${s}`), sql`, `)})
      returning ${orders.id}
    ), quantities as (
      select ${orderItems.productId} as product_id, ${orderItems.size} as size, sum(${orderItems.quantity})::int as quantity
      from ${orderItems}
      where ${orderItems.orderId} in (select id from released)
      group by 1, 2
    ), restocked as (
      update ${stock} set quantity = ${stock.quantity} + quantities.quantity, updated_at = now()
      from quantities
      where ${stock.productId} = quantities.product_id and ${stock.size} = quantities.size
      returning ${stock.id}
    )
    select (select count(*) from released)::int as orders, (select count(*) from restocked)::int as stock_rows
  `);
  return result.rows[0] as { orders: number; stock_rows: number };
}

/** Releases reservations whose Stripe session has expired but was never cleaned up. */
export async function releaseLapsedReservations() {
  return releaseOrders(
    lt(orders.reservedUntil, sql`now() - make_interval(mins => ${RELEASE_GRACE_MINUTES})`),
    "expired",
    ["pending_payment"],
  );
}

// ---------------------------------------------------------------------------------------------
// Starting checkout
// ---------------------------------------------------------------------------------------------

export type StartCheckoutResult =
  | { status: "redirect"; url: string; orderId: string }
  | { status: "changed"; quote: CartQuote; reason: "empty" | "stock" }
  | { status: "sold_out"; quote: CartQuote }
  /** `reason` is for logs and developers (never shown to customers in production). */
  | { status: "unavailable"; reason: string };

type StartCheckoutInput = {
  userId: string;
  email: string;
  lines: CartLineInput[];
  /** Absolute origin for Stripe's return URLs, e.g. https://atelier.example. */
  origin: string;
};

const sizeLabel = (size: string) => (size === ONE_SIZE ? ONE_SIZE : `Size ${size}`);

/** A sized https image URL for Stripe's hosted page (our Unsplash sources are resized by their CDN). */
function stripeImage(src: string | null) {
  if (!src?.startsWith("https://")) return [];
  const url = new URL(src);
  url.searchParams.set("auto", "format");
  url.searchParams.set("fit", "crop");
  url.searchParams.set("w", "600");
  return [url.toString()];
}

const randomLetters = (n: number) =>
  Array.from({ length: n }, () => String.fromCharCode(97 + Math.floor(Math.random() * 26))).join("");

export async function startCheckout(input: StartCheckoutInput, stripe: CheckoutStripe): Promise<StartCheckoutResult> {
  // Return stock held by abandoned checkouts before judging availability.
  await releaseLapsedReservations();

  // 1. Revalidate: current prices and stock from the database. Anything short of "exactly as the
  //    customer saw it" sends them back to the bag with the updated quote.
  const quote = await quoteCart(input.lines);
  if (quote.lines.length === 0) return { status: "changed", quote, reason: "empty" };
  if (quote.lines.some((line) => line.status !== "ok")) return { status: "changed", quote, reason: "stock" };

  // 2. Create the order, snapshot its items and reserve the stock — one transaction. If any stock
  //    row would go below zero (someone bought the last unit a moment ago), the
  //    stock_quantity_non_negative check aborts everything and nothing is written.
  const publicId = randomUUID();
  const reservedUntil = new Date(Date.now() + RESERVATION_MINUTES * 60 * 1000);
  const productId = (slug: string) => sql`(select id from products where slug = ${slug})`;

  try {
    await db.batch([
      db.insert(orders).values({
        publicId,
        userId: input.userId,
        subtotalCents: quote.subtotalCents,
        totalCents: quote.subtotalCents, // complimentary delivery, no tax yet
        reservedUntil,
      }),
      db.insert(orderItems).values(
        quote.lines.map((line) => ({
          orderId: sql`(select id from orders where public_id = ${publicId})`,
          productId: productId(line.slug),
          size: line.size,
          productSlug: line.slug,
          productName: line.product!.name,
          imageSrc: line.product!.image.src,
          unitPriceCents: line.unitPriceCents,
          quantity: line.quantity,
          lineTotalCents: line.lineTotalCents,
        })),
      ),
      ...quote.lines.map((line) =>
        db
          .update(stock)
          .set({ quantity: sql`${stock.quantity} - ${line.quantity}`, updatedAt: new Date() })
          .where(and(eq(stock.productId, productId(line.slug)), eq(stock.size, line.size))),
      ),
    ]);
  } catch (error) {
    // A retried request may have committed on its first attempt; the unique public id tells us.
    const existing = await db.query.orders.findFirst({ where: eq(orders.publicId, publicId), columns: { id: true } });
    if (!existing) {
      if (isStockViolation(error)) return { status: "sold_out", quote: await quoteCart(input.lines) };
      throw error;
    }
  }

  // 3. Stripe Checkout Session built from the order snapshot (never from client input).
  const items = await db.query.orderItems.findMany({
    where: inArray(orderItems.orderId, db.select({ id: orders.id }).from(orders).where(eq(orders.publicId, publicId))),
  });

  let session: Stripe.Checkout.Session;
  try {
    session = await stripe.checkout.sessions.create(
      {
        mode: "payment",
        // No payment_method_types: dynamic payment methods are managed in the Stripe Dashboard.
        line_items: items.map((item) => ({
          quantity: item.quantity,
          price_data: {
            currency: "usd",
            unit_amount: item.unitPriceCents,
            product_data: {
              name: item.productName,
              description: sizeLabel(item.size),
              images: stripeImage(item.imageSrc),
              metadata: { slug: item.productSlug, size: item.size },
            },
          },
        })),
        customer_email: input.email,
        client_reference_id: publicId,
        metadata: { order_id: publicId },
        payment_intent_data: { metadata: { order_id: publicId } },
        // Every destination Stripe supports; its form adapts state and postal-code fields per country.
        shipping_address_collection: { allowed_countries: SHIPPING_COUNTRIES },
        expires_at: Math.floor(reservedUntil.getTime() / 1000),
        success_url: `${input.origin}/checkout/success?session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${input.origin}/checkout/cancel?order=${publicId}`,
        integration_identifier: `atelier_checkout_${randomLetters(8)}`,
      },
      // Same order → same session, even if this request is retried.
      { idempotencyKey: `checkout-session-${publicId}` },
    );
  } catch (error) {
    // Couldn't reach Stripe: give the stock back and let the customer try again.
    await releaseOrders(eq(orders.publicId, publicId), "expired", ["pending_payment"]);
    // e.g. StripeAuthenticationError (wrong key) or StripePermissionError (restricted key lacks
    // "Checkout Sessions: write").
    const { type, code, message, statusCode } = error as { type?: string; code?: string; message?: string; statusCode?: number };
    const reason = `Stripe session creation failed (${type ?? "unknown"}${code ? `/${code}` : ""}${statusCode ? `, HTTP ${statusCode}` : ""}): ${message}`;
    console.error(`[checkout] ${reason}`);
    return { status: "unavailable", reason };
  }

  await db
    .update(orders)
    .set({ stripeCheckoutSessionId: session.id })
    .where(and(eq(orders.publicId, publicId), sql`${orders.stripeCheckoutSessionId} is null`));

  if (!session.url) {
    const reason = `Stripe returned session ${session.id} without a URL`;
    console.error(`[checkout] ${reason}`);
    return { status: "unavailable", reason };
  }
  return { status: "redirect", url: session.url, orderId: publicId };
}

/** Whether a failed batch was the stock check refusing an oversell (Drizzle wraps the driver error). */
function isStockViolation(error: unknown) {
  type Wrapped = { constraint?: string; cause?: unknown; sourceError?: unknown };
  for (let e = error as Wrapped | undefined, i = 0; e && i < 5; e = (e.cause ?? e.sourceError) as Wrapped | undefined, i++) {
    if (e.constraint === "stock_quantity_non_negative") return true;
  }
  return false;
}

// ---------------------------------------------------------------------------------------------
// Applying Stripe's view of a session (shared by the success page and, later, the webhook)
// ---------------------------------------------------------------------------------------------

const PAYMENT_STATUSES = ["unpaid", "paid", "no_payment_required"] as const;
function knownPaymentStatus(status: string) {
  return (PAYMENT_STATUSES as readonly string[]).includes(status) ? (status as (typeof PAYMENT_STATUSES)[number]) : null;
}

/**
 * The shipping address Stripe collected, stored as given. Only a country and a first line are
 * required: many countries have no postal codes (or no state/province), and some addresses have
 * no separate city, so those fields are kept only when Stripe provides them.
 */
function shippingFrom(session: Stripe.Checkout.Session): ShippingAddress | null {
  const details = session.collected_information?.shipping_details;
  const address = details?.address;
  if (!address?.line1 || !address.country) return null;
  const optional = (value: string | null | undefined) => value?.trim() || undefined;
  return {
    name: optional(details?.name),
    line1: address.line1,
    line2: optional(address.line2),
    city: optional(address.city),
    state: optional(address.state),
    postalCode: optional(address.postal_code),
    country: address.country,
  };
}

/**
 * Brings our order in line with a Checkout Session fetched from Stripe (server-side) or delivered by
 * a verified webhook. Status changes are guarded by the previous status, so this is idempotent and
 * order-independent: a late "expired" can't undo "paid", a repeat "paid" changes nothing.
 */
export async function applyCheckoutSession(session: Stripe.Checkout.Session) {
  const order = await findSessionOrder(session);
  if (!order) return null;

  if (session.status === "expired") {
    await releaseOrders(eq(orders.id, order.id), "expired", ["pending_payment"]);
  } else if (session.status === "complete") {
    const stripeFields = {
      stripePaymentStatus: knownPaymentStatus(session.payment_status),
      stripePaymentIntentId: typeof session.payment_intent === "string" ? session.payment_intent : (session.payment_intent?.id ?? null),
      email: session.customer_details?.email ?? null,
      shippingAddress: shippingFrom(session),
      updatedAt: new Date(),
    };

    if (session.payment_status === "paid" || session.payment_status === "no_payment_required") {
      // Money received: confirm only if it matches what we priced; otherwise flag for review.
      const amountMatches = session.amount_total === order.totalCents && session.currency === order.currency;
      const payment = { ...stripeFields, amountPaidCents: session.amount_total, paidAt: new Date() };
      const [confirmed] = await db
        .update(orders)
        .set({ ...payment, status: amountMatches ? "paid" : "needs_review" })
        .where(and(eq(orders.id, order.id), inArray(orders.status, ["pending_payment", "processing"])))
        .returning({ status: orders.status });
      // Paid after we'd already released the stock: the money is real, so someone has to look.
      const [late] = confirmed
        ? []
        : await db
            .update(orders)
            .set({ ...payment, status: "needs_review" })
            .where(and(eq(orders.id, order.id), inArray(orders.status, ["expired", "payment_failed"])))
            .returning({ status: orders.status });
      if (confirmed?.status === "needs_review" || late) {
        console.error(`[checkout] order ${order.publicId} needs review: charged ${session.amount_total} ${session.currency}, expected ${order.totalCents} ${order.currency}, was ${order.status}`);
      }
    } else {
      // Completed with a delayed payment method: keep the stock reserved until it settles.
      await db
        .update(orders)
        .set({ ...stripeFields, status: "processing" })
        .where(and(eq(orders.id, order.id), eq(orders.status, "pending_payment")));
    }
  }
  // "open": nothing to record yet.

  return db.query.orders.findFirst({ where: eq(orders.id, order.id), with: { items: true } });
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * The order a Checkout Session belongs to. Normally found by session id; a webhook can arrive in
 * the moment between Stripe creating the session and us saving its id, so fall back to the order
 * id we sent as client_reference_id — only for an order with no session recorded yet, which then
 * gets this one.
 */
async function findSessionOrder(session: Stripe.Checkout.Session) {
  const bySession = await db.query.orders.findFirst({ where: eq(orders.stripeCheckoutSessionId, session.id) });
  if (bySession || !session.client_reference_id || !UUID.test(session.client_reference_id)) return bySession ?? null;

  const [claimed] = await db
    .update(orders)
    .set({ stripeCheckoutSessionId: session.id })
    .where(and(eq(orders.publicId, session.client_reference_id), sql`${orders.stripeCheckoutSessionId} is null`))
    .returning();
  // A retried request may already have claimed it.
  return claimed ?? (await db.query.orders.findFirst({ where: eq(orders.stripeCheckoutSessionId, session.id) })) ?? null;
}

/**
 * A delayed payment method (e.g. a bank debit) failed after checkout completed: the order will
 * never be paid, so give its stock back. Guarded, so repeats and late deliveries are harmless.
 */
export async function failCheckoutPayment(session: Stripe.Checkout.Session) {
  const order = await findSessionOrder(session);
  if (!order) return null;
  await releaseOrders(eq(orders.id, order.id), "payment_failed", ["processing", "pending_payment"]);
  await db
    .update(orders)
    .set({ stripePaymentStatus: knownPaymentStatus(session.payment_status), updatedAt: new Date() })
    .where(and(eq(orders.id, order.id), eq(orders.status, "payment_failed")));
  return db.query.orders.findFirst({ where: eq(orders.id, order.id) });
}

// ---------------------------------------------------------------------------------------------
// Success and cancel
// ---------------------------------------------------------------------------------------------

const ORDER_ID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Brings one of the customer's unsettled orders (pending_payment / processing) up to date with
 * Stripe before it's displayed, in case a webhook is late or missing. Only the owner's order is
 * touched (filtered by user id); settled orders and other customers' ids are left alone.
 */
export async function syncCustomerOrder(orderPublicId: string, userId: string, stripe: CheckoutStripe) {
  if (!ORDER_ID.test(orderPublicId)) return;
  const order = await db.query.orders.findFirst({
    where: and(eq(orders.publicId, orderPublicId), eq(orders.userId, userId)),
    columns: { status: true, stripeCheckoutSessionId: true },
  });
  if (!order?.stripeCheckoutSessionId || (order.status !== "pending_payment" && order.status !== "processing")) return;
  await confirmOrder(order.stripeCheckoutSessionId, userId, stripe);
}

/**
 * The customer's order for a Checkout Session, confirmed with Stripe if it isn't settled yet.
 * Returns null when the session isn't this customer's order (or doesn't exist). Without a Stripe
 * client the stored state is returned as is.
 */
export async function confirmOrder(sessionId: string, userId: string, stripe: CheckoutStripe | null) {
  const order = await db.query.orders.findFirst({
    where: and(eq(orders.stripeCheckoutSessionId, sessionId), eq(orders.userId, userId)),
    with: { items: true },
  });
  if (!order) return null;
  if (!stripe || (order.status !== "pending_payment" && order.status !== "processing")) return order;

  // Ask Stripe directly — the browser's arrival here proves nothing about payment.
  const session = await stripe.checkout.sessions.retrieve(sessionId);
  if (session.client_reference_id !== order.publicId) return order;
  return (await applyCheckoutSession(session)) ?? order;
}

/**
 * The customer came back from Stripe without paying: expire the session so it can't be paid later,
 * and give the reserved stock back. If Stripe says it was actually completed, record that instead.
 */
export async function cancelCheckout(orderPublicId: string, userId: string, stripe: CheckoutStripe) {
  const order = await db.query.orders.findFirst({
    where: and(eq(orders.publicId, orderPublicId), eq(orders.userId, userId)),
  });
  if (!order) return null;
  const result = (status: OrderStatus) => ({ status, sessionId: order.stripeCheckoutSessionId });
  if (order.status !== "pending_payment") return result(order.status);

  if (!order.stripeCheckoutSessionId) {
    await releaseOrders(eq(orders.id, order.id), "expired", ["pending_payment"]);
    return result("expired");
  }

  let session: Stripe.Checkout.Session;
  try {
    session = await stripe.checkout.sessions.expire(order.stripeCheckoutSessionId);
  } catch {
    // Already completed or expired on Stripe's side — take Stripe's word for it.
    session = await stripe.checkout.sessions.retrieve(order.stripeCheckoutSessionId);
  }
  const updated = await applyCheckoutSession(session);
  return result(updated?.status ?? order.status);
}
