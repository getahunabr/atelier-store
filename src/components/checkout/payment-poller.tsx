"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";

import { Spinner } from "@/components/ui/spinner";

const INTERVAL_MS = 3000;
const MAX_CHECKS = 10;

/**
 * While an order waits for Stripe's confirmation, re-renders the page every few seconds (each
 * render asks the server, which asks Stripe) and stops after about half a minute with a manual
 * "Check again". The server decides what's shown; this only asks again.
 */
export function PaymentPoller() {
  const router = useRouter();
  const [checks, setChecks] = useState(0);
  const [pending, startTransition] = useTransition();
  const waiting = checks < MAX_CHECKS;

  useEffect(() => {
    if (!waiting) return;
    const timer = setTimeout(() => {
      startTransition(() => router.refresh());
      setChecks((n) => n + 1);
    }, INTERVAL_MS);
    return () => clearTimeout(timer);
  }, [checks, waiting, router]);

  if (waiting) {
    return (
      <p role="status" className="flex items-center justify-center gap-3 text-body-sm text-ink-muted">
        <Spinner />
        Checking with our payment provider…
      </p>
    );
  }

  return (
    <div className="flex flex-col items-center gap-4 text-center">
      <p role="status" className="text-body-sm text-ink-muted">
        This is taking longer than usual. If you completed payment, your order is safe and you won&apos;t be charged twice.
      </p>
      <button
        type="button"
        onClick={() => {
          setChecks(MAX_CHECKS - 1);
          startTransition(() => router.refresh());
        }}
        disabled={pending}
        className="btn btn-secondary"
      >
        {pending && <Spinner />}
        Check again
      </button>
    </div>
  );
}
