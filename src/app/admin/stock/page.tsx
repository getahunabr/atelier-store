import type { Metadata } from "next";
import Link from "next/link";

import { AccountPageHeader } from "@/components/account/account-page-header";
import { StockTable } from "@/components/admin/stock-table";
import { listAdminCategories, listAdminStock, type StockFilter } from "@/db/queries/admin";
import { LOW_STOCK_THRESHOLD } from "@/lib/stock";
import { requireAdmin } from "@/lib/session";

export const metadata: Metadata = { title: "Stock" };

const FILTERS: { value: StockFilter; label: string }[] = [
  { value: "all", label: "All sizes" },
  { value: "low", label: `Low (${LOW_STOCK_THRESHOLD} or fewer)` },
  { value: "sold-out", label: "Sold out" },
];

export default async function AdminStockPage({ searchParams }: PageProps<"/admin/stock">) {
  await requireAdmin();
  const params = await searchParams;
  const filter = FILTERS.some((f) => f.value === params.filter) ? (params.filter as StockFilter) : "all";
  const categories = await listAdminCategories();
  const category = typeof params.category === "string" && categories.some((c) => c.slug === params.category) ? params.category : undefined;
  const rows = await listAdminStock(filter, category);

  const href = (next: { filter?: StockFilter; category?: string }) => {
    const query = new URLSearchParams();
    const f = next.filter ?? filter;
    const c = "category" in next ? next.category : category;
    if (f !== "all") query.set("filter", f);
    if (c) query.set("category", c);
    const qs = query.toString();
    return qs ? `/admin/stock?${qs}` : "/admin/stock";
  };

  return (
    <>
      <AccountPageHeader
        title="Stock"
        description="Units customers can buy now, per size. Held units are reserved by open checkouts and already excluded."
      />

      <div className="mt-8 flex flex-col gap-3">
        <nav aria-label="Filter by stock level" className="flex flex-wrap gap-x-6 gap-y-2 text-label tracking-nav uppercase">
          {FILTERS.map((f) => (
            <Link
              key={f.value}
              href={href({ filter: f.value })}
              aria-current={f.value === filter ? "page" : undefined}
              className="link-reveal text-ink-muted hover:text-ink aria-[current=page]:text-ink"
            >
              {f.label}
            </Link>
          ))}
        </nav>
        <nav aria-label="Filter by category" className="flex flex-wrap gap-x-5 gap-y-2 text-caption tracking-label uppercase">
          {[{ slug: undefined, name: "All categories" }, ...categories].map((c) => (
            <Link
              key={c.slug ?? "all"}
              href={href({ category: c.slug })}
              aria-current={c.slug === category ? "page" : undefined}
              className="link-reveal text-ink-muted hover:text-ink aria-[current=page]:text-ink"
            >
              {c.name}
            </Link>
          ))}
        </nav>
      </div>

      {rows.length === 0 ? (
        <p className="mt-8 border-y border-line py-10 text-body-sm text-ink-muted">
          {filter === "sold-out" ? "Nothing is sold out." : filter === "low" ? "No sizes are running low." : "No sizes match."}
        </p>
      ) : (
        <StockTable
          showProduct
          rows={rows.map((r) => ({
            id: r.id,
            size: r.size,
            quantity: r.quantity,
            held: r.held,
            productSlug: r.product.slug,
            productName: r.product.name,
            image: r.product.image,
            categoryName: r.category.name,
          }))}
        />
      )}
    </>
  );
}
