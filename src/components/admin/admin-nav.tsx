import { NavLink } from "@/components/layout/nav-link";

const linkClass =
  "link-reveal inline-block text-label tracking-nav text-ink-muted uppercase transition-colors hover:text-ink aria-[current=page]:text-ink";

const ITEMS = [
  { href: "/admin", label: "Overview", exact: true },
  { href: "/admin/products", label: "Products" },
  { href: "/admin/stock", label: "Stock" },
  { href: "/admin/categories", label: "Categories" },
  { href: "/admin/orders", label: "Orders" },
];

// Admin menu, same pattern as AccountNav: a vertical list beside the content on desktop, a
// horizontal scrolling tab row on smaller screens. Rendering it is not authorization — the admin
// layout, every admin page, action and query check the role on the server.
export function AdminNav({ email }: { email: string }) {
  return (
    <nav aria-label="Admin" className="lg:sticky lg:top-[calc(var(--header-height)+2rem)] lg:self-start">
      <div className="hidden border-b border-line pb-6 lg:block">
        <p className="font-serif text-title">Admin</p>
        <p className="mt-1 text-body-sm break-all text-ink-muted">{email}</p>
      </div>
      <ul className="-mx-gutter flex gap-6 overflow-x-auto border-b border-line px-gutter [scrollbar-width:none] lg:mx-0 lg:mt-4 lg:flex-col lg:gap-0 lg:overflow-visible lg:border-0 lg:px-0">
        {ITEMS.map((item) => (
          <li key={item.href} className="shrink-0 py-3 lg:py-2">
            <NavLink href={item.href} exact={item.exact} className={linkClass}>
              {item.label}
            </NavLink>
          </li>
        ))}
      </ul>
      <div className="mt-6 hidden border-t border-line pt-6 lg:block">
        <NavLink href="/account" exact className={linkClass}>
          My account
        </NavLink>
      </div>
    </nav>
  );
}
