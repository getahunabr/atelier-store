import Stripe from "stripe";

import { handleStripeEvent } from "@/lib/stripe-webhook";

// POST /api/webhooks/stripe — Stripe → us. Nothing is trusted until the Stripe-Signature header
// verifies against STRIPE_WEBHOOK_SECRET over the exact raw body; unverified requests get 400 and
// change nothing. No session or cookies are involved (and proxy.ts doesn't match this path).
export async function POST(request: Request) {
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!secret) {
    console.error("[stripe] STRIPE_WEBHOOK_SECRET is not set; rejecting webhook.");
    return Response.json({ error: "Webhook not configured." }, { status: 503 });
  }

  const signature = request.headers.get("stripe-signature");
  if (!signature) return Response.json({ error: "Missing signature." }, { status: 400 });

  // The raw body, byte for byte: re-serialised JSON would not match the signature.
  const payload = await request.text();

  let event: Stripe.Event;
  try {
    // Verifying needs no API key, only the endpoint's signing secret. Default 5-minute tolerance
    // rejects replayed deliveries.
    event = Stripe.webhooks.constructEvent(payload, signature, secret);
  } catch {
    return Response.json({ error: "Invalid signature." }, { status: 400 });
  }

  try {
    const outcome = await handleStripeEvent(event);
    return Response.json({ received: true, outcome });
  } catch (error) {
    // 5xx → Stripe retries with backoff; handling is idempotent.
    console.error(`[stripe] failed to process ${event.type} ${event.id}:`, (error as Error).message);
    return Response.json({ error: "Processing failed." }, { status: 500 });
  }
}
