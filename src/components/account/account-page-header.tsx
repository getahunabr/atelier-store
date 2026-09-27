import type { ReactNode } from "react";

// Title block for pages inside the account shell (the shell provides the breadcrumb and menu).
export function AccountPageHeader({ title, description }: { title: string; description?: ReactNode }) {
  return (
    <header>
      <h1 className="font-serif text-heading">{title}</h1>
      {description && <p className="mt-3 max-w-xl text-ink-muted">{description}</p>}
    </header>
  );
}
