import Link from "next/link";

import type { OrderStatus } from "@/lib/order-types";

type Tone = "success" | "neutral" | "critical";

const STATE: Record<OrderStatus, { title: string; message: string; tone: Tone; retry?: boolean }> = {
  paid: {
    title: "Payment confirmed",
    message: "Your order is being prepared for delivery.",
    tone: "success",
  },
  processing: {
    title: "Payment processing",
    message: "Your pieces are held for you. We'll confirm the order as soon as your bank completes the payment.",
    tone: "neutral",
  },
  needs_review: {
    title: "We're reviewing your order",
    message: "Your payment was received, but we need to check a detail before confirming. We'll be in touch shortly.",
    tone: "neutral",
  },
  pending_payment: {
    title: "Awaiting payment confirmation",
    message: "We're waiting for our payment provider to confirm. You won't be charged twice.",
    tone: "neutral",
  },
  payment_failed: {
    title: "Payment didn't go through",
    message: "You haven't been charged, and this order won't be shipped.",
    tone: "critical",
    retry: true,
  },
  expired: {
    title: "Checkout not completed",
    message: "You haven't been charged, and this order won't be shipped.",
    tone: "critical",
    retry: true,
  },
};

const TONE: Record<Tone, string> = {
  success: "border-success bg-success/5",
  neutral: "border-ink/40 bg-surface",
  critical: "border-critical bg-critical/5",
};

/** What the order's current state means for the customer, in the site's notice style. */
export function OrderStateNotice({ status }: { status: OrderStatus }) {
  const state = STATE[status];
  return (
    <div className={`border-l-2 px-4 py-3 text-body-sm ${TONE[state.tone]}`} data-testid="order-state">
      <p className="font-medium">{state.title}</p>
      <p className="mt-1 text-ink-muted">
        {state.message}
        {state.retry && (
          <>
            {" "}
            <Link href="/bag" className="link text-ink">
              Go to your bag
            </Link>{" "}
            to try again.
          </>
        )}
      </p>
    </div>
  );
}
