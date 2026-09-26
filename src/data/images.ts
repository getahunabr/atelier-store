// Photography: Unsplash (https://unsplash.com/license).
// Widths are added per breakpoint by src/lib/image-loader.ts.

import type { Img } from "@/lib/catalog-types";

export const unsplash = (id: string, alt: string): Img => ({
  src: `https://images.unsplash.com/photo-${id}`,
  alt,
});

/** A zoomed 3:4 crop of the same photo around a focal point (0–1 coordinates), for detail shots. */
export const unsplashDetail = (id: string, alt: string, focus: { x: number; y: number; zoom: number }): Img => ({
  src: `https://images.unsplash.com/photo-${id}?ar=3:4&crop=focalpoint&fp-x=${focus.x}&fp-y=${focus.y}&fp-z=${focus.zoom}`,
  alt,
});
