"use client";

import Link from "next/link";
import { useRef } from "react";

import { CloseIcon, MenuIcon } from "@/components/icons";
import type { NavItem } from "@/data/storefront";

// Native <dialog> gives focus trapping, Escape to close and an inert background for free.
export function MobileNav({ items }: { items: NavItem[] }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const close = () => dialog.current?.close();

  return (
    <div className="lg:hidden">
      <button
        type="button"
        onClick={() => dialog.current?.showModal()}
        className="-ml-2 inline-flex size-10 items-center justify-center"
      >
        <MenuIcon />
        <span className="sr-only">Open menu</span>
      </button>

      <dialog
        ref={dialog}
        aria-label="Menu"
        // Clicking the backdrop lands on the dialog element itself.
        onClick={(event) => event.target === dialog.current && close()}
        className="m-0 h-dvh max-h-none w-full max-w-sm bg-canvas text-ink backdrop:bg-scrim"
      >
        <div className="flex h-header items-center border-b border-line px-gutter">
          <button
            type="button"
            onClick={close}
            className="-ml-2 inline-flex size-10 items-center justify-center"
          >
            <CloseIcon />
            <span className="sr-only">Close menu</span>
          </button>
        </div>
        <nav aria-label="Main" className="px-gutter py-6">
          <ul className="divide-y divide-line">
            {items.map((item) => (
              <li key={item.href}>
                <Link href={item.href} onClick={close} className="block py-4 font-serif text-title">
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>
          <ul className="mt-8 space-y-4">
            <li>
              <Link href="/account" onClick={close} className="eyebrow link-reveal">
                Account
              </Link>
            </li>
            <li>
              <Link href="/help/contact" onClick={close} className="eyebrow link-reveal">
                Contact us
              </Link>
            </li>
          </ul>
        </nav>
      </dialog>
    </div>
  );
}
