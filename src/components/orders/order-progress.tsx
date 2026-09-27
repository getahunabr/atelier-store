import { CheckIcon } from "@/components/icons";
import { Spinner } from "@/components/ui/spinner";
import type { OrderStatus } from "@/lib/order-types";

export type ProgressStep = {
  label: string;
  detail?: string;
  state: "complete" | "current" | "upcoming";
  /** Current step that is actively being worked on (shows a spinner). */
  busy?: boolean;
};

const STATE_LABEL = { complete: "completed", current: "in progress", upcoming: "not started" } as const;

/** Where an order stands, as a row of steps. Presentational: the page decides each step's state. */
export function OrderProgress({ steps }: { steps: ProgressStep[] }) {
  return (
    <ol aria-label="Order progress" className="grid grid-cols-3">
      {steps.map((step, i) => (
        <li
          key={step.label}
          aria-current={step.state === "current" ? "step" : undefined}
          className="relative flex flex-col items-center px-1 text-center"
        >
          {i > 0 && (
            // Connector from the previous marker's centre to this one.
            <span
              aria-hidden="true"
              className={`absolute top-4 right-1/2 h-px w-full ${step.state === "upcoming" ? "bg-line" : "bg-ink"}`}
            />
          )}
          <span
            aria-hidden="true"
            className={`relative flex size-8 items-center justify-center border ${
              step.state === "complete"
                ? "border-ink bg-ink text-canvas"
                : step.state === "current"
                  ? "border-ink bg-canvas text-ink"
                  : "border-line bg-canvas text-ink-subtle"
            }`}
          >
            {step.state === "complete" ? (
              <CheckIcon className="size-4" strokeWidth={1.75} />
            ) : step.busy ? (
              <Spinner />
            ) : (
              <span className={`size-1.5 ${step.state === "current" ? "bg-ink" : "bg-line-strong/20"}`} />
            )}
          </span>
          <span className={`mt-3 text-caption tracking-label uppercase ${step.state === "upcoming" ? "text-ink-subtle" : "text-ink"}`}>
            {step.label}
            <span className="sr-only"> ({STATE_LABEL[step.state]})</span>
          </span>
          {step.detail && <span className="mt-1 text-caption text-ink-muted">{step.detail}</span>}
        </li>
      ))}
    </ol>
  );
}

/** Progress for an order, or null when it was never paid (expired / payment failed). */
export function orderProgressSteps(status: OrderStatus): ProgressStep[] | null {
  const placed: ProgressStep = { label: "Order placed", state: "complete" };
  const preparing = (state: ProgressStep["state"]): ProgressStep => ({ label: "Preparing", detail: state === "current" ? "In progress" : undefined, state });
  switch (status) {
    case "pending_payment":
      return [placed, { label: "Payment", detail: "Confirming", state: "current", busy: true }, preparing("upcoming")];
    case "processing":
      return [placed, { label: "Payment", detail: "Processing", state: "current" }, preparing("upcoming")];
    case "needs_review":
      return [placed, { label: "Payment", detail: "Under review", state: "current" }, preparing("upcoming")];
    case "paid":
      return [placed, { label: "Payment", detail: "Confirmed", state: "complete" }, preparing("current")];
    case "expired":
    case "payment_failed":
      return null;
  }
}
