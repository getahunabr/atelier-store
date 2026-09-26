import Link from "next/link";

import { footerColumns } from "@/data/storefront";

export function SiteFooter() {
  return (
    <footer className="bg-ink text-canvas">
      <div className="container-page py-section">
        <div className="grid gap-10 md:grid-cols-[2fr_repeat(3,1fr)] md:gap-8">
          <div className="max-w-xs">
            <p className="font-serif text-[1.625rem] leading-none tracking-[0.32em] uppercase">Atelier</p>
            <p className="mt-4 text-body-sm text-canvas/70">
              Considered clothing and accessories, made in small runs and built to be kept.
            </p>
          </div>
          {footerColumns.map((column) => (
            <nav key={column.title} aria-label={column.title}>
              <h2 className="eyebrow">{column.title}</h2>
              <ul className="mt-4 space-y-3">
                {column.links.map((link) => (
                  <li key={link.href}>
                    <Link
                      href={link.href}
                      className="link-reveal text-body-sm text-canvas/70 transition-colors hover:text-canvas"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>
          ))}
        </div>

        <div className="mt-16 flex flex-col gap-2 border-t border-canvas/20 pt-6 text-caption text-canvas/60 sm:flex-row sm:justify-between">
          <p>© {new Date().getFullYear()} Atelier. All rights reserved.</p>
          <p>United States · English · USD</p>
        </div>
      </div>
    </footer>
  );
}
