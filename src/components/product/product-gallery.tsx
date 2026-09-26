import Image from "next/image";

import type { Img } from "@/data/images";

// Mobile: full-bleed swipe gallery with the next image peeking in. Desktop: large stacked images.
export function ProductGallery({ images, name }: { images: Img[]; name: string }) {
  return (
    <ul
      aria-label={`${name} images`}
      tabIndex={0}
      className="rail focus-visible:outline-offset-[-1px] lg:grid lg:gap-2 lg:overflow-visible lg:px-0"
    >
      {images.map((image, index) => (
        <li key={image.src} className="w-[88%] sm:w-[60%] lg:w-auto">
          <div className="media-frame aspect-product">
            <Image
              src={image.src}
              alt={image.alt}
              fill
              sizes="(min-width: 64rem) 55vw, (min-width: 40rem) 60vw, 88vw"
              {...(index === 0 ? { loading: "eager", fetchPriority: "high" } : {})}
            />
          </div>
        </li>
      ))}
    </ul>
  );
}
