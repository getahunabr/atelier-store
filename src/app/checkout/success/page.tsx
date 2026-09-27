import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import type { ReactNode } from "react";

import { ClearPurchased } from "@/components/checkout/clear-purchased";
import { PaymentPoller } from "@/components/checkout/payment-poller";
import { OrderDetails } from "@/components/orders/order-details";
import { OrderItems } from "@/components/orders/order-items";
import { OrderProgress, orderProgressSteps } from "@/components/orders/order-progress";
import { toOrderView } from "@/db/queries/orders";
import { confirmOrder } from "@/lib/checkout";
import { orderHref, type OrderView } from "@/lib/order-types";
import { requireSession } from "@/lib/session";
import { getStripe, isStripeConfigured } from "@/lib/stripe";

export const metadata: Metadata = { title: "Order confirmation", robots: { index: false } };

const SESSION_ID = /^cs_(test|live)_[A-Za-z0-9]{1,200}$/;
type OpenStatus = "pending_payment" | "processing" | "paid" | "needs_review";

// Stripe's success_url. Reaching this page proves nothing: the order's state comes from our
// database (kept current by the Stripe webhook), and if it isn't settled yet we ask Stripe's API
// directly, server-side. Only an order Stripe reports as paid is shown as confirmed; while it's
// pending, PaymentPoller re-renders this page until the state changes.
export default async function CheckoutSuccessPage({ searchParams }: PageProps<"/checkout/success">) {
  const { user } = await requireSession();
  const { session_id: sessionId } = await searchParams;
  if (typeof sessionId !== "string" || !SESSION_ID.test(sessionId)) notFound();

  let row: Awaited<ReturnType<typeof confirmOrder>>;
  try {
    row = await confirmOrder(sessionId, user.id, isStripeConfigured() ? getStripe() : null);
  } catch (error) {
    // Stripe unreachable: show what we know; the page keeps re-checking while it's pending.
    console.error("[checkout] confirming order failed:", (error as Error).message);
    row = await confirmOrder(sessionId, user.id, null);
  }
  if (!row) notFound();

  const order: OrderView = toOrderView(row);
  const { reference } = order;
  const firstName = user.name.split(" ")[0] || user.name;

  if (order.status === "expired" || order.status === "payment_failed") {
    return (
      <Page>
        <Header eyebrow={`Order ${reference}`} title="Payment not completed">
          <p>
            {order.status === "payment_failed"
              ? "Your payment didn't go through, so you haven't been charged."
              : "This checkout timed out before payment, so you haven't been charged."}{" "}
            Your pieces are still in your bag — we&apos;ll re-check prices and availability when you try again.
          </p>
        </Header>
        <div className="mt-10 flex justify-center">
          <Link href="/bag" className="btn btn-primary">
            Return to bag
          </Link>
        </div>
      </Page>
    );
  }

  const status = order.status as OpenStatus;
  const copy = STATUS_COPY[status](firstName);

  return (
    <Page>
      {status === "paid" && <ClearPurchased items={order.items.map((item) => ({ slug: item.slug, size: item.size }))} />}
      {/* Announced when a pending order is confirmed while the customer waits. */}
      <div aria-live="polite">
        <Header eyebrow={`Order ${reference}`} title={copy.title}>
          <p>{copy.message}</p>
        </Header>
        <div className="mx-auto mt-10 max-w-xl">
          <OrderProgress steps={orderProgressSteps(status)!} />
        </div>
      </div>
      {status === "pending_payment" && (
        <div className="mt-8">
          <PaymentPoller />
        </div>
      )}

      <div className="mt-12 border-t border-line lg:grid lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)] lg:items-start lg:gap-x-16">
        <OrderItems order={order} />
        <OrderDetails order={order} contact={user.email} variant="aside" />
      </div>

      <div className="mt-12 flex flex-col items-center gap-5 sm:flex-row sm:justify-center sm:gap-8">
        <Link href="/new-in" className="btn btn-primary">
          Continue shopping
        </Link>
        <Link href={orderHref(order.publicId)} className="eyebrow link-reveal">
          View in your orders
        </Link>
      </div>
    </Page>
  );
}

const STATUS_COPY: Record<OpenStatus, (firstName: string) => { title: string; message: string }> = {
  pending_payment: () => ({
    title: "Confirming your payment",
    message: "Your order is placed and your pieces are held. We're waiting for our payment provider to confirm — this usually takes a few seconds, and you won't be charged twice.",
  }),
  processing: () => ({
    title: "Your payment is processing",
    message: "Your order is placed and your pieces are held. We'll confirm it as soon as your bank completes the payment.",
  }),
  paid: (firstName) => ({
    title: `Thank you, ${firstName}`,
    message: "Your payment is confirmed and your order is being prepared.",
  }),
  needs_review: () => ({
    title: "We're reviewing your order",
    message: "Your payment was received, but we need to check a detail before confirming. We'll be in touch shortly.",
  }),
};


function Page({ children }: { children: ReactNode }) {
  return (
    <div className="container-page section-y">
      <div className="mx-auto max-w-5xl">{children}</div>
    </div>
  );
}

function Header({ eyebrow, title, children }: { eyebrow: string; title: string; children: ReactNode }) {
  return (
    <header className="mx-auto max-w-2xl text-center">
      <p className="eyebrow text-ink-muted">{eyebrow}</p>
      <h1 className="mt-4 font-serif text-heading">{title}</h1>
      <div className="mt-4 text-body-sm text-ink-muted">{children}</div>
    </header>
  );
}
