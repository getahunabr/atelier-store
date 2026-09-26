import type { Product } from "@/data/products";

export type StockState = "in_stock" | "low_stock" | "out_of_stock";

/** At or below this many units a product or size shows "Only N left". */
export const LOW_STOCK_THRESHOLD = 3;

export function stockState(units: number): StockState {
  if (units <= 0) return "out_of_stock";
  if (units <= LOW_STOCK_THRESHOLD) return "low_stock";
  return "in_stock";
}

export function totalStock(product: Product) {
  return product.variants.reduce((sum, variant) => sum + variant.stock, 0);
}

export function isSoldOut(product: Product) {
  return totalStock(product) === 0;
}
