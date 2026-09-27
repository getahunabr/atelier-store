import { NextResponse } from "next/server";

import { cancelCheckout } from "@/lib/checkout";
import { getSession } from "@/lib/session";
import { getStripe, isStripeConfigured } from "@/lib/stripe";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// GET /checkout/cancel?order=<public id> — Stripe's cancel_url. Ends the Checkout Session so it
// can't be paid later, returns the reserved stock and sends the customer back to their bag (which
// still holds everything). Only the order's owner can cancel it.
export async function GET(request: Request) {
  const url = new URL(request.url);
  const bag = new URL("/bag", url.origin);
  const orderId = url.searchParams.get("order") ?? "";

  const session = await getSession();
  if (session && UUID.test(orderId) && isStripeConfigured()) {
    try {
      const result = await cancelCheckout(orderId, session.user.id, getStripe());
      // Paid after all (e.g. the customer paid, then used the back button): show the confirmation.
      if (result?.sessionId && result.status !== "pending_payment" && result.status !== "expired") {
        const success = new URL("/checkout/success", url.origin);
        success.searchParams.set("session_id", result.sessionId);
        return NextResponse.redirect(success, { status: 303 });
      }
    } catch (error) {
      // The reservation still lapses on its own when the Stripe session expires.
      console.error("[checkout] cancel failed:", (error as Error).message);
    }
  }

  bag.searchParams.set("checkout", "canceled");
  return NextResponse.redirect(bag, { status: 303 });
}
