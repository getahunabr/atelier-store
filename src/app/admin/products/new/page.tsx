import type { Metadata } from "next";
import Link from "next/link";

import { AccountPageHeader } from "@/components/account/account-page-header";
import { ProductForm } from "@/components/admin/product-form";
import { listAdminCategories } from "@/db/queries/admin";
import { ONE_SIZE } from "@/lib/catalog-types";
import { requireAdmin } from "@/lib/session";

import { createProductAction } from "../actions";

export const metadata: Metadata = { title: "New product" };

export default async function NewProductPage() {
  await requireAdmin();
  const categories = await listAdminCategories();
  const today = new Date().toISOString().slice(0, 10);

  return (
    <>
      <Link href="/admin/products" className="eyebrow link-reveal inline-flex items-center gap-2 text-ink-muted">
        <span aria-hidden="true">←</span> All products
      </Link>
      <div className="mt-6">
        <AccountPageHeader title="New product" description="It goes live in the store as soon as it's created." />
      </div>
      <ProductForm
        mode="create"
        action={createProductAction}
        categories={categories}
        initial={{
          name: "",
          slug: "",
          category: "",
          price: "",
          styleCode: "",
          releasedAt: today,
          tag: "New",
          description: "",
          details: "",
          care: "",
          images: [{ src: "", alt: "" }],
          sizes: [{ size: ONE_SIZE, quantity: "0" }],
        }}
      />
    </>
  );
}
