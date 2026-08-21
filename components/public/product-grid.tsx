import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

type ProductGridProps = {
  children: ReactNode;
  className?: string;
};

export function ProductGrid({ children, className }: ProductGridProps) {
  return (
    <div
      className={cn(
        "grid gap-6 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4",
        className,
      )}
    >
      {children}
    </div>
  );
}
