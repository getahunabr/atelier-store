import Image from "next/image";
import Link from "next/link";

import type { Img } from "@/lib/catalog-types";

import { StockLevel } from "./stock-level";
import { StockRowForm } from "./stock-row-form";

export type StockTableRow = {
  id: number;
  size: string;
  quantity: number;
  held: number;
  productSlug: string;
  productName: string;
  /** Present on the catalog-wide stock page, where each row names its product. */
  image?: Img;
  categoryName?: string;
};

/**
 * Per-size stock rows with an inline editor each. Used on a product's edit page (sizes only) and on
 * /admin/stock (with a product column). Rows are grid-based rather than a <table> so each row can
 * be its own <form>.
 */
export function StockTable({ rows, showProduct = false }: { rows: StockTableRow[]; showProduct?: boolean }) {
  const columns = showProduct
    ? "md:grid-cols-[minmax(0,2fr)_minmax(0,0.8fr)_minmax(0,1fr)_minmax(0,0.6fr)_minmax(0,1.8fr)]"
    : "md:grid-cols-[minmax(0,0.8fr)_minmax(0,1fr)_minmax(0,0.6fr)_minmax(0,1.8fr)]";

  return (
    <div className="mt-6">
      <div aria-hidden="true" className={`hidden border-b border-line pb-3 text-caption tracking-label text-ink-muted uppercase md:grid md:gap-6 ${columns}`}>
        {showProduct && <span>Product</span>}
        <span>Size</span>
        <span>Status</span>
        <span>Held</span>
        <span>Available</span>
      </div>
      <ul className="divide-y divide-line border-y border-line md:border-t-0">
        {rows.map((row) => (
          <li key={row.id} className={`grid grid-cols-2 gap-x-4 gap-y-3 py-4 md:items-start md:gap-6 ${columns}`}>
            {showProduct && (
              <div className="col-span-2 flex min-w-0 items-center gap-3 md:col-span-1">
                <div className="media-frame aspect-product w-10 shrink-0">
                  {row.image && <Image src={row.image.src} alt="" fill sizes="40px" />}
                </div>
                <div className="min-w-0">
                  <Link href={`/admin/products/${row.productSlug}`} className="link-reveal text-body-sm">
                    {row.productName}
                  </Link>
                  {row.categoryName && <p className="text-caption text-ink-muted">{row.categoryName}</p>}
                </div>
              </div>
            )}
            <div className="md:pt-2">
              <span className="text-caption text-ink-muted md:sr-only">Size </span>
              <span className="text-body-sm">{row.size}</span>
            </div>
            <div className="md:pt-2">
              <StockLevel units={row.quantity} />
            </div>
            <div className="md:pt-2">
              <span className="text-caption text-ink-muted md:sr-only">Held </span>
              <span className={`text-body-sm ${row.held ? "text-ink" : "text-ink-muted"}`}>{row.held}</span>
            </div>
            <div className="col-span-2 md:col-span-1">
              <StockRowForm
                productSlug={row.productSlug}
                productName={row.productName}
                stockId={row.id}
                size={row.size}
                quantity={row.quantity}
              />
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
