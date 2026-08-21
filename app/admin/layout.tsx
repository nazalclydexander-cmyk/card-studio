import type { ReactNode } from "react";
import { Suspense } from "react";

import { AdminShell } from "@/components/admin/admin-shell";

type AdminLayoutProps = {
  children: ReactNode;
};

export default function AdminLayout({ children }: AdminLayoutProps) {
  return (
    <Suspense fallback={null}>
      <AdminShell>{children}</AdminShell>
    </Suspense>
  );
}
