"use client";

import { useRef, type ReactNode } from "react";

import { ArrowIcon } from "@/components/icons";
import type { Product } from "@/lib/catalog-types";

import { ProductCard } from "./product-card";

type ProductRailProps = {
  products: Product[];
  label: string;
  heading: ReactNode;
};

// Swipe on touch; arrow buttons page through on pointer devices.
export function ProductRail({ products, label, heading }: ProductRailProps) {
  const rail = useRef<HTMLUListElement>(null);

  const page = (direction: 1 | -1) => {
    const el = rail.current;
    if (el) el.scrollBy({ left: direction * el.clientWidth * 0.8, behavior: "smooth" });
  };

  return (
    <>
      <div className="container-page flex items-end justify-between gap-6">
        <div className="flex-1">{heading}</div>
        <div className="hidden gap-2 md:flex">
          <button type="button" onClick={() => page(-1)} className="btn btn-secondary btn-sm px-3">
            <ArrowIcon className="size-4 rotate-180" />
            <span className="sr-only">Previous</span>
          </button>
          <button type="button" onClick={() => page(1)} className="btn btn-secondary btn-sm px-3">
            <ArrowIcon className="size-4" />
            <span className="sr-only">Next</span>
          </button>
        </div>
      </div>
      <ul
        ref={rail}
        aria-label={label}
        tabIndex={0}
        className="rail mx-auto mt-8 max-w-page focus-visible:outline-offset-[-1px] md:mt-10"
      >
        {products.map((product) => (
          <li key={product.slug} className="w-[68%] sm:w-[42%] md:w-[30%] xl:w-[22%]">
            <ProductCard product={product} sizes="(min-width: 80rem) 22vw, (min-width: 48rem) 30vw, 68vw" />
          </li>
        ))}
      </ul>
    </>
  );
}
