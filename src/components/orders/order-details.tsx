import type { ReactNode } from "react";

import { OrderStatusLabel } from "@/components/orders/order-status";
import { formatDate, formatPrice } from "@/lib/format";
import { countryName } from "@/lib/shipping-countries";
import type { OrderView } from "@/lib/order-types";

const money = (cents: number) => formatPrice(cents / 100);

function paymentLine(order: OrderView) {
  switch (order.status) {
    case "paid":
      return `${money(order.amountPaidCents ?? order.totalCents)} paid${order.paidAt ? ` on ${formatDate(order.paidAt)}` : ""}`;
    case "processing":
      return "Processing with your bank";
    case "needs_review":
      return "Received — under review";
    case "pending_payment":
      return "Awaiting confirmation";
    case "payment_failed":
      return "Payment didn't go through — you weren't charged";
    case "expired":
      return "Checkout not completed — you weren't charged";
  }
}

/**
 * Order facts: number, date, payment, contact, shipping, delivery. `aside` is the bordered side
 * panel beside the items (checkout confirmation); `panel` is a full-width block for narrower
 * content columns (account order page).
 */
export function OrderDetails({ order, contact, variant }: { order: OrderView; contact: string; variant: "aside" | "panel" }) {
  const address = order.shippingAddress;
  const Wrapper = variant === "aside" ? "aside" : "section";
  return (
    <Wrapper
      aria-labelledby="order-details-title"
      className={
        variant === "aside"
          ? "mt-10 border-t border-line pt-8 lg:sticky lg:top-[calc(var(--header-height)+2rem)] lg:mt-8 lg:border lg:p-8"
          : "mt-10 border-t border-line pt-8"
      }
    >
      <h2 id="order-details-title" className="eyebrow">
        Order details
      </h2>
      <dl className={`mt-6 grid gap-5 text-body-sm sm:grid-cols-2 ${variant === "aside" ? "lg:grid-cols-1" : "xl:grid-cols-3"}`}>
        <Detail term="Order number">{order.reference}</Detail>
        <Detail term="Placed">{formatDate(order.createdAt)}</Detail>
        <Detail term="Payment status">
          <OrderStatusLabel status={order.status} />
        </Detail>
        <Detail term="Payment">{paymentLine(order)}</Detail>
        <Detail term="Contact">
          <span className="break-all">{order.email ?? contact}</span>
        </Detail>
        <Detail term="Shipping to">
          {address ? (
            <address className="not-italic">
              {[address.name, address.line1, address.line2, [address.city, address.state, address.postalCode].filter(Boolean).join(", "), countryName(address.country)]
                .filter(Boolean)
                .map((part) => (
                  <span key={part} className="block">
                    {part}
                  </span>
                ))}
            </address>
          ) : (
            <span className="text-ink-muted">Confirmed with your payment</span>
          )}
        </Detail>
      </dl>
    </Wrapper>
  );
}

function Detail({ term, children }: { term: string; children: ReactNode }) {
  return (
    <div>
      <dt className="text-ink-muted">{term}</dt>
      <dd className="mt-1">{children}</dd>
    </div>
  );
}
