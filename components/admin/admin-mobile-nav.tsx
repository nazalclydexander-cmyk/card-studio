"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu } from "lucide-react";

import { LogoutButton } from "@/components/logout-button";
import { adminNavItems } from "@/components/admin/config";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

function isActivePath(pathname: string, href: string) {
  if (href === "/admin") {
    return pathname === href;
  }

  return pathname === href || pathname.startsWith(`${href}/`);
}

export function AdminMobileNav() {
  const pathname = usePathname();

  return (
    <div className="sticky top-0 z-30 border-b bg-background/95 backdrop-blur lg:hidden">
      <div className="flex items-center justify-between gap-3 px-4 py-3 sm:px-6">
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold tracking-tight">
            Card Studio Admin
          </p>
          <p className="truncate text-xs text-muted-foreground">
            Manage catalog and inquiries
          </p>
        </div>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="outline"
              size="icon"
              aria-label="Open admin navigation"
            >
              <Menu className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-72">
            <DropdownMenuLabel>Admin navigation</DropdownMenuLabel>
            {adminNavItems.map((item) => {
              const active = isActivePath(pathname, item.href);
              const Icon = item.icon;

              return (
                <DropdownMenuItem
                  key={item.href}
                  asChild
                  className={cn(active && "bg-accent text-accent-foreground")}
                >
                  <Link href={item.href} aria-current={active ? "page" : undefined}>
                    <Icon className="h-4 w-4" />
                    <div className="min-w-0">
                      <span className="block font-medium">{item.label}</span>
                      <span className="block truncate text-xs text-muted-foreground">
                        {item.description}
                      </span>
                    </div>
                  </Link>
                </DropdownMenuItem>
              );
            })}
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild>
              <Link href="/">View Website</Link>
            </DropdownMenuItem>
            <div className="px-1 pt-1">
              <LogoutButton className="w-full justify-start" variant="ghost" />
            </div>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
}
