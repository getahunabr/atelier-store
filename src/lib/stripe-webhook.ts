import "server-only";

import { eq, sql } from "drizzle-orm";
import type Stripe from "stripe";

import { db } from "@/db";
import { stripeEvents } from "@/db/schema";
import { applyCheckoutSession, failCheckoutPayment } from "@/lib/checkout";

// Stripe webhook events, after the route has verified the signature. These are the source of truth
// for payment: the success page may confirm earlier by asking Stripe's API, but both go through
// the same guarded, idempotent transitions in src/lib/checkout.ts.

/** The only events our Checkout flow needs (subscribe the endpoint to exactly these). */
export const HANDLED_EVENTS = [
  "checkout.session.completed",
  "checkout.session.async_payment_succeeded",
  "checkout.session.async_payment_failed",
  "checkout.session.expired",
] as const;

type HandledEvent = Extract<Stripe.Event, { type: (typeof HANDLED_EVENTS)[number] }>;

const isHandled = (event: Stripe.Event): event is HandledEvent =>
  (HANDLED_EVENTS as readonly string[]).includes(event.type);

export type WebhookOutcome = "processed" | "duplicate" | "ignored";

/**
 * Applies one verified event. Duplicate deliveries are detected by event id (stripe_events);
 * an event whose earlier attempt failed part-way is processed again, which is safe because every
 * order transition only applies from the expected previous status. Throws on failure so the route
 * answers 500 and Stripe retries.
 */
export async function handleStripeEvent(event: Stripe.Event): Promise<WebhookOutcome> {
  if (!isHandled(event)) return "ignored";

  const [recorded] = await db
    .insert(stripeEvents)
    .values({ id: event.id, type: event.type })
    .onConflictDoNothing()
    .returning({ id: stripeEvents.id });
  if (!recorded) {
    const existing = await db.query.stripeEvents.findFirst({ where: eq(stripeEvents.id, event.id) });
    if (existing?.processedAt) return "duplicate";
  }

  const session = event.data.object;
  const order =
    event.type === "checkout.session.async_payment_failed"
      ? await failCheckoutPayment(session)
      : await applyCheckoutSession(session);

  if (!order) {
    // Not one of our orders (e.g. another integration on the same Stripe account). Recorded, not retried.
    console.warn(`[stripe] ${event.type} ${event.id}: no order for session ${session.id}`);
  }

  await db
    .update(stripeEvents)
    .set({ orderId: order?.id ?? null, processedAt: sql`now()` })
    .where(eq(stripeEvents.id, event.id));
  return "processed";
}
