import type { ReactNode } from "react";

import { PublicContainer } from "@/components/public/public-container";
import { cn } from "@/lib/utils";

type PublicSectionProps = {
  children: ReactNode;
  className?: string;
  containerClassName?: string;
  id?: string;
};

export function PublicSection({
  children,
  className,
  containerClassName,
  id,
}: PublicSectionProps) {
  return (
    <section id={id} className={cn("py-10 sm:py-12 lg:py-14", className)}>
      <PublicContainer className={containerClassName}>{children}</PublicContainer>
    </section>
  );
}
