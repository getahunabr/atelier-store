import Image from "next/image";
import Link from "next/link";

import { ArrowIcon } from "@/components/icons";
import { OrderStatusLabel } from "@/components/orders/order-status";
import { formatDate, formatPrice } from "@/lib/format";
import { orderHref, type OrderListItem } from "@/lib/order-types";

// Columns on md+: image · order · date · payment status · total · arrow.
const columns = "md:grid-cols-[2.5rem_minmax(0,1.6fr)_repeat(3,minmax(0,1fr))_1.25rem]";

/**
 * The customer's orders as rows. Each row is one link (the order reference, stretched over the
 * row) so the whole row is clickable but announced once. On small screens each value carries its
 * own label; from md up a column header row replaces them.
 */
export function OrderHistory({ orders }: { orders: OrderListItem[] }) {
  return (
    <div className="mt-10">
      <div
        aria-hidden="true"
        className={`hidden border-b border-line px-2 pb-3 text-caption tracking-label text-ink-muted uppercase md:grid md:gap-6 ${columns}`}
      >
        <span />
        <span>Order</span>
        <span>Date</span>
        <span>Payment</span>
        <span>Total</span>
        <span />
      </div>
      <ul className="divide-y divide-line border-y border-line md:border-t-0">
        {orders.map((order) => (
          <li key={order.publicId} className="group relative py-6 transition-colors hover:bg-surface/60 md:px-2">
            <div className={`grid gap-4 md:items-center md:gap-6 ${columns}`}>
              <div className="flex gap-1">
                {/* Up to three on small screens; one from md up (the summary names the rest). */}
                {order.images.map((image, i) => (
                  <div key={image.src} className={`media-frame aspect-product w-10 shrink-0 ${i > 0 ? "md:hidden" : ""}`}>
                    <Image src={image.src} alt="" fill sizes="40px" />
                  </div>
                ))}
              </div>

              <div className="min-w-0">
                <h2 className="text-body-sm">
                  <Link
                    href={orderHref(order.publicId)}
                    className="link-reveal after:absolute after:inset-0 after:content-['']"
                  >
                    Order {order.reference}
                  </Link>
                </h2>
                <p className="mt-1 truncate text-body-sm text-ink-muted">
                  {order.summary}
                  {" · "}
                  {order.itemCount === 1 ? "1 item" : `${order.itemCount} items`}
                </p>
              </div>

              <dl className="grid grid-cols-3 gap-4 text-body-sm md:contents">
                <div>
                  <dt className="text-caption text-ink-muted md:sr-only">Date</dt>
                  <dd className="mt-1 md:mt-0">
                    <time dateTime={order.createdAt.toISOString()}>{formatDate(order.createdAt)}</time>
                  </dd>
                </div>
                <div>
                  <dt className="text-caption text-ink-muted md:sr-only">Payment</dt>
                  <dd className="mt-1 md:mt-0">
                    <OrderStatusLabel status={order.status} />
                  </dd>
                </div>
                <div>
                  <dt className="text-caption text-ink-muted md:sr-only">Total</dt>
                  <dd className="mt-1 md:mt-0">{formatPrice(order.totalCents / 100)}</dd>
                </div>
              </dl>

              <ArrowIcon
                className="hidden size-5 text-ink-muted transition-transform group-hover:translate-x-0.5 group-hover:text-ink md:block"
              />
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
