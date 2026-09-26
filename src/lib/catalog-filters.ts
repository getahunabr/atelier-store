import { ONE_SIZE, type Product } from "@/lib/catalog-types";
import { totalStock } from "@/lib/stock";

// Listing filters live in the URL (?size=M&price=500-1000&stock=in&sort=newest) so results are
// shareable and server-rendered. Unknown or invalid values are ignored rather than erroring.

export const sortOptions = [
  { value: "featured", label: "Featured" },
  { value: "newest", label: "Newest" },
  { value: "price-asc", label: "Price: low to high" },
  { value: "price-desc", label: "Price: high to low" },
] as const;

export type SortValue = (typeof sortOptions)[number]["value"];

// min inclusive, max exclusive.
export const priceRanges = [
  { value: "under-500", label: "Under $500", min: 0, max: 500 },
  { value: "500-1000", label: "$500 – $1,000", min: 500, max: 1000 },
  { value: "1000-2000", label: "$1,000 – $2,000", min: 1000, max: 2000 },
  { value: "over-2000", label: "Over $2,000", min: 2000, max: Infinity },
] as const;

export type PriceValue = (typeof priceRanges)[number]["value"];

export type CatalogFilters = {
  /** Only products with stock in this size. */
  size?: string;
  price?: PriceValue;
  inStockOnly: boolean;
  sort: SortValue;
};

type SearchParams = Record<string, string | string[] | undefined>;

const first = (value: string | string[] | undefined) => (Array.isArray(value) ? value[0] : value);

/** Sizes offered across the given products, in catalog order. One-size products add nothing. */
export function sizeOptions(products: Product[]) {
  const sizes = new Set<string>();
  for (const product of products) {
    for (const level of product.stock) {
      if (level.size !== ONE_SIZE) sizes.add(level.size);
    }
  }
  return [...sizes];
}

export function parseFilters(params: SearchParams, sizes: string[]): CatalogFilters {
  const size = first(params.size);
  const price = first(params.price);
  const sort = first(params.sort);
  return {
    size: size && sizes.includes(size) ? size : undefined,
    price: priceRanges.find((range) => range.value === price)?.value,
    inStockOnly: first(params.stock) === "in",
    sort: sortOptions.find((option) => option.value === sort)?.value ?? "featured",
  };
}

export function filtersToQuery(filters: CatalogFilters) {
  const query = new URLSearchParams();
  if (filters.size) query.set("size", filters.size);
  if (filters.price) query.set("price", filters.price);
  if (filters.inStockOnly) query.set("stock", "in");
  if (filters.sort !== "featured") query.set("sort", filters.sort);
  return query.toString();
}

/** Number of narrowing filters applied (sort doesn't count). */
export function activeFilterCount(filters: CatalogFilters) {
  return [filters.size, filters.price, filters.inStockOnly || undefined].filter(Boolean).length;
}

export function applyFilters(products: Product[], filters: CatalogFilters) {
  const range = priceRanges.find((r) => r.value === filters.price);

  const matches = products.filter((product) => {
    if (filters.size && !product.stock.some((v) => v.size === filters.size && v.stock > 0)) return false;
    if (range && (product.price < range.min || product.price >= range.max)) return false;
    if (filters.inStockOnly && totalStock(product) === 0) return false;
    return true;
  });

  // Array.prototype.sort is stable, so ties keep catalog ("featured") order.
  switch (filters.sort) {
    case "newest":
      return matches.sort((a, b) => b.releasedAt.localeCompare(a.releasedAt));
    case "price-asc":
      return matches.sort((a, b) => a.price - b.price);
    case "price-desc":
      return matches.sort((a, b) => b.price - a.price);
    default:
      return matches;
  }
}
