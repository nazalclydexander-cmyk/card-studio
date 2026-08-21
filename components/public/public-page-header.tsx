import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

type PublicPageHeaderProps = {
  eyebrow?: string;
  title: string;
  description?: string;
  actions?: ReactNode;
  className?: string;
};

export function PublicPageHeader({
  eyebrow,
  title,
  description,
  actions,
  className,
}: PublicPageHeaderProps) {
  return (
    <div className={cn("space-y-5", className)}>
      <div className="space-y-3">
        {eyebrow ? (
          <p
            className="text-sm font-semibold uppercase tracking-[0.24em]"
            style={{ color: "var(--site-accent)" }}
          >
            {eyebrow}
          </p>
        ) : null}
        <h1 className="max-w-4xl text-4xl leading-tight sm:text-5xl lg:text-[3rem] lg:leading-[1.08]">
          {title}
        </h1>
        {description ? (
          <p
            className="max-w-3xl text-base leading-7 sm:text-lg"
            style={{ color: "var(--site-muted)" }}
          >
            {description}
          </p>
        ) : null}
      </div>

      {actions ? <div className="flex flex-wrap gap-3">{actions}</div> : null}
    </div>
  );
}
