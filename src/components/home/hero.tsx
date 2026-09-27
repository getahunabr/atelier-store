import { Bodoni_Moda } from "next/font/google";
import Image from "next/image";
import Link from "next/link";

import type { hero as heroContent } from "@/data/storefront";

// High-contrast Didone for the hero headline only (the rest of the site keeps its fonts until the
// direction is approved). Variable font with an optical-size axis: large sizes get the fine
// hairlines of the display cut.
const display = Bodoni_Moda({
  subsets: ["latin"],
  axes: ["opsz"],
  display: "swap",
});

/**
 * Full-bleed editorial hero. The portrait photograph fills the viewport height; from lg up it sits
 * on the right and dissolves into a backdrop matched to the photo's own charcoal, so the headline
 * gets open space on the left instead of a box. Motion is slow and deliberate: the image settles
 * (Ken Burns), the copy rises in sequence, and the image drifts as the hero scrolls away — all
 * disabled for reduced motion.
 */
export function Hero({ content }: { content: typeof heroContent }) {
  return (
    <section
      aria-labelledby="hero-title"
      className="relative isolate h-[calc(100svh-var(--header-height))] min-h-[36rem] overflow-hidden bg-noir text-ivory"
    >
      {/* Backdrop continues the photo's studio falloff (lighter centre, darker edges). */}
      <div
        aria-hidden="true"
        className="absolute inset-0 -z-10 bg-[radial-gradient(ellipse_at_62%_42%,#3b4344_0%,#262b2c_45%,var(--color-noir)_100%)]"
      />

      <div className="scroll-drift absolute inset-0 -z-10 lg:left-auto lg:w-[64%]">
        <div className="relative h-full w-full animate-ken-burns overflow-hidden motion-reduce:animate-none lg:[mask-image:linear-gradient(to_right,transparent_0%,black_32%)]">
          <Image
            src={content.image.src}
            alt={content.image.alt}
            fill
            sizes="(min-width: 64rem) 64vw, 100vw"
            loading="eager"
            fetchPriority="high"
            className="object-cover object-[50%_22%] lg:object-[50%_28%]"
          />
        </div>
        {/* Small screens: the copy sits over the lower image, so darken it there only. */}
        <div className="absolute inset-0 bg-linear-to-t from-noir via-noir/40 to-transparent lg:hidden" />
      </div>

      <div className="container-page flex h-full flex-col justify-end pb-14 md:pb-20 lg:justify-center lg:pb-0">
        <div className="max-w-xl lg:max-w-[34rem]">
          <p className="flex animate-rise items-center gap-4 text-caption font-medium tracking-[0.32em] text-brass uppercase [animation-delay:300ms] motion-reduce:animate-none">
            <span aria-hidden="true" className="h-px w-10 bg-brass" />
            {content.eyebrow}
          </p>
          <h1
            id="hero-title"
            className={`${display.className} mt-6 animate-rise text-[clamp(3rem,2rem+5.2vw,7rem)] leading-[0.95] font-normal tracking-[0.04em] uppercase [animation-delay:550ms] motion-reduce:animate-none`}
          >
            {content.title}
          </h1>
          <p className="mt-7 max-w-sm animate-rise text-body leading-relaxed font-light tracking-[0.02em] text-ivory/75 [animation-delay:850ms] motion-reduce:animate-none">
            {content.body}
          </p>
          <div className="mt-10 animate-rise [animation-delay:1150ms] motion-reduce:animate-none">
            {/* One quiet call to action: hairline border, spaced small caps, no fill or rounding. */}
            <Link
              href={content.primary.href}
              className="group inline-flex min-h-12 items-center gap-4 border border-ivory/60 px-9 text-caption font-medium tracking-[0.3em] uppercase transition-colors duration-700 ease-luxe hover:border-brass hover:bg-ivory hover:text-noir focus-visible:outline-1 focus-visible:outline-offset-4 focus-visible:outline-brass max-sm:w-full max-sm:justify-center"
            >
              {content.primary.label}
              <span aria-hidden="true" className="h-px w-6 bg-current transition-[width] duration-700 ease-luxe group-hover:w-10" />
            </Link>
          </div>
        </div>
      </div>

      {/* Scroll cue: a brass hairline under the copy column (kept off the photograph), desktop only. */}
      <div aria-hidden="true" className="absolute inset-x-0 bottom-8 hidden lg:block">
        <div className="container-page flex animate-rise items-center gap-4 [animation-delay:1600ms] motion-reduce:animate-none">
          <span className="h-10 w-px bg-linear-to-b from-brass to-transparent" />
          <span className="text-caption tracking-[0.32em] text-ivory/55 uppercase">Scroll</span>
        </div>
      </div>
    </section>
  );
}
