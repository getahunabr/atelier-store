import type { Metadata } from "next";

import { AccountPageHeader } from "@/components/account/account-page-header";
import { requireAdmin } from "@/lib/session";

export const metadata: Metadata = { title: "Orders" };

// Route reserved for the admin order list (next step). Protected like every admin page.
export default async function AdminOrdersPage() {
  await requireAdmin();
  return (
    <>
      <AccountPageHeader title="Orders" description="Reviewing customer orders comes in the next step." />
      <p className="mt-10 border-t border-line pt-6 text-body-sm text-ink-muted">
        Customers can already see their own orders under My account → Orders.
      </p>
    </>
  );
}
