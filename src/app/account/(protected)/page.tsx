import type { Metadata } from "next";
import Link from "next/link";
import type { ReactNode } from "react";

import { AccountPageHeader } from "@/components/account/account-page-header";
import { BagSummaryLink } from "@/components/cart/bag-summary-link";
import { OrderStatusLabel } from "@/components/orders/order-status";
import { listCustomerOrders } from "@/db/queries/orders";
import { formatDate, formatPrice, memberSince } from "@/lib/format";
import { orderHref } from "@/lib/order-types";
import { requireSession } from "@/lib/session";

export const metadata: Metadata = { title: "My account", robots: { index: false } };

function Panel({ id, title, children, className = "" }: { id: string; title: string; children: ReactNode; className?: string }) {
  return (
    <section aria-labelledby={id} className={`border-t border-line pt-6 ${className}`}>
      <h2 id={id} className="eyebrow">
        {title}
      </h2>
      <div className="mt-4">{children}</div>
    </section>
  );
}

export default async function AccountOverviewPage() {
  // Pages can render before their layout finishes, so each protected page checks too (deduped per request).
  const { user } = await requireSession();
  const firstName = user.name.split(" ")[0] || user.name;
  const [latest] = await listCustomerOrders(user.id);

  return (
    <>
      <AccountPageHeader title={`Welcome back, ${firstName}`} description="Your orders, details and bag, in one place." />
      <div className="mt-10 grid gap-10 md:grid-cols-2 md:gap-8">
        <Panel id="orders-title" title="Latest order" className="md:col-span-2">
          {latest ? (
            <>
              <dl className="grid grid-cols-2 gap-4 text-body-sm sm:grid-cols-4">
                <div>
                  <dt className="text-ink-muted">Order</dt>
                  <dd>
                    <Link href={orderHref(latest.publicId)} className="link-reveal">
                      {latest.reference}
                    </Link>
                  </dd>
                </div>
                <div>
                  <dt className="text-ink-muted">Placed</dt>
                  <dd>{formatDate(latest.createdAt)}</dd>
                </div>
                <div>
                  <dt className="text-ink-muted">Payment</dt>
                  <dd>
                    <OrderStatusLabel status={latest.status} />
                  </dd>
                </div>
                <div>
                  <dt className="text-ink-muted">Total</dt>
                  <dd>{formatPrice(latest.totalCents / 100)}</dd>
                </div>
              </dl>
              <Link href="/account/orders" className="eyebrow link-reveal mt-6 inline-block">
                View all orders
              </Link>
            </>
          ) : (
            <>
              <p className="text-body-sm text-ink-muted">You haven&apos;t placed any orders yet.</p>
              <Link href="/new-in" className="eyebrow link-reveal mt-6 inline-block">
                Shop new arrivals
              </Link>
            </>
          )}
        </Panel>
        <Panel id="details-title" title="Account details">
          <dl className="space-y-3 text-body-sm">
            <div>
              <dt className="text-ink-muted">Name</dt>
              <dd>{user.name}</dd>
            </div>
            <div>
              <dt className="text-ink-muted">Email</dt>
              <dd className="break-all">{user.email}</dd>
            </div>
            <div>
              <dt className="text-ink-muted">Member since</dt>
              <dd>{memberSince(user.createdAt)}</dd>
            </div>
          </dl>
          <Link href="/account/details" className="eyebrow link-reveal mt-6 inline-block">
            Edit details
          </Link>
        </Panel>

        <Panel id="bag-title" title="Shopping bag">
          <BagSummaryLink />
        </Panel>
      </div>
    </>
  );
}
