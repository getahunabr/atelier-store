import Link from "next/link";

import { ProductCard } from "@/components/product/product-card";
import type { Product } from "@/lib/catalog-types";

type ListingResultsProps = {
  products: Product[];
  /** Where "Clear filters" leads when nothing matches. */
  clearHref: string;
  /** Names the unfiltered set in the empty state, e.g. "Handbags". */
  scopeName: string;
};

// Product grid for listing pages, with the empty state shown when filters match nothing.
export function ListingResults({ products, clearHref, scopeName }: ListingResultsProps) {
  return (
    <div className="container-page pt-8 pb-section md:pt-10">
      {products.length > 0 ? (
        <ul className="product-grid">
          {products.map((product) => (
            <li key={product.slug}>
              <ProductCard product={product} />
            </li>
          ))}
        </ul>
      ) : (
        <div className="mx-auto max-w-md py-section text-center">
          <h2 className="font-serif text-title">No pieces match these filters</h2>
          <p className="mt-3 text-body-sm text-ink-muted">
            Try a different size or price, or clear the filters to see everything in {scopeName}.
          </p>
          <Link href={clearHref} scroll={false} className="btn btn-secondary mt-8">
            Clear filters
          </Link>
        </div>
      )}
    </div>
  );
}
