import Image from "next/image";
import Link from "next/link";

import type { Img } from "@/lib/catalog-types";

type CollectionTile = {
  name: string;
  href: string;
  image?: Img;
  /** Secondary line under the name, e.g. "5 pieces". */
  meta?: string;
};

const layouts = {
  4: { grid: "lg:grid-cols-4", sizes: "(min-width: 64rem) 25vw, 50vw" },
  3: { grid: "md:grid-cols-3", sizes: "(min-width: 48rem) 33vw, 50vw" },
} as const;

// Portrait image tiles linking to a category or collection. 2 columns on mobile, then 3 or 4.
export function CollectionGrid({ collections, columns = 4 }: { collections: CollectionTile[]; columns?: 3 | 4 }) {
  const layout = layouts[columns];
  return (
    <ul className={`grid grid-cols-2 gap-x-2 gap-y-8 md:gap-x-4 ${layout.grid}`}>
      {collections.map((collection) => (
        <li key={collection.href}>
          <Link href={collection.href} className="group block">
            <div className="media-frame aspect-portrait">
              {collection.image && (
                <Image
                  src={collection.image.src}
                  alt={collection.image.alt}
                  fill
                  sizes={layout.sizes}
                  className="transition-transform duration-700 ease-luxe group-hover:scale-[1.03]"
                />
              )}
            </div>
            {/* The whole tile is the link; the name underlines on hover instead of a repeated "Shop" label. */}
            <h3 className="mt-4 font-serif text-title">
              <span className="link-reveal group-hover:bg-size-[100%_1px]">{collection.name}</span>
            </h3>
            {collection.meta && <p className="mt-1 text-body-sm text-ink-muted">{collection.meta}</p>}
          </Link>
        </li>
      ))}
    </ul>
  );
}
