import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";

import { AuthForm } from "@/components/account/auth-form";
import { ListingHeader } from "@/components/catalog/listing-header";
import { safeRedirectPath } from "@/lib/safe-redirect";
import { getSession } from "@/lib/session";

export const metadata: Metadata = { title: "Sign in", robots: { index: false } };

export default async function SignInPage({ searchParams }: PageProps<"/account/sign-in">) {
  const params = await searchParams;
  const next = safeRedirectPath(params.next);
  if (await getSession()) redirect(next);
  // Pre-filled when arriving from "An account with this email already exists — Sign in instead".
  const email = typeof params.email === "string" && params.email.length <= 254 ? params.email : "";

  return (
    <>
      <ListingHeader title="Sign in" description="Sign in to see your account and keep track of your orders." />
      <div className="container-page grid gap-12 border-t border-line pt-10 pb-section md:grid-cols-2 md:gap-16">
        <section aria-labelledby="returning-title" className="max-w-md">
          <h2 id="returning-title" className="font-serif text-title">
            Returning customers
          </h2>
          <div className="mt-6">
            <AuthForm mode="sign-in" redirectTo={next} defaultEmail={email} />
          </div>
        </section>
        <section aria-labelledby="new-title" className="self-start bg-surface p-8 md:p-10">
          <h2 id="new-title" className="font-serif text-title">
            New to Atelier?
          </h2>
          <p className="mt-4 max-w-sm text-body-sm text-ink-muted">
            Create an account to save your details and follow your orders from checkout to delivery.
          </p>
          <Link
            href={next === "/account" ? "/account/register" : `/account/register?next=${encodeURIComponent(next)}`}
            className="btn btn-secondary mt-8"
          >
            Create an account
          </Link>
        </section>
      </div>
    </>
  );
}
