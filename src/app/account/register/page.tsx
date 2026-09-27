import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";

import { AuthForm } from "@/components/account/auth-form";
import { ListingHeader } from "@/components/catalog/listing-header";
import { safeRedirectPath } from "@/lib/safe-redirect";
import { getSession } from "@/lib/session";

export const metadata: Metadata = { title: "Create an account", robots: { index: false } };

const benefits = [
  "Follow your orders from checkout to delivery",
  "Keep your details ready for faster checkout",
  "See your account and bag in one place",
];

// Same two-panel layout as sign-in: the form, then a quiet panel that routes back to sign-in.
export default async function RegisterPage({ searchParams }: PageProps<"/account/register">) {
  const next = safeRedirectPath((await searchParams).next);
  if (await getSession()) redirect(next);

  return (
    <>
      <ListingHeader title="Create an account" description="A few details and you're set." />
      <div className="container-page grid gap-12 border-t border-line pt-10 pb-section md:grid-cols-2 md:gap-16">
        <section aria-labelledby="register-title" className="max-w-md">
          <h2 id="register-title" className="font-serif text-title">
            Your details
          </h2>
          <div className="mt-6">
            <AuthForm mode="register" redirectTo={next} />
          </div>
        </section>
        <section aria-labelledby="have-account-title" className="self-start bg-surface p-8 md:p-10">
          <h2 id="have-account-title" className="font-serif text-title">
            Already have an account?
          </h2>
          <p className="mt-4 max-w-sm text-body-sm text-ink-muted">Sign in to pick up where you left off.</p>
          <Link
            href={next === "/account" ? "/account/sign-in" : `/account/sign-in?next=${encodeURIComponent(next)}`}
            className="btn btn-secondary mt-8"
          >
            Sign in
          </Link>
          <ul className="mt-10 space-y-3 border-t border-line pt-6 text-body-sm text-ink-muted">
            {benefits.map((benefit) => (
              <li key={benefit} className="flex gap-3">
                <span aria-hidden="true" className="text-ink">
                  —
                </span>
                {benefit}
              </li>
            ))}
          </ul>
        </section>
      </div>
    </>
  );
}
