import Link from "next/link";

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
      className="rounded-md py-1 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
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
    <footer className="border-t border-black/5">
      <div className="mx-auto grid w-full max-w-7xl gap-8 px-5 py-10 md:grid-cols-[1.3fr_0.8fr_1fr]">
        <div className="space-y-3">
          <p className="text-lg font-semibold">{siteSettings.site_name}</p>
          <p
            className="max-w-xl text-sm leading-6"
            style={{ color: "var(--site-muted)" }}
          >
            {siteSettings.tagline}
          </p>
        </div>

        <div className="grid gap-2 text-sm">
          <Link
            href="/"
            className="rounded-md py-1 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            Home
          </Link>
          <Link
            href="/products"
            className="rounded-md py-1 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            Collection
          </Link>
          <Link
            href="/#categories"
            className="rounded-md py-1 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            Categories
          </Link>
          <Link
            href="/contact"
            className="rounded-md py-1 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            Contact
          </Link>
        </div>

        <div className="space-y-5 text-sm">
          {hasContactDetails ? (
            <div className="space-y-2">
              <p className="font-medium">Contact</p>
              {siteSettings.contact_email ? (
                <a
                  href={`mailto:${siteSettings.contact_email}`}
                  className="block rounded-md hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  {siteSettings.contact_email}
                </a>
              ) : null}
              {siteSettings.contact_phone ? (
                <a
                  href={`tel:${siteSettings.contact_phone}`}
                  className="block rounded-md hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
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
              <p className="font-medium">Follow us</p>
              {siteSettings.facebook_url ? (
                <ExternalLink href={siteSettings.facebook_url} label="Facebook" />
              ) : null}
              {siteSettings.instagram_url ? (
                <ExternalLink
                  href={siteSettings.instagram_url}
                  label="Instagram"
                />
              ) : null}
            </div>
          ) : null}
        </div>
      </div>
    </footer>
  );
}
