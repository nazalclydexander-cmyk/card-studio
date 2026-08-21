import Image from "next/image";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Suspense } from "react";

import { ContactInquiryForm } from "@/components/public/contact-inquiry-form";
import { PublicContainer } from "@/components/public/public-container";
import { PublicFooter } from "@/components/public/public-footer";
import { PublicHeader } from "@/components/public/public-header";
import { PublicPageHeader } from "@/components/public/public-page-header";
import { PublicStateCard } from "@/components/public/public-state-card";
import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  getPrimaryProductImageUrl,
  type PublicProduct,
} from "@/lib/public-catalog-shared";
import { getPublicProductBySlugResult } from "@/lib/public-catalog";
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
      <PublicContainer className="flex w-full flex-col gap-8 py-10 sm:py-12">
        <div className="h-4 w-40 rounded bg-muted" />
        <div className="h-14 w-full max-w-2xl rounded bg-muted" />
        <div className="h-80 w-full rounded bg-muted/60" />
      </PublicContainer>
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
      className="grid gap-4 rounded-[calc(var(--site-card-radius)+0.15rem)] border bg-[color:var(--site-surface)] p-4 shadow-[0_14px_36px_rgba(15,23,42,0.04)] sm:grid-cols-[128px_minmax(0,1fr)] sm:p-5"
      style={{
        borderColor: "color-mix(in srgb, var(--site-text) 10%, transparent)",
      }}
    >
      <div
        className="relative flex aspect-square items-center justify-center overflow-hidden rounded-[calc(var(--site-card-radius)+0.1rem)] border"
        style={{
          background:
            "linear-gradient(180deg, color-mix(in srgb, var(--site-secondary) 14%, white) 0%, color-mix(in srgb, var(--site-background) 92%, white) 100%)",
          borderColor: "color-mix(in srgb, var(--site-text) 8%, transparent)",
        }}
      >
        <div
          aria-hidden="true"
          className="absolute inset-[10%] rounded-[calc(var(--site-card-radius)-0.1rem)] border bg-white/85 shadow-sm"
          style={{
            borderColor: "color-mix(in srgb, var(--site-text) 6%, transparent)",
          }}
        />
        {imageUrl ? (
          <Image
            src={imageUrl}
            alt={product.name}
            fill
            sizes="128px"
            className="object-contain p-3"
          />
        ) : (
          <div className="relative z-10 px-3 text-center text-xs" style={{ color: "var(--site-muted)" }}>
            Design selected
          </div>
        )}
      </div>

      <div className="space-y-2">
        <p
          className="text-xs font-semibold uppercase tracking-[0.24em]"
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
      className="space-y-6 rounded-[calc(var(--site-card-radius)+0.2rem)] border bg-[color:var(--site-surface)] p-6 shadow-[0_16px_40px_rgba(15,23,42,0.04)]"
      style={{
        borderColor: "color-mix(in srgb, var(--site-text) 10%, transparent)",
      }}
    >
      {hasContactInfo ? (
        <div className="space-y-4">
          <div className="space-y-1">
            <h2 className="text-2xl">Contact information</h2>
            <p className="text-sm leading-6" style={{ color: "var(--site-muted)" }}>
              Reach out directly if you already know the design you want.
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
          <h3 className="text-lg font-semibold">Follow us</h3>
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
  const [siteSettings, productResult] = await Promise.all([
    getSiteSettings(),
    resolvedSearchParams.product
      ? getPublicProductBySlugResult(resolvedSearchParams.product)
      : Promise.resolve({ product: null, hasError: false }),
  ]);

  const submitted = resolvedSearchParams.submitted === "1";
  const requestedProductSlug =
    typeof resolvedSearchParams.product === "string"
      ? resolvedSearchParams.product.trim().toLowerCase()
      : "";
  const product = productResult.product;
  const invalidProductSelection =
    Boolean(requestedProductSlug) && !product && !productResult.hasError;

  return (
    <>
      <PublicHeader siteSettings={siteSettings} currentPath="/contact" />

      <main className="min-h-screen">
        <PublicContainer className="flex w-full flex-col gap-8 py-10 sm:py-12">
          <div
            className="rounded-[calc(var(--site-card-radius)+0.35rem)] border px-6 py-8 shadow-[0_18px_45px_rgba(15,23,42,0.05)] sm:px-8"
            style={{
              background:
                "linear-gradient(180deg, color-mix(in srgb, var(--site-surface) 94%, white) 0%, color-mix(in srgb, var(--site-secondary) 11%, white) 100%)",
              borderColor: "color-mix(in srgb, var(--site-text) 9%, transparent)",
            }}
          >
            <PublicPageHeader
              eyebrow="Contact"
              title={"Let's talk about your design"}
              description={
                "Tell us about the invitation or greeting card design you're considering, and we'll follow up using the contact details you provide."
              }
              actions={
                <Button asChild variant="link" className="h-auto px-0">
                  <Link href="/products">
                    Browse collection
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                </Button>
              }
            />
          </div>

          {productResult.hasError ? (
            <PublicStateCard
              title="We couldn't load the selected design right now"
              description="You can still continue with a general inquiry below, or try the product link again in a moment."
            />
          ) : invalidProductSelection ? (
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
              className="rounded-[calc(var(--site-card-radius)+0.2rem)] border bg-[color:var(--site-surface)] px-6 py-10 shadow-[0_16px_40px_rgba(15,23,42,0.05)]"
              style={{
                borderColor:
                  "color-mix(in srgb, var(--site-text) 10%, transparent)",
              }}
            >
              <div className="max-w-2xl space-y-4">
                <p
                  className="text-xs font-semibold uppercase tracking-[0.24em]"
                  style={{ color: "var(--site-accent)" }}
                >
                  Inquiry received
                </p>
                <h2 className="text-3xl">Thank you for reaching out</h2>
                <p className="text-base leading-7" style={{ color: "var(--site-muted)" }}>
                  Thank you for your interest
                  {product ? " in this design" : ""}. We&apos;ll get back to you
                  using the contact details you provided.
                </p>
                <div className="flex flex-col gap-3 sm:flex-row">
                  <Button
                    asChild
                    className="h-11"
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
                      className="h-11"
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
            <div className="grid gap-6 lg:grid-cols-[minmax(0,1.15fr)_minmax(280px,0.85fr)] lg:items-start">
              <div
                className="rounded-[calc(var(--site-card-radius)+0.2rem)] border bg-[color:var(--site-surface)] p-6 shadow-[0_16px_40px_rgba(15,23,42,0.04)] sm:p-7"
                style={{
                  borderColor:
                    "color-mix(in srgb, var(--site-text) 10%, transparent)",
                }}
              >
                <div className="mb-6 space-y-2">
                  <p
                    className="text-xs font-semibold uppercase tracking-[0.24em]"
                    style={{ color: "var(--site-accent)" }}
                  >
                    Inquiry form
                  </p>
                  <h2 className="text-2xl">Tell us what you need</h2>
                  <p className="text-sm leading-6" style={{ color: "var(--site-muted)" }}>
                    Share your design preference, event details, and quantity so
                    we can respond with the right next steps.
                  </p>
                </div>
                <ContactInquiryForm productSlug={product?.slug ?? null} />
              </div>

              <ContactInformationCard siteSettings={siteSettings} />
            </div>
          )}
        </PublicContainer>
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
