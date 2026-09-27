import type { Metadata } from "next";
import Link from "next/link";
import type { ReactNode } from "react";

import { AdminNav } from "@/components/admin/admin-nav";
import { requireAdmin } from "@/lib/session";

export const metadata: Metadata = {
  title: { template: "%s · Admin · Atelier", default: "Admin · Atelier" },
  robots: { index: false, follow: false },
};

// The admin shell. Every /admin page requires the admin role, read fresh from the database on each
// request (signed out → sign-in, signed in without the role → 404). Pages call requireAdmin() too
// (they can render in parallel with this layout); server actions call withAdmin() and admin queries
// assertAdmin() — layouts don't protect those. `npm run check:admin` enforces all three.
export default async function AdminLayout({ children }: { children: ReactNode }) {
  const { user } = await requireAdmin();

  return (
    <div className="container-page pt-4 pb-section md:pt-6">
      <nav aria-label="Breadcrumb">
        <ol className="flex items-center gap-2 text-caption tracking-label text-ink-muted uppercase">
          <li>
            <Link href="/" className="link-reveal">
              Home
            </Link>
          </li>
          <li aria-hidden="true">/</li>
          <li className="text-ink">Admin</li>
        </ol>
      </nav>

      <div className="mt-8 grid gap-8 md:mt-12 lg:grid-cols-[14rem_minmax(0,1fr)] lg:gap-16">
        <AdminNav email={user.email} />
        <div className="min-w-0">{children}</div>
      </div>
    </div>
  );
}
