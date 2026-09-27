import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";

import { AccountPageHeader } from "@/components/account/account-page-header";
import { listAdminCategories, listAdminProducts } from "@/db/queries/admin";
import { formatPrice } from "@/lib/format";
import { requireAdmin } from "@/lib/session";

export const metadata: Metadata = { title: "Products" };

const columns = "md:grid-cols-[2.5rem_minmax(0,2fr)_minmax(0,1fr)_minmax(0,1fr)_minmax(0,1.2fr)]";

function availability(product: { unitsInStock: number; sizes: number; soldOutSizes: number }) {
  if (product.unitsInStock === 0) return { label: "Sold out", tone: "text-critical" };
  if (product.soldOutSizes > 0) return { label: `${product.unitsInStock} in stock · ${product.soldOutSizes} of ${product.sizes} sizes sold out`, tone: "text-ink" };
  return { label: `${product.unitsInStock} in stock`, tone: "text-ink" };
}

export default async function AdminProductsPage({ searchParams }: PageProps<"/admin/products">) {
  await requireAdmin();
  const { category } = await searchParams;
  const categories = await listAdminCategories();
  const active = typeof category === "string" && categories.some((c) => c.slug === category) ? category : undefined;
  const products = await listAdminProducts(active);

  return (
    <>
      <div className="flex flex-wrap items-end justify-between gap-6">
        <AccountPageHeader title="Products" description="Everything in the catalog, in storefront order." />
        <Link href="/admin/products/new" className="btn btn-primary">
          New product
        </Link>
      </div>

      <nav aria-label="Filter by category" className="mt-8 flex flex-wrap gap-x-6 gap-y-2 text-label tracking-nav uppercase">
        {[{ slug: undefined, name: "All" }, ...categories].map((c) => (
          <Link
            key={c.slug ?? "all"}
            href={c.slug ? `/admin/products?category=${c.slug}` : "/admin/products"}
            aria-current={c.slug === active ? "page" : undefined}
            className="link-reveal text-ink-muted hover:text-ink aria-[current=page]:text-ink"
          >
            {c.name}
          </Link>
        ))}
      </nav>

      <div className="mt-8">
        <div aria-hidden="true" className={`hidden border-b border-line pb-3 text-caption tracking-label text-ink-muted uppercase md:grid md:gap-6 ${columns}`}>
          <span />
          <span>Product</span>
          <span>Category</span>
          <span>Price</span>
          <span>Availability</span>
        </div>
        {products.length === 0 ? (
          <p className="border-b border-line py-10 text-body-sm text-ink-muted">No products in this category yet.</p>
        ) : (
          <ul className="divide-y divide-line border-y border-line md:border-t-0">
            {products.map((product) => {
              const status = availability(product);
              return (
                <li key={product.slug} className="relative py-4 transition-colors hover:bg-surface/60">
                  <div className={`grid grid-cols-[2.5rem_minmax(0,1fr)] gap-x-4 gap-y-2 md:items-center md:gap-6 ${columns}`}>
                    <div className="media-frame aspect-product w-10 md:row-span-1">
                      {product.image && <Image src={product.image.src} alt="" fill sizes="40px" />}
                    </div>
                    <div className="min-w-0">
                      <h2 className="text-body-sm">
                        <Link href={`/admin/products/${product.slug}`} className="link-reveal after:absolute after:inset-0 after:content-['']">
                          {product.name}
                        </Link>
                      </h2>
                      <p className="mt-1 text-caption text-ink-muted">{product.styleCode}</p>
                    </div>
                    <dl className="col-span-2 grid grid-cols-3 gap-4 text-body-sm md:contents">
                      <div>
                        <dt className="text-caption text-ink-muted md:sr-only">Category</dt>
                        <dd>{product.category.name}</dd>
                      </div>
                      <div>
                        <dt className="text-caption text-ink-muted md:sr-only">Price</dt>
                        <dd>{formatPrice(product.priceCents / 100)}</dd>
                      </div>
                      <div>
                        <dt className="text-caption text-ink-muted md:sr-only">Availability</dt>
                        <dd className={status.tone}>{status.label}</dd>
                      </div>
                    </dl>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </>
  );
}
