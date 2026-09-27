import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = { title: "Page not found", robots: { index: false } };

// Replaces Next's built-in 404, whose dark-mode styles clash with the site (white header text on
// white). Also shown to signed-in customers at /admin, so it deliberately says nothing about access.
export default function NotFound() {
  return (
    <section aria-labelledby="not-found-title" className="container-page py-section">
      <div className="mx-auto max-w-md py-section text-center">
        <p className="eyebrow text-ink-muted">404</p>
        <h1 id="not-found-title" className="mt-4 font-serif text-heading">
          This page could not be found
        </h1>
        <p className="mt-4 text-ink-muted">The link may be out of date, or the page may have moved.</p>
        <div className="mt-8 flex flex-col items-center gap-5 sm:flex-row sm:justify-center sm:gap-8">
          <Link href="/" className="btn btn-primary">
            Return home
          </Link>
          <Link href="/new-in" className="eyebrow link-reveal">
            Shop new arrivals
          </Link>
        </div>
      </div>
    </section>
  );
}
