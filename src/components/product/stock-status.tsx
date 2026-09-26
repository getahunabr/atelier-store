import { stockState } from "@/lib/stock";

const styles = {
  in_stock: { dot: "bg-success", text: "text-ink" },
  low_stock: { dot: "bg-critical", text: "text-critical" },
  out_of_stock: { dot: "bg-ink-subtle", text: "text-ink-muted" },
} as const;

export function stockLabel(units: number) {
  switch (stockState(units)) {
    case "out_of_stock":
      return "Sold out";
    case "low_stock":
      return `Only ${units} left`;
    default:
      return "In stock";
  }
}

export function StockStatus({ units, prefix }: { units: number; prefix?: string }) {
  const style = styles[stockState(units)];
  return (
    <p className={`flex items-center gap-2 text-body-sm ${style.text}`}>
      <span aria-hidden="true" className={`size-1.5 rounded-full ${style.dot}`} />
      {prefix}
      {stockLabel(units)}
    </p>
  );
}
