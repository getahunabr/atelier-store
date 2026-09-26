"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ComponentProps } from "react";

// Marks the link for the current section with aria-current, which link-reveal underlines.
export function NavLink(props: ComponentProps<typeof Link> & { href: string }) {
  const pathname = usePathname();
  const current = pathname === props.href || pathname.startsWith(`${props.href}/`);
  return <Link {...props} aria-current={current ? "page" : undefined} />;
}
