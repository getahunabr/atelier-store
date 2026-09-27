import type { Metadata } from "next";
import Link from "next/link";

import { AccountPageHeader } from "@/components/account/account-page-header";
import { OrderHistory } from "@/components/orders/order-history";
import { listCustomerOrders } from "@/db/queries/orders";
import { requireSession } from "@/lib/session";

export const metadata: Metadata = { title: "Orders", robots: { index: false } };

export default async function OrdersPage() {
  // Pages can render before their layout finishes, so each protected page checks too.
  const { user } = await requireSession();
  const orders = await listCustomerOrders(user.id);

  return (
    <>
      <AccountPageHeader title="Orders" description="Every order you've placed, with its payment status and details." />
      {orders.length === 0 ? (
        <div className="mt-10 border-t border-line pt-10">
          <h2 className="font-serif text-title">No orders yet</h2>
          <p className="mt-3 text-body-sm text-ink-muted">When you place an order, it will appear here.</p>
          <Link href="/new-in" className="btn btn-primary mt-8">
            Shop new arrivals
          </Link>
        </div>
      ) : (
        <OrderHistory orders={orders} />
      )}
    </>
  );
}
