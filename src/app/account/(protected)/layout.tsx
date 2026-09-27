import Link from "next/link";
import type { ReactNode } from "react";

import { AccountNav } from "@/components/account/account-nav";
import { SignOutButton } from "@/components/account/sign-out-button";
import { isAdmin, requireSession } from "@/lib/session";

// Every page in this group requires a signed-in customer (proxy.ts usually redirects earlier; this
// is the authoritative check) and shares the account shell: breadcrumb, account menu, content.
export default async function ProtectedAccountLayout({ children }: { children: ReactNode }) {
  // Fresh read so the menu (name, Admin item) reflects profile and role changes immediately.
  const { user } = await requireSession({ fresh: true });

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
          <li className="text-ink">My account</li>
        </ol>
      </nav>

      <div className="mt-8 grid gap-8 md:mt-12 lg:grid-cols-[14rem_minmax(0,1fr)] lg:gap-16">
        <AccountNav name={user.name} email={user.email} isAdmin={isAdmin(user)} />
        <div className="min-w-0">
          {children}
          {/* On smaller screens the menu is a tab row, so sign-out sits at the end of the page. */}
          <div className="mt-12 border-t border-line pt-6 lg:hidden">
            <SignOutButton />
          </div>
        </div>
      </div>
    </div>
  );
}
