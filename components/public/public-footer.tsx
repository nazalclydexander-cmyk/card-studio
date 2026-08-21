import Link from "next/link";

import { PublicContainer } from "@/components/public/public-container";
import type { SiteSettings } from "@/lib/site-settings-config";

type PublicFooterProps = {
  siteSettings: SiteSettings;
};

function ExternalLink({ href, label }: { href: string; label: string }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="rounded-md py-1 transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
    >
      {label}
    </a>
  );
}

export function PublicFooter({ siteSettings }: PublicFooterProps) {
  const hasContactDetails = Boolean(
    siteSettings.contact_email ||
      siteSettings.contact_phone ||
      siteSettings.business_address,
  );
  const hasSocialLinks = Boolean(
    siteSettings.facebook_url || siteSettings.instagram_url,
  );

  return (
    <footer className="border-t border-black/5 bg-[color:color-mix(in_srgb,var(--site-surface)_92%,white)]">
      <PublicContainer className="grid gap-10 py-10 md:grid-cols-[1.2fr_0.8fr_1fr] lg:py-12">
        <div className="space-y-4">
          <div className="space-y-2">
            <p className="text-xl font-semibold">{siteSettings.site_name}</p>
            <p
              className="max-w-md text-sm leading-6"
              style={{ color: "var(--site-muted)" }}
            >
              {siteSettings.tagline}
            </p>
          </div>
        </div>

        <div className="space-y-3 text-sm">
          <p className="font-medium">Explore</p>
          <div className="grid gap-2">
            <Link
              href="/"
              className="rounded-md py-1 transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              Home
            </Link>
            <Link
              href="/products"
              className="rounded-md py-1 transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              Collection
            </Link>
            <Link
              href="/#categories"
              className="rounded-md py-1 transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              Categories
            </Link>
            <Link
              href="/contact"
              className="rounded-md py-1 transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              Contact
            </Link>
          </div>
        </div>

        <div className="space-y-5 text-sm">
          {hasContactDetails ? (
            <div className="space-y-2">
              <p className="font-medium">Contact</p>
              {siteSettings.contact_email ? (
                <a
                  href={`mailto:${siteSettings.contact_email}`}
                  className="block rounded-md py-1 transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  {siteSettings.contact_email}
                </a>
              ) : null}
              {siteSettings.contact_phone ? (
                <a
                  href={`tel:${siteSettings.contact_phone}`}
                  className="block rounded-md py-1 transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  {siteSettings.contact_phone}
                </a>
              ) : null}
              {siteSettings.business_address ? (
                <p style={{ color: "var(--site-muted)" }}>
                  {siteSettings.business_address}
                </p>
              ) : null}
            </div>
          ) : null}

          {hasSocialLinks ? (
            <div className="space-y-2">
              <p className="font-medium">Follow</p>
              {siteSettings.facebook_url ? (
                <ExternalLink href={siteSettings.facebook_url} label="Facebook" />
              ) : null}
              {siteSettings.instagram_url ? (
                <ExternalLink href={siteSettings.instagram_url} label="Instagram" />
              ) : null}
            </div>
          ) : null}
        </div>
      </PublicContainer>
    </footer>
  );
}
