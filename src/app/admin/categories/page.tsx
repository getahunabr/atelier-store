import type { Metadata } from "next";
import Link from "next/link";

import { AccountPageHeader } from "@/components/account/account-page-header";
import { listAdminCategories } from "@/db/queries/admin";
import { requireAdmin } from "@/lib/session";

export const metadata: Metadata = { title: "Categories" };

export default async function AdminCategoriesPage() {
  await requireAdmin();
  const categories = await listAdminCategories();

  return (
    <>
      <AccountPageHeader title="Categories" description="Categories group products on the storefront. Editing them comes in a later step." />
      <ul className="mt-10 divide-y divide-line border-y border-line">
        {categories.map((category) => (
          <li key={category.slug} className="flex flex-wrap items-center justify-between gap-x-6 gap-y-1 py-4 text-body-sm">
            <div>
              <p>{category.name}</p>
              <p className="text-caption text-ink-muted">/{category.slug}</p>
            </div>
            <Link href={`/admin/products?category=${category.slug}`} className="eyebrow link-reveal">
              {category.productCount === 1 ? "1 product" : `${category.productCount} products`}
            </Link>
          </li>
        ))}
      </ul>
    </>
  );
}
