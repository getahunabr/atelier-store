"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ComponentProps } from "react";

type NavLinkProps = ComponentProps<typeof Link> & {
  href: string;
  /** Only the exact path is current (e.g. an "Overview" link whose sub-pages have their own links). */
  exact?: boolean;
};

// Marks the link for the current section with aria-current, which link-reveal underlines.
export function NavLink({ exact = false, ...props }: NavLinkProps) {
  const pathname = usePathname();
  const current = pathname === props.href || (!exact && pathname.startsWith(`${props.href}/`));
  return <Link {...props} aria-current={current ? "page" : undefined} />;
}
