import "server-only";

import Stripe from "stripe";

// Server-side Stripe client. Use a restricted key (rk_…) with only the permissions checkout needs
// (Checkout Sessions: write); never a full secret key, and never expose it to the browser.
// The SDK pins API version 2026-08-26.dahlia.

let client: Stripe | null = null;

export class StripeNotConfiguredError extends Error {
  constructor() {
    super("STRIPE_SECRET_KEY is not set.");
    this.name = "StripeNotConfiguredError";
  }
}

export function isStripeConfigured() {
  return Boolean(process.env.STRIPE_SECRET_KEY);
}

/** The shared client, created on first use so the rest of the app runs without Stripe configured. */
export function getStripe(): Stripe {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) throw new StripeNotConfiguredError();
  client ??= new Stripe(key, { appInfo: { name: "atelier-store" } });
  return client;
}

/** The subset of the Stripe client checkout uses — lets tests pass a stand-in. */
export type CheckoutStripe = {
  checkout: { sessions: Pick<Stripe["checkout"]["sessions"], "create" | "retrieve" | "expire"> };
};
