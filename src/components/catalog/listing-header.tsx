import Link from "next/link";

// Breadcrumb, large serif title and intro used at the top of product listing pages.
export function ListingHeader({ title, description }: { title: string; description: string }) {
  return (
    <header className="container-page pt-4 pb-8 md:pt-6 md:pb-12">
      <nav aria-label="Breadcrumb">
        <ol className="flex items-center gap-2 text-caption tracking-label text-ink-muted uppercase">
          <li>
            <Link href="/" className="link-reveal">
              Home
            </Link>
          </li>
          <li aria-hidden="true">/</li>
          <li aria-current="page" className="text-ink">
            {title}
          </li>
        </ol>
      </nav>
      <h1 className="mt-8 font-serif text-display md:mt-12">{title}</h1>
      <p className="mt-4 max-w-xl text-ink-muted">{description}</p>
    </header>
  );
}
