"use client";

import { useEffect } from "react";

import { removePurchased } from "@/lib/cart";

/** Rendered only for orders Stripe has confirmed as paid: takes the purchased pieces out of the bag. */
export function ClearPurchased({ items }: { items: { slug: string; size: string }[] }) {
  const key = JSON.stringify(items);
  useEffect(() => {
    removePurchased(JSON.parse(key));
  }, [key]);
  return null;
}
