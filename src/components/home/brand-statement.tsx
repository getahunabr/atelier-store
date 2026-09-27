import Image from "next/image";

import type { Img } from "@/lib/catalog-types";

type BrandStatementProps = {
  id: string;
  content: { eyebrow: string; title: string; body: string; image: Img };
};

// Typographic brand moment: a display-size serif statement set against a portrait image on an
// asymmetric grid — deliberately different from the full-bleed EditorialSplit.
export function BrandStatement({ id, content }: BrandStatementProps) {
  return (
    <section aria-labelledby={id} className="section-y container-page border-t border-line">
      <div className="grid gap-10 md:grid-cols-12 md:items-center md:gap-8">
        <div className="md:col-span-7 lg:col-span-6">
          <p className="eyebrow text-ink-muted">{content.eyebrow}</p>
          <h2 id={id} className="mt-5 font-serif text-display">
            {content.title}
          </h2>
          <p className="mt-6 max-w-md text-ink-muted">{content.body}</p>
        </div>
        <div className="md:col-span-5 lg:col-start-8">
          <div className="media-frame aspect-portrait">
            <Image src={content.image.src} alt={content.image.alt} fill sizes="(min-width: 48rem) 42vw, 100vw" />
          </div>
        </div>
      </div>
    </section>
  );
}
