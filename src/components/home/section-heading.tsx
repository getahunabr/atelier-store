import Link from "next/link";

type SectionHeadingProps = {
  id: string;
  eyebrow: string;
  title: string;
  link?: { label: string; href: string };
};

export function SectionHeading({ id, eyebrow, title, link }: SectionHeadingProps) {
  return (
    <div className="flex items-end justify-between gap-6">
      <div>
        <p className="eyebrow text-ink-muted">{eyebrow}</p>
        <h2 id={id} className="mt-2 font-serif text-heading">
          {title}
        </h2>
      </div>
      {link && (
        <Link href={link.href} className="eyebrow link-reveal shrink-0">
          {link.label}
        </Link>
      )}
    </div>
  );
}
