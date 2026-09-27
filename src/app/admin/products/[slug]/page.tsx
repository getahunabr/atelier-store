import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { AccountPageHeader } from "@/components/account/account-page-header";
import { ProductForm } from "@/components/admin/product-form";
import { AddSizeForm } from "@/components/admin/add-size-form";
import { StockTable } from "@/components/admin/stock-table";
import { getAdminProduct, listAdminCategories } from "@/db/queries/admin";
import { requireAdmin } from "@/lib/session";

import { updateProductAction } from "../actions";

export async function generateMetadata({ params }: PageProps<"/admin/products/[slug]">): Promise<Metadata> {
  await requireAdmin();
  const product = await getAdminProduct((await params).slug);
  return { title: product ? product.name : "Product not found" };
}

export default async function EditProductPage({ params, searchParams }: PageProps<"/admin/products/[slug]">) {
  await requireAdmin();
  const { slug } = await params;
  const { created } = await searchParams;
  const [product, categories] = await Promise.all([getAdminProduct(slug), listAdminCategories()]);
  if (!product) notFound();

  return (
    <>
      <Link href="/admin/products" className="eyebrow link-reveal inline-flex items-center gap-2 text-ink-muted">
        <span aria-hidden="true">←</span> All products
      </Link>
      <div className="mt-6 flex flex-wrap items-end justify-between gap-6">
        <AccountPageHeader title={product.name} description={product.styleCode} />
        <Link href={`/products/${product.slug}`} className="eyebrow link-reveal" target="_blank" rel="noopener">
          View in store <span aria-hidden="true">↗</span>
        </Link>
      </div>
      {created === "1" && (
        <p role="status" className="mt-8 max-w-3xl border-l-2 border-success bg-success/5 px-4 py-3 text-body-sm">
          Product created and live in the store.
        </p>
      )}

      <section aria-labelledby="availability-title" className="mt-10 max-w-3xl border-t border-line pt-6">
        <h2 id="availability-title" className="eyebrow">
          Availability
        </h2>
        <p className="mt-2 max-w-xl text-caption text-ink-muted">
          <strong className="font-medium text-ink">Available</strong> is how many more customers can buy right now.{" "}
          <strong className="font-medium text-ink">Held</strong> units are reserved by customers checking out — they&apos;re
          already taken out of Available (don&apos;t subtract them again) and go back into it if a checkout doesn&apos;t complete.
        </p>
        <StockTable
          rows={product.stock.map((row) => ({ ...row, productSlug: product.slug, productName: product.name }))}
        />
        <AddSizeForm productSlug={product.slug} />
      </section>

      <ProductForm
        mode="edit"
        action={updateProductAction.bind(null, product.slug)}
        categories={categories}
        initial={{
          name: product.name,
          slug: product.slug,
          category: product.categorySlug,
          price: String(product.priceCents / 100),
          styleCode: product.styleCode,
          releasedAt: product.releasedAt,
          tag: product.tag ?? "",
          description: product.description,
          details: product.details.join("\n"),
          care: product.care.join("\n"),
          images: product.images.map((image) => ({ src: image.src, alt: image.alt })),
          sizes: [],
        }}
      />
    </>
  );
}
