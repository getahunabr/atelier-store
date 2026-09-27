import { stockState } from "@/lib/stock";

// Admin wording for a size's stock state (the storefront's StockStatus speaks to customers:
// "Only 2 left"). Same thresholds, from src/lib/stock.ts.
const STYLES = {
  in_stock: { label: "In stock", dot: "bg-success", text: "text-ink" },
  low_stock: { label: "Low", dot: "bg-critical", text: "text-critical" },
  out_of_stock: { label: "Sold out", dot: "bg-ink-subtle", text: "text-ink-muted" },
} as const;

export function StockLevel({ units }: { units: number }) {
  const style = STYLES[stockState(units)];
  return (
    <span className={`inline-flex items-center gap-2 text-body-sm ${style.text}`}>
      <span aria-hidden="true" className={`size-1.5 shrink-0 rounded-full ${style.dot}`} />
      {style.label}
    </span>
  );
}
