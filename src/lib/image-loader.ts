"use client";

import type { ImageLoaderProps } from "next/image";

// Global next/image loader (see next.config.ts). Unsplash sits on imgix, which resizes and
// re-encodes at the edge, so we request each srcset width directly instead of proxying the
// full-size original through the Next.js optimizer.
// When product media moves to our own storage, add its CDN transform here.
export default function imageLoader({ src, width, quality }: ImageLoaderProps) {
  if (src.startsWith("https://images.unsplash.com/")) {
    const url = new URL(src);
    url.searchParams.set("auto", "format");
    url.searchParams.set("fit", "crop");
    url.searchParams.set("w", String(width));
    url.searchParams.set("q", String(quality ?? 75));
    return url.toString();
  }
  return src;
}
