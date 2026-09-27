import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { cache } from "react";

import { AccountPageHeader } from "@/components/account/account-page-header";
import { PaymentPoller } from "@/components/checkout/payment-poller";
import { OrderDetails } from "@/components/orders/order-details";
import { OrderItems } from "@/components/orders/order-items";
import { OrderProgress, orderProgressSteps } from "@/components/orders/order-progress";
import { OrderStateNotice } from "@/components/orders/order-state-notice";
import { paymentStatusLabel } from "@/components/orders/order-status";
import { getCustomerOrder } from "@/db/queries/orders";
import { syncCustomerOrder } from "@/lib/checkout";
import { formatDate } from "@/lib/format";
import { requireSession } from "@/lib/session";
import { getStripe, isStripeConfigured } from "@/lib/stripe";

/**
 * The signed-in customer's order, or null (not found, or someone else's — getCustomerOrder filters
 * by user id in SQL, so the two are indistinguishable). An unsettled order is first checked with
 * Stripe so a late webhook doesn't leave it showing a stale state. Once per request.
 */
const loadOrder = cache(async (orderId: string) => {
  const { user } = await requireSession();
  if (isStripeConfigured()) {
    await syncCustomerOrder(orderId, user.id, getStripe()).catch((error: Error) =>
      // Stripe unreachable: show the stored state; webhooks will catch it up.
      console.error("[orders] syncing order with Stripe failed:", error.message),
    );
  }
  const order = await getCustomerOrder(user.id, orderId);
  return order ? { order, user } : null;
});

export async function generateMetadata({ params }: PageProps<"/account/orders/[orderId]">): Promise<Metadata> {
  const found = await loadOrder((await params).orderId);
  return { title: found ? `Order ${found.order.reference}` : "Order not found", robots: { index: false } };
}

export default async function OrderPage({ params }: PageProps<"/account/orders/[orderId]">) {
  const found = await loadOrder((await params).orderId);
  if (!found) notFound();
  const { order, user } = found;
  const steps = orderProgressSteps(order.status);

  return (
    <>
      <Link href="/account/orders" className="eyebrow link-reveal inline-flex items-center gap-2 text-ink-muted">
        <span aria-hidden="true">←</span> All orders
      </Link>
      <div className="mt-6">
        <AccountPageHeader
          title={`Order ${order.reference}`}
          description={`Placed ${formatDate(order.createdAt)} · ${paymentStatusLabel(order.status)}`}
        />
      </div>

      {/* Current state; announced if it changes while the page is open (PaymentPoller). */}
      <section aria-labelledby="order-state-title" aria-live="polite" className="mt-10">
        <h2 id="order-state-title" className="sr-only">
          Order status
        </h2>
        <div className="max-w-2xl">
          <OrderStateNotice status={order.status} />
        </div>
        {steps && (
          <div className="mt-10 max-w-xl">
            <OrderProgress steps={steps} />
          </div>
        )}
      </section>
      {order.status === "pending_payment" && (
        <div className="mt-8 max-w-xl">
          <PaymentPoller />
        </div>
      )}

      <div className="mt-10 border-t border-line">
        <OrderItems order={order} />
      </div>
      <OrderDetails order={order} contact={user.email} variant="panel" />
    </>
  );
}
