import Image from "next/image";
import Link from "next/link";

type EditorialSplitProps = {
  id: string;
  content: {
    eyebrow: string;
    title: string;
    body: string;
    cta: { label: string; href: string };
    image: { src: string; alt: string };
  };
  /** Put the image on the right from md up. */
  reverse?: boolean;
  tone?: "surface" | "canvas";
};

// Full-bleed image tile abutting a text panel; stacks image-first on mobile.
export function EditorialSplit({ id, content, reverse = false, tone = "surface" }: EditorialSplitProps) {
  return (
    <section aria-labelledby={id} className="split">
      <div className={`media-frame aspect-portrait md:aspect-auto md:min-h-[40rem] ${reverse ? "md:order-2" : ""}`}>
        <Image src={content.image.src} alt={content.image.alt} fill sizes="(min-width: 48rem) 50vw, 100vw" />
      </div>
      <div
        className={`flex items-center justify-center px-gutter py-section ${tone === "surface" ? "bg-surface" : "bg-canvas"}`}
      >
        <div className="max-w-md text-center">
          <p className="eyebrow text-ink-muted">{content.eyebrow}</p>
          <h2 id={id} className="mt-3 font-serif text-heading">
            {content.title}
          </h2>
          <p className="mt-5 text-ink-muted">{content.body}</p>
          <Link href={content.cta.href} className="btn btn-secondary mt-8">
            {content.cta.label}
          </Link>
        </div>
      </div>
    </section>
  );
}
