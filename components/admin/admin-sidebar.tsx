"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { LogoutButton } from "@/components/logout-button";
import { adminNavItems } from "@/components/admin/config";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

function isActivePath(pathname: string, href: string) {
  if (href === "/admin") {
    return pathname === href;
  }

  return pathname === href || pathname.startsWith(`${href}/`);
}

export function AdminSidebar() {
  const pathname = usePathname();

  return (
    <aside className="hidden border-r bg-background/95 lg:sticky lg:top-0 lg:flex lg:h-screen lg:w-72 lg:flex-col lg:self-start">
      <div className="flex h-full min-h-0 flex-col overflow-hidden px-5 py-6">
        <div className="shrink-0 space-y-1 px-3">
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-muted-foreground">
            Card Studio
          </p>
          <p className="text-lg font-semibold tracking-tight">Admin</p>
          <p className="text-sm text-muted-foreground">
            Manage the catalog and customer activity.
          </p>
        </div>

        <div className="mt-8 min-h-0 flex-1 overflow-y-auto">
          <nav className="space-y-1 pr-1" aria-label="Admin navigation">
            {adminNavItems.map((item) => {
              const active = isActivePath(pathname, item.href);
              const Icon = item.icon;

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    "flex items-start gap-3 rounded-xl px-3 py-3 text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                    active
                      ? "bg-primary/8 text-foreground"
                      : "text-muted-foreground hover:bg-accent hover:text-foreground",
                  )}
                >
                  <span
                    className={cn(
                      "mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border",
                      active
                        ? "border-primary/20 bg-primary/10 text-primary"
                        : "border-border bg-background text-muted-foreground",
                    )}
                  >
                    <Icon className="h-4 w-4" />
                  </span>
                  <span className="min-w-0 space-y-1">
                    <span className="block font-medium">{item.label}</span>
                    <span className="block text-xs leading-5 text-muted-foreground">
                      {item.description}
                    </span>
                  </span>
                </Link>
              );
            })}
          </nav>
        </div>

        <div className="mt-auto shrink-0 space-y-3 border-t pt-5">
          <Button asChild className="w-full justify-start" variant="outline">
            <Link href="/">View Website</Link>
          </Button>
          <LogoutButton className="w-full justify-start" variant="outline" />
        </div>
      </div>
    </aside>
  );
}
