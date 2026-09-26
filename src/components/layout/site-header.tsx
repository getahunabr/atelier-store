import Link from "next/link";

import { BagIcon, SearchIcon, UserIcon } from "@/components/icons";
import { navigation } from "@/data/storefront";

import { MobileNav } from "./mobile-nav";
import { NavLink } from "./nav-link";

const iconLink = "inline-flex size-10 items-center justify-center transition-colors hover:text-ink-muted";

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-40 border-b border-line bg-canvas">
      <div className="container-page grid h-header grid-cols-[1fr_auto_1fr] items-center gap-4">
        <div className="flex items-center">
          <MobileNav items={navigation} />
          <nav aria-label="Main" className="hidden lg:block">
            <ul className="flex gap-6">
              {navigation.map((item) => (
                <li key={item.href}>
                  <NavLink href={item.href} className="nav-link">
                    {item.label}
                  </NavLink>
                </li>
              ))}
            </ul>
          </nav>
        </div>

        {/* Negative margin cancels the trailing letter-spacing so the wordmark centers optically. */}
        <Link
          href="/"
          className="-mr-[0.32em] font-serif text-[1.375rem] leading-none tracking-[0.32em] uppercase md:text-[1.625rem]"
        >
          Atelier
        </Link>

        <div className="-mr-2 flex items-center justify-end">
          <Link href="/search" className={iconLink}>
            <SearchIcon />
            <span className="sr-only">Search</span>
          </Link>
          <Link href="/account" className={`${iconLink} max-sm:hidden`}>
            <UserIcon />
            <span className="sr-only">Account</span>
          </Link>
          <Link href="/bag" className={iconLink}>
            <BagIcon />
            <span className="sr-only">Shopping bag</span>
          </Link>
        </div>
      </div>
    </header>
  );
}
