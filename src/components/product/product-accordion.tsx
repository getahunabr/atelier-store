import type { ReactNode } from "react";

import { PlusIcon } from "@/components/icons";

// Native <details>: keyboard and screen-reader support with no client JS.
export function ProductAccordion({ sections }: { sections: { title: string; content: ReactNode }[] }) {
  return (
    <div className="border-t border-line">
      {sections.map((section) => (
        <details key={section.title} className="group border-b border-line">
          <summary className="flex min-h-14 cursor-pointer list-none items-center justify-between gap-4 eyebrow [&::-webkit-details-marker]:hidden">
            {section.title}
            <PlusIcon className="size-4 transition-transform duration-300 ease-luxe group-open:rotate-45" />
          </summary>
          <div className="pb-6 text-body-sm text-ink-muted">{section.content}</div>
        </details>
      ))}
    </div>
  );
}
