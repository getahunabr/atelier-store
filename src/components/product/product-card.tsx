import Image from "next/image";
import Link from "next/link";

import type { Product } from "@/lib/catalog-types";
import { formatPrice } from "@/lib/format";
import { isSoldOut } from "@/lib/stock";

type ProductCardProps = {
  product: Product;
  /** Responsive `sizes` hint; defaults to the product-grid column widths. */
  sizes?: string;
};

export function ProductCard({ product, sizes = "(min-width: 64rem) 25vw, 50vw" }: ProductCardProps) {
  const soldOut = isSoldOut(product);
  const tag = soldOut ? "Sold out" : product.tag;
  const [image] = product.images;

  return (
    <article className="group relative">
      <div className="media-frame aspect-product">
        <Image
          src={image.src}
          alt={image.alt}
          fill
          sizes={sizes}
          className={`transition-transform duration-700 ease-luxe group-hover:scale-[1.03] ${soldOut ? "opacity-60" : ""}`}
        />
        {tag && (
          <span className="absolute top-3 left-3 bg-canvas px-2 py-1 text-caption font-medium tracking-label uppercase">
            {tag}
          </span>
        )}
      </div>
      <div className="mt-3 flex flex-col gap-1 md:mt-4">
        <h3 className="text-body-sm">
          {/* Stretched link: the whole card is clickable, but only the name is announced. */}
          <Link href={`/products/${product.slug}`} className="after:absolute after:inset-0">
            {product.name}
          </Link>
        </h3>
        <p className="text-body-sm text-ink-muted">{formatPrice(product.price)}</p>
      </div>
    </article>
  );
}
