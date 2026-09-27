import Image from "next/image";
import Link from "next/link";

import type { Img, Product } from "@/lib/catalog-types";
import { formatPrice } from "@/lib/format";

type EditorialSplitProps = {
  id: string;
  content: { eyebrow: string; title: string; body: string; image: Img };
  /** "Shop the look": the product pictured, shown as a small card under the copy. */
  product: Product;
};

// Full-bleed image beside a text panel. Copy is left-aligned and anchored to the bottom of the
// panel like a magazine caption, ending in the product it features. Stacks image-first on mobile.
export function EditorialSplit({ id, content, product }: EditorialSplitProps) {
  const href = `/products/${product.slug}`;
  const [thumb] = product.images;

  return (
    <section aria-labelledby={id} className="split">
      <div className="media-frame aspect-portrait md:aspect-auto md:min-h-[44rem]">
        <Image src={content.image.src} alt={content.image.alt} fill sizes="(min-width: 48rem) 50vw, 100vw" />
      </div>

      <div className="flex flex-col justify-end bg-surface px-gutter py-section md:px-12 lg:px-16">
        <p className="eyebrow text-ink-muted">{content.eyebrow}</p>
        <h2 id={id} className="mt-4 max-w-md font-serif text-heading">
          {content.title}
        </h2>
        <p className="mt-5 max-w-sm text-ink-muted">{content.body}</p>

        <div className="mt-10 max-w-sm border-t border-ink/15 pt-6">
          <p className="eyebrow text-ink-muted">Shop the look</p>
          <Link href={href} className="group mt-4 flex items-center gap-5">
            <div className="media-frame aspect-product w-20 shrink-0 bg-canvas">
              <Image
                src={thumb.src}
                alt=""
                fill
                sizes="80px"
                className="transition-transform duration-700 ease-luxe group-hover:scale-[1.05]"
              />
            </div>
            <div className="flex flex-col gap-1">
              <span className="text-body-sm">{product.name}</span>
              <span className="text-body-sm text-ink-muted">{formatPrice(product.price)}</span>
              <span className="eyebrow link-reveal mt-2 self-start group-hover:bg-size-[100%_1px]">Shop now</span>
            </div>
          </Link>
        </div>
      </div>
    </section>
  );
}
