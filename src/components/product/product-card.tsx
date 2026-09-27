import Image from "next/image";
import Link from "next/link";

import type { Product } from "@/lib/catalog-types";
import { formatPrice } from "@/lib/format";
import { stockState, totalStock } from "@/lib/stock";

type ProductCardProps = {
  product: Product;
  /** Responsive `sizes` hint; defaults to the product-grid column widths. */
  sizes?: string;
  /**
   * "feature" is the large lead tile of an editorial grid: its image stretches to fill the grid
   * area on desktop (the parent spans two rows) instead of keeping a fixed ratio.
   */
  variant?: "default" | "feature";
};

export function ProductCard({ product, sizes = "(min-width: 64rem) 25vw, 50vw", variant = "default" }: ProductCardProps) {
  // Availability across all sizes (sold-out sizes add 0), same thresholds as the product page.
  const units = totalStock(product);
  const state = stockState(units);
  const soldOut = state === "out_of_stock";
  const lowStock = state === "low_stock";
  const tag = soldOut ? "Sold out" : product.tag;
  const [image, alternate] = product.images;
  const feature = variant === "feature";
  const imageClass = `transition-[transform,opacity] duration-700 ease-luxe group-hover:scale-[1.03] ${soldOut ? "opacity-60" : ""}`;

  return (
    <article className={`group relative ${feature ? "flex h-full flex-col" : ""}`}>
      {/* Feature tile: portrait on phones, landscape where the grid is still 2 columns wide (tablet)
          so it doesn't fill the screen, then it fills its 2×2 area on desktop. */}
      <div
        className={`media-frame aspect-product ${feature ? "md:aspect-landscape lg:aspect-auto lg:min-h-[28rem] lg:flex-1" : ""}`}
      >
        <Image src={image.src} alt={image.alt} fill sizes={sizes} className={imageClass} />
        {/* Second view fades in on hover (hover-capable devices only; Tailwind's hover: is media-gated). */}
        {alternate && (
          <Image
            src={alternate.src}
            alt=""
            aria-hidden="true"
            fill
            sizes={sizes}
            className={`${imageClass} opacity-0 group-hover:opacity-100`}
          />
        )}
        {tag && (
          <span className="absolute top-3 left-3 bg-canvas px-2 py-1 text-caption font-medium tracking-label uppercase">
            {tag}
          </span>
        )}
      </div>
      <div className="mt-3 flex flex-col gap-1 md:mt-4">
        <h3 className={feature ? "text-body" : "text-body-sm"}>
          {/* Stretched link: the whole card is clickable, but only the name is announced. */}
          <Link href={`/products/${product.slug}`} className="after:absolute after:inset-0">
            {product.name}
            {/* The visual tag / note isn't part of the link's name; announce availability with it. */}
            {soldOut && <span className="sr-only">, sold out</span>}
            {lowStock && <span className="sr-only">, only {units} left</span>}
          </Link>
        </h3>
        <p className={`${feature ? "text-body" : "text-body-sm"} text-ink-muted`}>{formatPrice(product.price)}</p>
        {lowStock && (
          <p aria-hidden="true" className="flex items-center gap-2 text-caption text-critical">
            <span className="size-1.5 rounded-full bg-critical" />
            Only {units} left
          </p>
        )}
      </div>
    </article>
  );
}
