import type { Metadata } from "next";

import { AccountPageHeader } from "@/components/account/account-page-header";
import { RefreshStorefrontForm } from "@/components/admin/refresh-storefront-form";
import { getAdminOverview } from "@/db/queries/admin";
import { requireAdmin } from "@/lib/session";

export const metadata: Metadata = { title: "Overview" };

export default async function AdminPage() {
  // Checked again here: pages can render in parallel with their layout.
  await requireAdmin();
  const overview = await getAdminOverview();

  const stats = [
    { label: "Categories", value: overview.categories },
    { label: "Products", value: overview.products },
    { label: "Units in stock", value: overview.unitsInStock },
    { label: "Accounts", value: overview.accounts },
    { label: "Admins", value: overview.admins },
  ];

  return (
    <>
      <AccountPageHeader title="Overview" description="Manage the catalog and review orders." />
      <section aria-labelledby="overview-title" className="mt-10 border-t border-line pt-6">
        <h2 id="overview-title" className="eyebrow">
          Store
        </h2>
        <dl className="mt-6 grid grid-cols-2 gap-x-8 gap-y-6 md:grid-cols-5">
          {stats.map((stat) => (
            <div key={stat.label}>
              <dt className="text-body-sm text-ink-muted">{stat.label}</dt>
              <dd className="mt-1 font-serif text-heading">{stat.value.toLocaleString("en-US")}</dd>
            </div>
          ))}
        </dl>
      </section>

      <section aria-labelledby="storefront-title" className="mt-12 border-t border-line pt-6">
        <h2 id="storefront-title" className="eyebrow">
          Storefront cache
        </h2>
        <p className="mt-3 max-w-lg text-body-sm text-ink-muted">
          Product changes made here publish immediately. Changes made directly in the database appear within 5 minutes,
          or refresh now.
        </p>
        <div className="mt-6">
          <RefreshStorefrontForm />
        </div>
      </section>
    </>
  );
}
