"use client";

import Link from "next/link";

import { BagIcon } from "@/components/icons";
import { useCartCount } from "@/lib/cart";

// Header bag icon with a live item count.
export function BagLink({ className }: { className: string }) {
  const count = useCartCount();
  return (
    <Link href="/bag" className={`relative ${className}`}>
      <BagIcon />
      {count > 0 && (
        <span
          aria-hidden="true"
          className="absolute top-1 right-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-ink px-1 text-[0.625rem] leading-none font-medium text-canvas"
        >
          {count > 99 ? "99+" : count}
        </span>
      )}
      <span className="sr-only">{count > 0 ? `Shopping bag, ${count} ${count === 1 ? "item" : "items"}` : "Shopping bag"}</span>
    </Link>
  );
}
