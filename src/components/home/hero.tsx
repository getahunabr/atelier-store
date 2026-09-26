import Image from "next/image";
import Link from "next/link";

import type { hero as heroContent } from "@/data/storefront";

export function Hero({ content }: { content: typeof heroContent }) {
  return (
    <section
      aria-labelledby="hero-title"
      className="relative h-[calc(100svh-var(--header-height))] min-h-[32rem] overflow-hidden bg-surface-strong text-canvas lg:max-h-[62rem]"
    >
      <Image
        src={content.image.src}
        alt={content.image.alt}
        fill
        sizes="100vw"
        loading="eager"
        fetchPriority="high"
        className="object-cover object-[62%_30%]"
      />
      {/* Scrim keeps the overlaid copy legible whatever the photo does. */}
      <div className="absolute inset-0 bg-linear-to-t from-ink/65 via-ink/15 to-transparent" />

      <div className="container-page relative flex h-full flex-col justify-end pb-12 md:pb-20">
        <p className="eyebrow">{content.eyebrow}</p>
        <h1 id="hero-title" className="mt-3 font-serif text-display">
          {content.title}
        </h1>
        <p className="mt-4 max-w-md text-body text-canvas/85">{content.body}</p>
        <div className="mt-8 flex flex-col gap-3 sm:flex-row">
          <Link href={content.primary.href} className="btn btn-inverse">
            {content.primary.label}
          </Link>
          <Link
            href={content.secondary.href}
            className="btn border-canvas text-canvas hover:bg-canvas hover:text-ink"
          >
            {content.secondary.label}
          </Link>
        </div>
      </div>
    </section>
  );
}
