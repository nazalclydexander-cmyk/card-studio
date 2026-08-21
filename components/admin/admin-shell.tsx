import type { ReactNode } from "react";
import { Suspense } from "react";

import { AdminMobileNav } from "@/components/admin/admin-mobile-nav";
import { AdminSidebar } from "@/components/admin/admin-sidebar";

type AdminShellProps = {
  children: ReactNode;
};

function AdminSidebarFallback() {
  return (
    <aside className="hidden border-r bg-background/95 lg:sticky lg:top-0 lg:flex lg:h-screen lg:w-72 lg:flex-col lg:self-start">
      <div className="flex h-full min-h-0 flex-col overflow-hidden px-5 py-6">
        <div className="shrink-0 space-y-2 px-3">
          <div className="h-3 w-24 rounded bg-muted" />
          <div className="h-6 w-20 rounded bg-muted" />
          <div className="h-4 w-40 rounded bg-muted" />
        </div>

        <div className="mt-8 min-h-0 flex-1 space-y-3 pr-1">
          {Array.from({ length: 5 }).map((_, index) => (
            <div
              key={index}
              className="flex items-start gap-3 rounded-xl border px-3 py-3"
            >
              <div className="h-9 w-9 rounded-lg bg-muted" />
              <div className="min-w-0 flex-1 space-y-2">
                <div className="h-4 w-24 rounded bg-muted" />
                <div className="h-3 w-40 rounded bg-muted" />
              </div>
            </div>
          ))}
        </div>

        <div className="mt-auto shrink-0 space-y-3 border-t pt-5">
          <div className="h-10 rounded bg-muted" />
          <div className="h-10 rounded bg-muted" />
        </div>
      </div>
    </aside>
  );
}

function AdminMobileNavFallback() {
  return (
    <div className="sticky top-0 z-30 border-b bg-background/95 backdrop-blur lg:hidden">
      <div className="flex items-center justify-between gap-3 px-4 py-3 sm:px-6">
        <div className="min-w-0 space-y-2">
          <div className="h-4 w-32 rounded bg-muted" />
          <div className="h-3 w-36 rounded bg-muted" />
        </div>

        <div className="h-10 w-10 rounded-md border bg-muted" />
      </div>
    </div>
  );
}

export function AdminShell({ children }: AdminShellProps) {
  return (
    <div className="min-h-screen bg-muted/20">
      <div className="lg:flex lg:items-start">
        <Suspense fallback={<AdminSidebarFallback />}>
          <AdminSidebar />
        </Suspense>
        <div className="min-w-0 flex-1">
          <Suspense fallback={<AdminMobileNavFallback />}>
            <AdminMobileNav />
          </Suspense>
          <main className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
            {children}
          </main>
        </div>
      </div>
    </div>
  );
}
