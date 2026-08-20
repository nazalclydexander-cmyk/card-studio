"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { getSiteAssetPublicUrl } from "@/lib/site-assets";
import type { SiteSettings } from "@/lib/site-settings-config";
import { cn } from "@/lib/utils";

const navigationItems = [
  { label: "Home", href: "/" },
  { label: "Collection", href: "/products" },
  { label: "Categories", href: "/#categories" },
  { label: "Contact", href: "/contact" },
];

type PublicHeaderProps = {
  siteSettings: SiteSettings;
};

export function PublicHeader({ siteSettings }: PublicHeaderProps) {
  const [open, setOpen] = useState(false);
  const logoUrl = getSiteAssetPublicUrl(siteSettings.logo_path);

  return (
    <header className="sticky top-0 z-40 border-b border-black/5 bg-[color:color-mix(in_srgb,var(--site-background)_82%,white)]/90 backdrop-blur">
      <div className="mx-auto flex w-full max-w-7xl items-center justify-between gap-4 px-5 py-4">
        <Link
          href="/"
          className="min-w-0 rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
        >
          <div className="flex items-center gap-3">
            {logoUrl ? (
              <div className="relative h-12 w-12 flex-none overflow-hidden rounded-xl border border-black/10 bg-white/70 sm:h-14 sm:w-14">
                <Image
                  src={logoUrl}
                  alt={`${siteSettings.site_name} logo`}
                  fill
                  sizes="56px"
                  className="object-contain p-1.5"
                />
              </div>
            ) : null}

            <div className="min-w-0 space-y-1">
              <p className="truncate text-lg font-semibold tracking-[0.02em]">
                {siteSettings.site_name}
              </p>
              <p
                className="hidden truncate text-sm sm:block"
                style={{ color: "var(--site-muted)" }}
              >
                {siteSettings.tagline}
              </p>
            </div>
          </div>
        </Link>

        <nav className="hidden items-center gap-2 md:flex" aria-label="Primary">
          {navigationItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="rounded-full px-4 py-2 text-sm font-medium transition-colors hover:bg-black/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <Button
          type="button"
          variant="outline"
          size="sm"
          className="md:hidden"
          style={{ borderRadius: "var(--site-button-radius)" }}
          aria-expanded={open}
          aria-controls="public-mobile-navigation"
          onClick={() => setOpen((current) => !current)}
        >
          {open ? "Close" : "Menu"}
        </Button>
      </div>

      <div
        id="public-mobile-navigation"
        className={cn(
          "overflow-hidden border-t border-black/5 transition-[max-height,opacity] duration-200 md:hidden",
          open ? "max-h-80 opacity-100" : "max-h-0 opacity-0",
        )}
      >
        <nav
          className="mx-auto flex w-full max-w-7xl flex-col gap-2 px-5 py-4"
          aria-label="Mobile primary"
        >
          {navigationItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="rounded-xl px-4 py-3 text-sm font-medium transition-colors hover:bg-black/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              onClick={() => setOpen(false)}
            >
              {item.label}
            </Link>
          ))}
        </nav>
      </div>
    </header>
  );
}
