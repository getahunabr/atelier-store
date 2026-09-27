import type { Metadata } from "next";

import { AccountPageHeader } from "@/components/account/account-page-header";
import { ProfileForm } from "@/components/account/profile-form";
import { memberSince } from "@/lib/format";
import { requireSession } from "@/lib/session";

export const metadata: Metadata = { title: "Account details", robots: { index: false } };

export default async function AccountDetailsPage() {
  const { user } = await requireSession();

  return (
    <>
      <AccountPageHeader title="Account details" description="The name and email on your account." />

      <section aria-labelledby="personal-title" className="mt-10 border-t border-line pt-6">
        <h2 id="personal-title" className="eyebrow">
          Personal details
        </h2>
        <div className="mt-6">
          <ProfileForm name={user.name} email={user.email} />
        </div>
      </section>

      <section aria-labelledby="membership-title" className="mt-12 border-t border-line pt-6">
        <h2 id="membership-title" className="eyebrow">
          Membership
        </h2>
        <dl className="mt-4 text-body-sm">
          <dt className="text-ink-muted">Member since</dt>
          <dd className="mt-1">{memberSince(user.createdAt)}</dd>
        </dl>
      </section>
    </>
  );
}
