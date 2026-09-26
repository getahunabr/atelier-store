"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition, type ReactNode } from "react";

import {
  activeFilterCount,
  filtersToQuery,
  priceRanges,
  sortOptions,
  type CatalogFilters,
  type PriceValue,
  type SortValue,
} from "@/lib/catalog-filters";

type CatalogViewProps = {
  basePath: string;
  filters: CatalogFilters;
  sizes: string[];
  resultCount: number;
  children: ReactNode;
};

const selectClass =
  "h-10 w-full min-w-0 border border-line bg-canvas px-3 text-body-sm text-ink transition-colors hover:border-ink-subtle focus:border-ink focus:outline-none md:w-auto";

// Filter/sort toolbar plus the server-rendered grid. Changes are written to the URL, so the
// server re-renders the results; the grid dims while that request is in flight.
export function CatalogView({ basePath, filters, sizes, resultCount, children }: CatalogViewProps) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [panelOpen, setPanelOpen] = useState(false);
  const activeCount = activeFilterCount(filters);

  const update = (patch: Partial<CatalogFilters>) => {
    const query = filtersToQuery({ ...filters, ...patch });
    startTransition(() => router.replace(query ? `${basePath}?${query}` : basePath, { scroll: false }));
  };

  const clear = () => update({ size: undefined, price: undefined, inStockOnly: false });

  const filterControls = (
    <>
      {sizes.length > 0 && (
        <label className="flex flex-col gap-1.5 md:flex-row md:items-center md:gap-2">
          <span className="eyebrow text-ink-muted">Size</span>
          <select
            className={selectClass}
            value={filters.size ?? ""}
            onChange={(e) => update({ size: e.target.value || undefined })}
          >
            <option value="">All sizes</option>
            {sizes.map((size) => (
              <option key={size} value={size}>
                {size}
              </option>
            ))}
          </select>
        </label>
      )}
      <label className="flex flex-col gap-1.5 md:flex-row md:items-center md:gap-2">
        <span className="eyebrow text-ink-muted">Price</span>
        <select
          className={selectClass}
          value={filters.price ?? ""}
          onChange={(e) => update({ price: (e.target.value || undefined) as PriceValue | undefined })}
        >
          <option value="">All prices</option>
          {priceRanges.map((range) => (
            <option key={range.value} value={range.value}>
              {range.label}
            </option>
          ))}
        </select>
      </label>
      <label className="flex min-h-10 cursor-pointer items-center gap-2 self-end md:self-auto">
        <input
          type="checkbox"
          checked={filters.inStockOnly}
          onChange={(e) => update({ inStockOnly: e.target.checked })}
          className="size-4 accent-ink"
        />
        <span className="text-body-sm">In stock only</span>
      </label>
      {activeCount > 0 && (
        <button type="button" onClick={clear} className="eyebrow link-reveal col-span-2 justify-self-start md:col-auto">
          Clear all
        </button>
      )}
    </>
  );

  return (
    <>
      <div className="sticky top-header z-30 border-y border-line bg-canvas">
        <div className="container-page flex items-center gap-4 py-3">
          <button
            type="button"
            onClick={() => setPanelOpen((open) => !open)}
            aria-expanded={panelOpen}
            aria-controls="catalog-filters"
            className="eyebrow link-reveal md:hidden"
          >
            Filters{activeCount > 0 ? ` (${activeCount})` : ""}
          </button>

          <div className="hidden flex-wrap items-center gap-x-6 gap-y-3 md:flex">{filterControls}</div>

          <div className="ml-auto flex items-center gap-4">
            <p className="text-body-sm whitespace-nowrap text-ink-muted" aria-live="polite">
              {resultCount} {resultCount === 1 ? "item" : "items"}
            </p>
            <label className="flex items-center gap-2">
              <span className="eyebrow text-ink-muted max-sm:sr-only">Sort</span>
              <select
                className={`${selectClass} w-auto`}
                value={filters.sort}
                onChange={(e) => update({ sort: e.target.value as SortValue })}
              >
                {sortOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>
          </div>
        </div>

        {panelOpen && (
          <div id="catalog-filters" className="container-page grid grid-cols-2 gap-4 border-t border-line py-4 md:hidden">
            {filterControls}
          </div>
        )}
      </div>

      <div aria-busy={pending} className={`transition-opacity duration-300 ${pending ? "opacity-50" : ""}`}>
        {children}
      </div>
    </>
  );
}
