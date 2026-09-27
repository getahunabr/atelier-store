import type { OrderStatus } from "@/lib/order-types";

// Payment status as customers see it (same dot + label pattern as StockStatus).
const STATUS: Record<OrderStatus, { label: string; dot: string; text: string }> = {
  paid: { label: "Paid", dot: "bg-success", text: "text-ink" },
  processing: { label: "Payment processing", dot: "bg-ink-subtle", text: "text-ink" },
  needs_review: { label: "Under review", dot: "bg-ink-subtle", text: "text-ink" },
  pending_payment: { label: "Awaiting payment", dot: "bg-ink-subtle", text: "text-ink-muted" },
  payment_failed: { label: "Payment failed", dot: "bg-critical", text: "text-critical" },
  expired: { label: "Not completed", dot: "bg-ink-subtle", text: "text-ink-muted" },
};

export function paymentStatusLabel(status: OrderStatus) {
  return STATUS[status].label;
}

export function OrderStatusLabel({ status }: { status: OrderStatus }) {
  const style = STATUS[status];
  return (
    <span className={`inline-flex items-center gap-2 ${style.text}`}>
      <span aria-hidden="true" className={`size-1.5 shrink-0 rounded-full ${style.dot}`} />
      {style.label}
    </span>
  );
}
