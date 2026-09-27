"use client";

import Link from "next/link";

import { useCartCount } from "@/lib/cart";

// Bag status for the account overview (the bag lives in the browser, so this is client-side).
export function BagSummaryLink() {
  const count = useCartCount();
  return (
    <>
      <p className="text-body-sm text-ink-muted">
        {count === 0
          ? "Your bag is empty."
          : `You have ${count} ${count === 1 ? "item" : "items"} in your bag.`}
      </p>
      <Link href="/bag" className="eyebrow link-reveal mt-6 inline-block">
        View bag
      </Link>
    </>
  );
}
