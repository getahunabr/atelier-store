import Image from "next/image";
import Link from "next/link";

import type { Collection } from "@/data/storefront";

export function CollectionGrid({ collections }: { collections: Collection[] }) {
  return (
    <ul className="grid grid-cols-2 gap-x-2 gap-y-8 md:gap-x-4 lg:grid-cols-4">
      {collections.map((collection) => (
        <li key={collection.href}>
          <Link href={collection.href} className="group block">
            <div className="media-frame aspect-portrait">
              <Image
                src={collection.image.src}
                alt={collection.image.alt}
                fill
                sizes="(min-width: 64rem) 25vw, 50vw"
                className="transition-transform duration-700 ease-luxe group-hover:scale-[1.03]"
              />
            </div>
            <div className="mt-4 flex items-baseline justify-between gap-2">
              <h3 className="font-serif text-title">{collection.name}</h3>
              <span className="eyebrow link-reveal text-ink-muted group-hover:bg-size-[100%_1px] max-sm:hidden">
                Shop
              </span>
            </div>
          </Link>
        </li>
      ))}
    </ul>
  );
}
