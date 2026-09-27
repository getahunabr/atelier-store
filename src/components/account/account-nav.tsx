import { NavLink } from "@/components/layout/nav-link";

import { SignOutButton } from "./sign-out-button";

type AccountNavProps = { name: string; email: string; isAdmin: boolean };

const linkClass =
  "link-reveal inline-block text-label tracking-nav text-ink-muted uppercase transition-colors hover:text-ink aria-[current=page]:text-ink";

// Account menu: a vertical list beside the content on desktop, a horizontal scrolling tab row on
// smaller screens. The current page is marked with aria-current (NavLink).
export function AccountNav({ name, email, isAdmin }: AccountNavProps) {
  const items = [
    { href: "/account", label: "Overview", exact: true },
    { href: "/account/orders", label: "Orders" },
    { href: "/account/details", label: "Account details" },
    { href: "/bag", label: "Shopping bag" },
    ...(isAdmin ? [{ href: "/admin", label: "Admin" }] : []),
  ];

  return (
    <nav aria-label="Account" className="lg:sticky lg:top-[calc(var(--header-height)+2rem)] lg:self-start">
      <div className="hidden border-b border-line pb-6 lg:block">
        <p className="font-serif text-title">{name}</p>
        <p className="mt-1 text-body-sm break-all text-ink-muted">{email}</p>
      </div>
      <ul className="-mx-gutter flex gap-6 overflow-x-auto border-b border-line px-gutter [scrollbar-width:none] lg:mx-0 lg:mt-4 lg:flex-col lg:gap-0 lg:overflow-visible lg:border-0 lg:px-0">
        {items.map((item) => (
          <li key={item.href} className="shrink-0 py-3 lg:py-2">
            <NavLink href={item.href} exact={item.exact} className={linkClass}>
              {item.label}
            </NavLink>
          </li>
        ))}
      </ul>
      <div className="mt-6 hidden lg:block">
        <SignOutButton />
      </div>
    </nav>
  );
}
