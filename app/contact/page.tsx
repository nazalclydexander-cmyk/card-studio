import Image from "next/image";
import Link from "next/link";
import { Suspense } from "react";

import { ContactInquiryForm } from "@/components/public/contact-inquiry-form";
import { PublicFooter } from "@/components/public/public-footer";
import { PublicHeader } from "@/components/public/public-header";
import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  getPrimaryProductImageUrl,
  type PublicProduct,
} from "@/lib/public-catalog-shared";
import { getPublicProductBySlug } from "@/lib/public-catalog";
import { getSiteSettings } from "@/lib/site-settings";

export const metadata = {
  title: "Contact",
  description: "Send an inquiry about a card or invitation design.",
};

type ContactPageProps = {
  searchParams: Promise<{
    product?: string;
    submitted?: string;
  }>;
};

function ContactFallback() {
  return (
    <main className="min-h-screen">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-8 px-5 py-12">
        <div className="h-4 w-40 rounded bg-muted" />
        <div className="h-14 w-full max-w-2xl rounded bg-muted" />
        <div className="h-80 w-full rounded bg-muted/60" />
      </div>
    </main>
  );
}

function ProductContextCard({
  product,
}: {
  product: PublicProduct | null;
}) {
  if (!product) {
    return null;
  }

  const imageUrl = getPrimaryProductImageUrl(product);

  return (
    <div
      className="grid gap-4 rounded-[calc(var(--site-card-radius)+0.1rem)] border p-4 shadow-sm sm:grid-cols-[96px_minmax(0,1fr)]"
      style={{
        backgroundColor: "var(--site-surface)",
        borderColor: "color-mix(in srgb, var(--site-text) 10%, transparent)",
      }}
    >
      <div
        className="relative flex aspect-square items-center justify-center overflow-hidden rounded-xl border"
        style={{
          backgroundColor: "color-mix(in srgb, var(--site-secondary) 12%, white)",
          borderColor: "color-mix(in srgb, var(--site-text) 8%, transparent)",
        }}
      >
        {imageUrl ? (
          <Image
            src={imageUrl}
            alt={product.name}
            fill
            sizes="96px"
            className="object-contain p-2"
          />
        ) : (
          <div className="px-3 text-center text-xs" style={{ color: "var(--site-muted)" }}>
            No image
          </div>
        )}
      </div>

      <div className="space-y-2">
        <p
          className="text-sm font-semibold uppercase tracking-[0.24em]"
          style={{ color: "var(--site-accent)" }}
        >
          You&apos;re inquiring about
        </p>
        <h2 className="text-2xl leading-tight">{product.name}</h2>
        {product.short_description?.trim() ? (
          <p className="text-sm leading-6" style={{ color: "var(--site-muted)" }}>
            {product.short_description}
          </p>
        ) : null}
      </div>
    </div>
  );
}

function ContactInformationCard({
  siteSettings,
}: {
  siteSettings: Awaited<ReturnType<typeof getSiteSettings>>;
}) {
  const hasContactInfo = Boolean(
    siteSettings.contact_email ||
      siteSettings.contact_phone ||
      siteSettings.business_address,
  );
  const hasSocialLinks = Boolean(
    siteSettings.facebook_url || siteSettings.instagram_url,
  );

  if (!hasContactInfo && !hasSocialLinks) {
    return null;
  }

  return (
    <aside
      className="space-y-6 rounded-[calc(var(--site-card-radius)+0.15rem)] border p-6 shadow-sm"
      style={{
        backgroundColor: "var(--site-surface)",
        borderColor: "color-mix(in srgb, var(--site-text) 10%, transparent)",
      }}
    >
      {hasContactInfo ? (
        <div className="space-y-4">
          <div className="space-y-1">
            <h2 className="text-2xl">Contact Information</h2>
            <p className="text-sm" style={{ color: "var(--site-muted)" }}>
              Reach out directly using any available channel below.
            </p>
          </div>

          <div className="space-y-3 text-sm">
            {siteSettings.contact_email ? (
              <div className="space-y-1">
                <p className="font-medium">Email</p>
                <a
                  href={`mailto:${siteSettings.contact_email}`}
                  className="hover:underline"
                >
                  {siteSettings.contact_email}
                </a>
              </div>
            ) : null}

            {siteSettings.contact_phone ? (
              <div className="space-y-1">
                <p className="font-medium">Phone</p>
                <a
                  href={`tel:${siteSettings.contact_phone}`}
                  className="hover:underline"
                >
                  {siteSettings.contact_phone}
                </a>
              </div>
            ) : null}

            {siteSettings.business_address ? (
              <div className="space-y-1">
                <p className="font-medium">Address</p>
                <p style={{ color: "var(--site-muted)" }}>
                  {siteSettings.business_address}
                </p>
              </div>
            ) : null}
          </div>
        </div>
      ) : null}

      {hasSocialLinks ? (
        <div className="space-y-3 text-sm">
          <h3 className="text-lg font-semibold">Follow Us</h3>
          <div className="flex flex-col gap-2">
            {siteSettings.facebook_url ? (
              <a
                href={siteSettings.facebook_url}
                target="_blank"
                rel="noopener noreferrer"
                className="hover:underline"
              >
                Facebook
              </a>
            ) : null}
            {siteSettings.instagram_url ? (
              <a
                href={siteSettings.instagram_url}
                target="_blank"
                rel="noopener noreferrer"
                className="hover:underline"
              >
                Instagram
              </a>
            ) : null}
          </div>
        </div>
      ) : null}
    </aside>
  );
}

async function ContactContent({ searchParams }: ContactPageProps) {
  const resolvedSearchParams = await searchParams;
  const [siteSettings, product] = await Promise.all([
    getSiteSettings(),
    resolvedSearchParams.product
      ? getPublicProductBySlug(resolvedSearchParams.product)
      : Promise.resolve(null),
  ]);

  const submitted = resolvedSearchParams.submitted === "1";
  const requestedProductSlug =
    typeof resolvedSearchParams.product === "string"
      ? resolvedSearchParams.product.trim().toLowerCase()
      : "";
  const invalidProductSelection =
    Boolean(requestedProductSlug) && !product;

  return (
    <>
      <PublicHeader siteSettings={siteSettings} />

      <main className="min-h-screen">
        <div className="mx-auto flex w-full max-w-6xl flex-col gap-8 px-5 py-12">
          <div className="space-y-3">
            <p
              className="text-sm font-semibold uppercase tracking-[0.28em]"
              style={{ color: "var(--site-accent)" }}
            >
              Contact
            </p>
            <h1 className="text-4xl sm:text-5xl">Let&apos;s talk about your design</h1>
            <p
              className="max-w-3xl text-sm leading-6 sm:text-base"
              style={{ color: "var(--site-muted)" }}
            >
              Tell us a little about the invitation or greeting card design
              you&apos;re interested in, and we&apos;ll follow up using the
              contact details you provide.
            </p>
          </div>

          {invalidProductSelection ? (
            <Card>
              <CardHeader>
                <CardTitle>Selected product unavailable</CardTitle>
                <CardDescription>
                  That design could not be found publicly, so you can continue
                  with a general inquiry instead.
                </CardDescription>
              </CardHeader>
            </Card>
          ) : null}

          <ProductContextCard product={product} />

          {submitted ? (
            <div
              className="rounded-[calc(var(--site-card-radius)+0.15rem)] border px-6 py-10 shadow-sm"
              style={{
                backgroundColor: "var(--site-surface)",
                borderColor:
                  "color-mix(in srgb, var(--site-text) 10%, transparent)",
              }}
            >
              <div className="max-w-2xl space-y-4">
                <h2 className="text-3xl">Inquiry received</h2>
                <p className="text-base leading-7" style={{ color: "var(--site-muted)" }}>
                  Thank you for your interest
                  {product ? " in this design" : ""}. We&apos;ll get back to you
                  using the contact details you provided.
                </p>
                <div className="flex flex-col gap-3 sm:flex-row">
                  <Button
                    asChild
                    style={{
                      backgroundColor: "var(--site-primary)",
                      color: "var(--site-surface)",
                      borderRadius: "var(--site-button-radius)",
                    }}
                  >
                    <Link href="/products">Back to collection</Link>
                  </Button>
                  {product ? (
                    <Button
                      asChild
                      variant="outline"
                      style={{ borderRadius: "var(--site-button-radius)" }}
                    >
                      <Link href={`/products/${product.slug}`}>
                        View design again
                      </Link>
                    </Button>
                  ) : null}
                </div>
              </div>
            </div>
          ) : (
            <div className="grid gap-6 lg:grid-cols-[minmax(0,1.2fr)_minmax(280px,0.8fr)] lg:items-start">
              <div
                className="rounded-[calc(var(--site-card-radius)+0.15rem)] border p-6 shadow-sm"
                style={{
                  backgroundColor: "var(--site-surface)",
                  borderColor:
                    "color-mix(in srgb, var(--site-text) 10%, transparent)",
                }}
              >
                <ContactInquiryForm productSlug={product?.slug ?? null} />
              </div>

              <ContactInformationCard siteSettings={siteSettings} />
            </div>
          )}
        </div>
      </main>

      <PublicFooter siteSettings={siteSettings} />
    </>
  );
}

export default function ContactPage(props: ContactPageProps) {
  return (
    <Suspense fallback={<ContactFallback />}>
      <ContactContent {...props} />
    </Suspense>
  );
}
