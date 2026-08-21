import Image from "next/image";
import Link from "next/link";
import { Suspense } from "react";

import { ProductCard } from "@/components/public/product-card";
import { PublicFooter } from "@/components/public/public-footer";
import { PublicHeader } from "@/components/public/public-header";
import { PublicPageHeader } from "@/components/public/public-page-header";
import { ProductGrid } from "@/components/public/product-grid";
import { PublicSection } from "@/components/public/public-section";
import { PublicStateCard } from "@/components/public/public-state-card";
import { Button } from "@/components/ui/button";
import { getHomepageCatalogData } from "@/lib/public-catalog";
import { getPrimaryProductImageAlt, getPrimaryProductImageUrl } from "@/lib/public-catalog-shared";
import { getSiteSettings } from "@/lib/site-settings";

export const metadata = {
  title: "Home",
  description: "Elegant invitation and greeting card catalog.",
};

function HomeFallback() {
  return (
    <main className="min-h-screen">
      <PublicSection className="pt-10 sm:pt-12">
        <div className="grid gap-8 lg:grid-cols-[1.1fr_0.9fr] lg:items-center">
          <div className="space-y-4">
            <div className="h-4 w-40 rounded bg-muted" />
            <div className="h-12 w-full max-w-2xl rounded bg-muted" />
            <div className="h-20 w-full max-w-3xl rounded bg-muted" />
            <div className="flex gap-3">
              <div className="h-11 w-36 rounded bg-muted" />
              <div className="h-11 w-36 rounded bg-muted" />
            </div>
          </div>
          <div className="aspect-[4/3] rounded-[calc(var(--site-card-radius)+0.3rem)] bg-muted/60" />
        </div>
      </PublicSection>
    </main>
  );
}

async function HomeContent() {
  const [siteSettings, homepageData] = await Promise.all([
    getSiteSettings(),
    getHomepageCatalogData(),
  ]);

  const featuredHeroProduct = homepageData.featuredProducts[0] ?? null;
  const heroImageUrl = featuredHeroProduct
    ? getPrimaryProductImageUrl(featuredHeroProduct)
    : null;
  const heroImageAlt = featuredHeroProduct
    ? getPrimaryProductImageAlt(featuredHeroProduct)
    : "";

  return (
    <>
      <PublicHeader siteSettings={siteSettings} currentPath="/" />

      <main className="min-h-screen">
        <PublicSection className="pt-10 sm:pt-12 lg:pt-14">
          {homepageData.hasError ? (
            <div
              className="mb-8 rounded-[calc(var(--site-card-radius)+0.15rem)] border px-5 py-4 text-sm"
              style={{
                backgroundColor: "var(--site-surface)",
                borderColor:
                  "color-mix(in srgb, var(--site-text) 10%, transparent)",
                color: "var(--site-muted)",
              }}
            >
              Some catalog content is temporarily unavailable right now. You can
              still browse the site, but a few sections may look incomplete
              until the connection recovers.
            </div>
          ) : null}

          <div className="grid gap-10 lg:grid-cols-[1.05fr_0.95fr] lg:items-center">
            <div className="space-y-6">
              <PublicPageHeader
                eyebrow={siteSettings.site_name}
                title={siteSettings.hero_title}
                description={siteSettings.hero_subtitle}
                actions={
                  <>
                    <Button
                      asChild
                      size="lg"
                      className="px-6"
                      style={{
                        backgroundColor: "var(--site-primary)",
                        color: "var(--site-surface)",
                        borderRadius: "var(--site-button-radius)",
                      }}
                    >
                      <Link href="/products">Browse Collection</Link>
                    </Button>
                    <Button
                      asChild
                      size="lg"
                      variant="outline"
                      className="px-6"
                      style={{ borderRadius: "var(--site-button-radius)" }}
                    >
                      <Link href="/contact">Request a Design</Link>
                    </Button>
                  </>
                }
              />

              <p
                className="max-w-2xl text-sm leading-7 sm:text-base"
                style={{ color: "var(--site-muted)" }}
              >
                {siteSettings.tagline}
              </p>
            </div>

            <div className="space-y-4">
              <div
                className="relative flex aspect-[4/3] items-center justify-center overflow-hidden rounded-[calc(var(--site-card-radius)+0.35rem)] border px-5 py-6 shadow-sm sm:px-6"
                style={{
                  backgroundColor:
                    "color-mix(in srgb, var(--site-secondary) 10%, white)",
                  borderColor:
                    "color-mix(in srgb, var(--site-text) 8%, transparent)",
                }}
              >
                {heroImageUrl ? (
                  <Image
                    src={heroImageUrl}
                    alt={heroImageAlt}
                    fill
                    sizes="(max-width: 1024px) 100vw, 48vw"
                    className="object-contain p-4"
                  />
                ) : (
                  <div
                    className="flex h-full w-full items-center justify-center rounded-[calc(var(--site-card-radius)-0.1rem)] border border-dashed px-6 text-center text-sm"
                    style={{ color: "var(--site-muted)" }}
                  >
                    Featured invitation artwork will appear here when available.
                  </div>
                )}
              </div>

              {featuredHeroProduct ? (
                <div className="flex items-center justify-between gap-4 text-sm">
                  <div>
                    <p className="font-medium">{featuredHeroProduct.name}</p>
                    <p style={{ color: "var(--site-muted)" }}>
                      From the featured collection
                    </p>
                  </div>
                  <Link
                    href={`/products/${featuredHeroProduct.slug}`}
                    className="font-medium hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    View Design
                  </Link>
                </div>
              ) : null}
            </div>
          </div>
        </PublicSection>

        <PublicSection id="categories" className="pt-4 sm:pt-6">
          <div className="space-y-8">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
              <div className="space-y-2">
                <p
                  className="text-sm font-semibold uppercase tracking-[0.24em]"
                  style={{ color: "var(--site-accent)" }}
                >
                  Categories
                </p>
                <h2 className="text-3xl sm:text-4xl">Browse by celebration</h2>
                <p
                  className="max-w-2xl text-base leading-7"
                  style={{ color: "var(--site-muted)" }}
                >
                  Explore the collection through the type of event you&apos;re
                  planning, from weddings and save-the-dates to greeting cards
                  and thoughtful thank-you notes.
                </p>
              </div>
              <Button asChild variant="link" className="px-0">
                <Link href="/products">See the full collection</Link>
              </Button>
            </div>

            {homepageData.categoriesError ? (
              <PublicStateCard
                title="Categories unavailable right now"
                description="We couldn't load the latest category list. Please try again in a moment."
                actionHref="/products"
                actionLabel="Browse all products"
              />
            ) : homepageData.categories.length > 0 ? (
              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                {homepageData.categories.map((category) => (
                  <Link
                    key={category.id}
                    href={`/products?category=${category.slug}`}
                    className="rounded-[calc(var(--site-card-radius)+0.15rem)] border bg-[color:var(--site-surface)] p-5 transition-shadow hover:shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    style={{
                      borderColor:
                        "color-mix(in srgb, var(--site-text) 8%, transparent)",
                    }}
                  >
                    <div className="space-y-4">
                      <div className="space-y-1">
                        <h3 className="text-xl">{category.name}</h3>
                        <p
                          className="text-sm"
                          style={{ color: "var(--site-muted)" }}
                        >
                          {category.productCount} design
                          {category.productCount === 1 ? "" : "s"}
                        </p>
                      </div>
                      <p
                        className="text-sm leading-6"
                        style={{ color: "var(--site-muted)" }}
                      >
                        {category.description?.trim() ||
                          "Browse refined invitation and greeting card designs for this occasion."}
                      </p>
                    </div>
                  </Link>
                ))}
              </div>
            ) : (
              <PublicStateCard
                title="No categories to browse yet"
                description="Categories will appear here once active catalog products are available."
                actionHref="/products"
                actionLabel="View the collection"
              />
            )}
          </div>
        </PublicSection>

        <PublicSection className="pt-4 sm:pt-6">
          <div className="space-y-8">
            <div className="space-y-2">
              <p
                className="text-sm font-semibold uppercase tracking-[0.24em]"
                style={{ color: "var(--site-accent)" }}
              >
                Featured products
              </p>
              <h2 className="text-3xl sm:text-4xl">A few elegant favorites</h2>
              <p
                className="max-w-2xl text-base leading-7"
                style={{ color: "var(--site-muted)" }}
              >
                A curated selection of invitation and greeting card designs that
                reflect the tone of the collection.
              </p>
            </div>

            {homepageData.featuredProductsError ? (
              <PublicStateCard
                title="Featured designs unavailable right now"
                description="We couldn't load the featured catalog section at the moment. Please try again shortly."
                actionHref="/products"
                actionLabel="Browse all products"
              />
            ) : homepageData.featuredProducts.length > 0 ? (
              <ProductGrid className="2xl:grid-cols-3">
                {homepageData.featuredProducts.map((product) => (
                  <ProductCard
                    key={product.id}
                    product={product}
                    siteSettings={siteSettings}
                  />
                ))}
              </ProductGrid>
            ) : (
              <PublicStateCard
                title="No featured designs selected yet"
                description="Featured products will appear here once they are marked from the catalog."
                actionHref="/products"
                actionLabel="Explore the collection"
              />
            )}
          </div>
        </PublicSection>

        <PublicSection className="pt-0">
          <div
            className="rounded-[calc(var(--site-card-radius)+0.35rem)] border bg-[color:var(--site-surface)] px-6 py-8 shadow-sm sm:px-8"
            style={{
              borderColor: "color-mix(in srgb, var(--site-text) 8%, transparent)",
            }}
          >
            <div className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr] lg:items-center">
              <div className="space-y-3">
                <p
                  className="text-sm font-semibold uppercase tracking-[0.24em]"
                  style={{ color: "var(--site-accent)" }}
                >
                  Let&apos;s plan your design
                </p>
                <h2 className="text-3xl sm:text-4xl">
                  Start with a design you love, then tell us about your event
                </h2>
                <p
                  className="max-w-2xl text-base leading-7"
                  style={{ color: "var(--site-muted)" }}
                >
                  Browse the collection, shortlist your favorites, and reach
                  out when you&apos;re ready to talk about the details.
                </p>
              </div>

              <div className="flex flex-col gap-3 sm:flex-row lg:flex-col">
                <Button
                  asChild
                  size="lg"
                  className="px-6"
                  style={{
                    backgroundColor: "var(--site-primary)",
                    color: "var(--site-surface)",
                    borderRadius: "var(--site-button-radius)",
                  }}
                >
                  <Link href="/products">Browse all designs</Link>
                </Button>
                <Button
                  asChild
                  size="lg"
                  variant="outline"
                  className="px-6"
                  style={{ borderRadius: "var(--site-button-radius)" }}
                >
                  <Link href="/contact">Contact us</Link>
                </Button>
              </div>
            </div>
          </div>
        </PublicSection>
      </main>

      <PublicFooter siteSettings={siteSettings} />
    </>
  );
}

export default function Home() {
  return (
    <Suspense fallback={<HomeFallback />}>
      <HomeContent />
    </Suspense>
  );
}
