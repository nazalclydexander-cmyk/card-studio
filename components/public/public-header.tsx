"use client";

import Image from "next/image";
import Link from "next/link";
import { Menu, X } from "lucide-react";
import { useEffect, useState } from "react";

import { PublicContainer } from "@/components/public/public-container";
import { Button } from "@/components/ui/button";
import { getSiteAssetPublicUrl } from "@/lib/site-assets";
import type { SiteSettings } from "@/lib/site-settings-config";
import { cn } from "@/lib/utils";

const navigationItems = [
  { label: "Home", href: "/" },
  { label: "Collection", href: "/products" },
  { label: "Categories", href: "/#categories" },
  { label: "Contact", href: "/contact" },
] as const;

type PublicHeaderProps = {
  siteSettings: SiteSettings;
  currentPath: "/" | "/products" | "/contact" | `/products/${string}`;
};

function isActiveLink(
  currentPath: PublicHeaderProps["currentPath"],
  href: (typeof navigationItems)[number]["href"],
) {
  if (href === "/") {
    return currentPath === "/";
  }

  if (href === "/products") {
    return currentPath === "/products" || currentPath.startsWith("/products/");
  }

  if (href === "/contact") {
    return currentPath === "/contact";
  }

  return false;
}

export function PublicHeader({ siteSettings, currentPath }: PublicHeaderProps) {
  const [open, setOpen] = useState(false);
  const logoUrl = getSiteAssetPublicUrl(siteSettings.logo_path);

  useEffect(() => {
    if (!open) {
      return;
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setOpen(false);
      }
    }

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [open]);

  return (
    <header className="sticky top-0 z-40 border-b border-black/5 bg-[color:color-mix(in_srgb,var(--site-background)_88%,white)]/95 backdrop-blur supports-[backdrop-filter]:bg-[color:color-mix(in_srgb,var(--site-background)_86%,white)]/85">
      <PublicContainer className="flex items-center justify-between gap-4 py-3.5">
        <Link
          href="/"
          className="min-w-0 rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          onClick={() => setOpen(false)}
        >
          <div className="flex items-center gap-3">
            {logoUrl ? (
              <div className="relative h-11 w-11 flex-none overflow-hidden rounded-xl border border-black/10 bg-white/70 sm:h-12 sm:w-12">
                <Image
                  src={logoUrl}
                  alt={`${siteSettings.site_name} logo`}
                  fill
                  sizes="48px"
                  className="object-contain p-1.5"
                />
              </div>
            ) : null}

            <div className="min-w-0 space-y-0.5">
              <p className="truncate text-lg font-semibold tracking-[0.01em]">
                {siteSettings.site_name}
              </p>
              <p
                className="hidden max-w-[32rem] truncate text-sm md:block"
                style={{ color: "var(--site-muted)" }}
              >
                {siteSettings.tagline}
              </p>
            </div>
          </div>
        </Link>

        <nav className="hidden items-center gap-1 md:flex" aria-label="Primary">
          {navigationItems.map((item) => {
            const active = isActiveLink(currentPath, item.href);

            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "rounded-full px-4 py-2 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                  active ? "text-foreground" : "text-muted-foreground hover:text-foreground",
                )}
                style={
                  active
                    ? {
                        backgroundColor:
                          "color-mix(in srgb, var(--site-primary) 10%, white)",
                      }
                    : undefined
                }
              >
                {item.label}
              </Link>
            );
          })}

          <Button
            asChild
            variant="outline"
            className="ml-3"
            style={{ borderRadius: "var(--site-button-radius)" }}
          >
            <Link href="/contact">Request Design</Link>
          </Button>
        </nav>

        <Button
          type="button"
          variant="outline"
          size="icon"
          className="md:hidden"
          style={{ borderRadius: "var(--site-button-radius)" }}
          aria-expanded={open}
          aria-controls="public-mobile-navigation"
          aria-label={open ? "Close menu" : "Open menu"}
          onClick={() => setOpen((current) => !current)}
        >
          {open ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
        </Button>
      </PublicContainer>

      <div
        className={cn(
          "md:hidden",
          open ? "pointer-events-auto" : "pointer-events-none",
        )}
      >
        <div
          className={cn(
            "fixed inset-x-0 top-[73px] bottom-0 bg-black/20 transition-opacity",
            open ? "opacity-100" : "opacity-0",
          )}
          onClick={() => setOpen(false)}
          aria-hidden="true"
        />
        <div
          id="public-mobile-navigation"
          className={cn(
            "absolute inset-x-0 top-full border-b border-black/5 bg-[color:var(--site-surface)] shadow-lg transition-[opacity,transform]",
            open ? "translate-y-0 opacity-100" : "-translate-y-2 opacity-0",
          )}
        >
          <PublicContainer>
            <nav
              className="flex flex-col gap-2 py-4"
              aria-label="Mobile primary"
            >
              {navigationItems.map((item) => {
                const active = isActiveLink(currentPath, item.href);

                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    aria-current={active ? "page" : undefined}
                    className={cn(
                      "rounded-2xl px-4 py-3 text-base font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                      active
                        ? "text-foreground"
                        : "text-muted-foreground hover:text-foreground",
                    )}
                    style={
                      active
                        ? {
                            backgroundColor:
                              "color-mix(in srgb, var(--site-primary) 10%, white)",
                          }
                        : undefined
                    }
                    onClick={() => setOpen(false)}
                  >
                    {item.label}
                  </Link>
                );
              })}

              <Button
                asChild
                className="mt-2 w-full"
                style={{
                  backgroundColor: "var(--site-primary)",
                  color: "var(--site-surface)",
                  borderRadius: "var(--site-button-radius)",
                }}
              >
                <Link href="/contact" onClick={() => setOpen(false)}>
                  Request Design
                </Link>
              </Button>
            </nav>
          </PublicContainer>
        </div>
      </div>
    </header>
  );
}
