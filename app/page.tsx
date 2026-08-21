import Image from "next/image";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
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
import {
  getPrimaryProductImageAlt,
  getPrimaryProductImageUrl,
} from "@/lib/public-catalog-shared";
import { getSiteSettings } from "@/lib/site-settings";

export const metadata = {
  title: "Home",
  description: "Elegant invitation and greeting card catalog.",
};

function HomeFallback() {
  return (
    <main className="min-h-screen">
      <PublicSection className="pt-10 sm:pt-12">
        <div className="grid gap-8 lg:grid-cols-[1.05fr_0.95fr] lg:items-center">
          <div className="space-y-4">
            <div className="h-4 w-32 rounded bg-muted" />
            <div className="h-16 w-full max-w-2xl rounded bg-muted" />
            <div className="h-20 w-full max-w-3xl rounded bg-muted/80" />
            <div className="flex gap-3">
              <div className="h-11 w-40 rounded bg-muted" />
              <div className="h-11 w-40 rounded bg-muted" />
            </div>
          </div>
          <div className="aspect-[5/4] rounded-[calc(var(--site-card-radius)+0.4rem)] bg-muted/60" />
        </div>
      </PublicSection>
    </main>
  );
}

function getCategoryGridClassName(categoryCount: number) {
  if (categoryCount <= 1) {
    return "grid-cols-1";
  }

  if (categoryCount === 2) {
    return "md:grid-cols-2";
  }

  return "md:grid-cols-2 xl:grid-cols-3";
}

function HomeMetric({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div
      className="rounded-[calc(var(--site-card-radius)+0.05rem)] border px-4 py-3"
      style={{
        backgroundColor: "color-mix(in srgb, var(--site-surface) 75%, transparent)",
        borderColor: "color-mix(in srgb, var(--site-text) 8%, transparent)",
      }}
    >
      <p className="text-xs uppercase tracking-[0.2em]" style={{ color: "var(--site-muted)" }}>
        {label}
      </p>
      <p className="mt-1 text-lg font-semibold">{value}</p>
    </div>
  );
}

async function HomeContent() {
  const [siteSettings, homepageData] = await Promise.all([
    getSiteSettings(),
    getHomepageCatalogData(),
  ]);

  const featuredProductsWithImages = homepageData.featuredProducts.filter((product) =>
    Boolean(getPrimaryProductImageUrl(product)),
  );
  const featuredHeroProduct =
    featuredProductsWithImages[0] ?? homepageData.featuredProducts[0] ?? null;
  const heroImageUrl = featuredHeroProduct
    ? getPrimaryProductImageUrl(featuredHeroProduct)
    : null;
  const heroImageAlt = featuredHeroProduct
    ? getPrimaryProductImageAlt(featuredHeroProduct)
    : "";
  const homepageFeaturedProducts =
    featuredProductsWithImages.length > 0
      ? featuredProductsWithImages.slice(0, 6)
      : homepageData.featuredProducts.slice(0, 6);

  return (
    <>
      <PublicHeader siteSettings={siteSettings} currentPath="/" />

      <main className="min-h-screen">
        <PublicSection className="pb-8 pt-8 sm:pt-10 lg:pt-12">
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
              still browse the collection while we reconnect a few sections.
            </div>
          ) : null}

          <div className="grid gap-10 lg:grid-cols-[1.02fr_0.98fr] lg:items-center">
            <div className="space-y-7">
              <PublicPageHeader
                eyebrow={siteSettings.site_name}
                title={siteSettings.hero_title}
                description={siteSettings.hero_subtitle}
                actions={
                  <>
                    <Button
                      asChild
                      size="lg"
                      className="h-12 px-6 shadow-sm"
                      style={{
                        backgroundColor: "var(--site-primary)",
                        color: "var(--site-surface)",
                        borderRadius: "var(--site-button-radius)",
                      }}
                    >
                      <Link href="/products">
                        Browse Collection
                        <ArrowRight className="h-4 w-4" />
                      </Link>
                    </Button>
                    <Button
                      asChild
                      size="lg"
                      variant="outline"
                      className="h-12 px-6"
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

              <div className="grid gap-3 sm:grid-cols-3">
                <HomeMetric
                  label="Categories"
                  value={`${homepageData.totalActiveCategories ?? homepageData.categories.length}`}
                />
                <HomeMetric
                  label="Featured"
                  value={`${homepageData.totalFeaturedProducts ?? homepageData.featuredProducts.length}`}
                />
                <HomeMetric label="Inquiries" value="Tailored to your event" />
              </div>
            </div>

            <div className="relative">
              <div
                className="relative overflow-hidden rounded-[calc(var(--site-card-radius)+0.45rem)] border px-5 py-6 shadow-[0_28px_70px_rgba(15,23,42,0.08)] sm:px-7 sm:py-8"
                style={{
                  background:
                    "linear-gradient(180deg, color-mix(in srgb, var(--site-secondary) 16%, white) 0%, color-mix(in srgb, var(--site-background) 96%, white) 100%)",
                  borderColor:
                    "color-mix(in srgb, var(--site-text) 8%, transparent)",
                }}
              >
                <div
                  aria-hidden="true"
                  className="pointer-events-none absolute left-5 top-5 h-28 w-24 rounded-[calc(var(--site-card-radius)+0.1rem)] border bg-white/70 shadow-sm"
                  style={{
                    borderColor:
                      "color-mix(in srgb, var(--site-text) 6%, transparent)",
                    transform: "rotate(-8deg)",
                  }}
                />
                <div
                  aria-hidden="true"
                  className="pointer-events-none absolute bottom-6 right-6 h-24 w-20 rounded-[calc(var(--site-card-radius)+0.1rem)] border bg-white/80 shadow-sm"
                  style={{
                    borderColor:
                      "color-mix(in srgb, var(--site-text) 6%, transparent)",
                    transform: "rotate(10deg)",
                  }}
                />

                {heroImageUrl ? (
                  <div className="relative mx-auto flex aspect-[5/4] max-w-[34rem] items-center justify-center">
                    <div
                      aria-hidden="true"
                      className="absolute inset-[6%] rounded-[calc(var(--site-card-radius)+0.15rem)] border bg-white/90 shadow-[0_30px_60px_rgba(15,23,42,0.12)]"
                      style={{
                        borderColor:
                          "color-mix(in srgb, var(--site-text) 6%, transparent)",
                      }}
                    />
                    <Image
                      src={heroImageUrl}
                      alt={heroImageAlt}
                      fill
                      sizes="(max-width: 1024px) 100vw, 46vw"
                      className="object-contain p-6 sm:p-8"
                    />
                  </div>
                ) : (
                  <div className="relative mx-auto flex aspect-[5/4] max-w-[34rem] items-center justify-center">
                    <div
                      aria-hidden="true"
                      className="absolute inset-[12%] rounded-[calc(var(--site-card-radius)+0.15rem)] border bg-white/90 shadow-[0_26px_60px_rgba(15,23,42,0.08)]"
                      style={{
                        borderColor:
                          "color-mix(in srgb, var(--site-text) 6%, transparent)",
                      }}
                    />
                    <div className="relative z-10 max-w-sm space-y-4 px-8 text-center">
                      <p
                        className="text-xs font-semibold uppercase tracking-[0.24em]"
                        style={{ color: "var(--site-accent)" }}
                      >
                        Curated paper details
                      </p>
                      <p className="text-2xl leading-tight sm:text-[2rem]">
                        Refined invitation and greeting card designs for memorable celebrations.
                      </p>
                    </div>
                  </div>
                )}
              </div>

              {featuredHeroProduct ? (
                <div className="mt-4 flex flex-col gap-3 rounded-[calc(var(--site-card-radius)+0.08rem)] border bg-[color:var(--site-surface)] px-5 py-4 shadow-sm sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p
                      className="text-xs font-semibold uppercase tracking-[0.22em]"
                      style={{ color: "var(--site-accent)" }}
                    >
                      Featured design
                    </p>
                    <p className="mt-1 text-lg font-semibold">
                      {featuredHeroProduct.name}
                    </p>
                  </div>
                  <Link
                    href={`/products/${featuredHeroProduct.slug}`}
                    className="inline-flex items-center gap-1 text-sm font-medium transition-transform hover:translate-x-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring motion-reduce:transform-none"
                  >
                    View Design
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                </div>
              ) : null}
            </div>
          </div>
        </PublicSection>

        <PublicSection
          id="categories"
          className="bg-[color:color-mix(in_srgb,var(--site-surface)_72%,transparent)]"
        >
          <div className="space-y-8">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
              <div className="space-y-3">
                <p
                  className="text-xs font-semibold uppercase tracking-[0.28em]"
                  style={{ color: "var(--site-accent)" }}
                >
                  Browse by celebration
                </p>
                <h2 className="text-3xl sm:text-[2.4rem]">
                  Start with the occasion you&apos;re planning
                </h2>
                <p
                  className="max-w-2xl text-base leading-7"
                  style={{ color: "var(--site-muted)" }}
                >
                  Explore wedding invitations, birthday designs, greeting cards,
                  and more through thoughtfully organized collections.
                </p>
              </div>
              <Button asChild variant="link" className="px-0">
                <Link href="/products">
                  See the full collection
                  <ArrowRight className="h-4 w-4" />
                </Link>
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
              <div
                className={`grid gap-4 ${getCategoryGridClassName(
                  homepageData.categories.length,
                )}`}
              >
                {homepageData.categories.map((category) => (
                  <Link
                    key={category.id}
                    href={`/products?category=${category.slug}`}
                    className="group rounded-[calc(var(--site-card-radius)+0.2rem)] border bg-[color:var(--site-surface)] p-6 shadow-[0_16px_36px_rgba(15,23,42,0.04)] transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_24px_50px_rgba(15,23,42,0.08)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring motion-reduce:transform-none"
                    style={{
                      borderColor:
                        "color-mix(in srgb, var(--site-text) 8%, transparent)",
                    }}
                  >
                    <div className="flex h-full flex-col gap-6">
                      <div
                        className="flex h-14 w-14 items-center justify-center rounded-2xl border text-sm font-semibold"
                        style={{
                          backgroundColor:
                            "color-mix(in srgb, var(--site-secondary) 18%, white)",
                          borderColor:
                            "color-mix(in srgb, var(--site-text) 7%, transparent)",
                        }}
                      >
                        {String(category.productCount).padStart(2, "0")}
                      </div>

                      <div className="space-y-3">
                        <div className="space-y-1">
                          <h3 className="text-2xl leading-tight">{category.name}</h3>
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
                            "Explore a refined selection of invitation and greeting card ideas for this occasion."}
                        </p>
                      </div>

                      <div className="mt-auto inline-flex items-center gap-1 text-sm font-medium transition-transform group-hover:translate-x-0.5 motion-reduce:transform-none">
                        Explore collection
                        <ArrowRight className="h-4 w-4" />
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            ) : (
              <PublicStateCard
                title="Explore the collection"
                description="You can still browse every available design in the full collection while the catalog grows."
                actionHref="/products"
                actionLabel="View the collection"
              />
            )}
          </div>
        </PublicSection>

        <PublicSection>
          <div className="space-y-8">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
              <div className="space-y-3">
                <p
                  className="text-xs font-semibold uppercase tracking-[0.28em]"
                  style={{ color: "var(--site-accent)" }}
                >
                  Featured designs
                </p>
                <h2 className="text-3xl sm:text-[2.4rem]">
                  Artwork-led picks from the collection
                </h2>
                <p
                  className="max-w-2xl text-base leading-7"
                  style={{ color: "var(--site-muted)" }}
                >
                  Discover a curated group of invitation and greeting card designs
                  chosen to make browsing feel more visual, personal, and inspiring.
                </p>
              </div>
              <Button asChild variant="link" className="px-0">
                <Link href="/products">
                  Browse all designs
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
            </div>

            {homepageData.featuredProductsError ? (
              <PublicStateCard
                title="Featured designs unavailable right now"
                description="We couldn't load the featured catalog section at the moment. Please try again shortly."
                actionHref="/products"
                actionLabel="Browse all products"
              />
            ) : homepageFeaturedProducts.length > 0 ? (
              <ProductGrid className="xl:grid-cols-3">
                {homepageFeaturedProducts.map((product) => (
                  <ProductCard
                    key={product.id}
                    product={product}
                    siteSettings={siteSettings}
                  />
                ))}
              </ProductGrid>
            ) : (
              <PublicStateCard
                title="Browse the collection"
                description="Visit the full catalog to explore the currently available invitation and greeting card designs."
                actionHref="/products"
                actionLabel="Explore the collection"
              />
            )}
          </div>
        </PublicSection>

        <PublicSection className="bg-[color:color-mix(in_srgb,var(--site-surface)_70%,transparent)]">
          <div className="space-y-8">
            <div className="space-y-3">
              <p
                className="text-xs font-semibold uppercase tracking-[0.28em]"
                style={{ color: "var(--site-accent)" }}
              >
                How it works
              </p>
              <h2 className="text-3xl sm:text-[2.4rem]">
                A simple path from browsing to inquiry
              </h2>
            </div>

            <div className="grid gap-4 lg:grid-cols-3">
              {[
                {
                  step: "01",
                  title: "Browse the Collection",
                  description:
                    "Explore invitation and greeting card designs that match your celebration.",
                },
                {
                  step: "02",
                  title: "Choose Your Design",
                  description:
                    "Open a design to review its details, style, and presentation.",
                },
                {
                  step: "03",
                  title: "Send Your Request",
                  description:
                    "Share your event details through the inquiry form so we can follow up.",
                },
              ].map((item) => (
                <div
                  key={item.step}
                  className="rounded-[calc(var(--site-card-radius)+0.18rem)] border bg-[color:var(--site-surface)] p-6 shadow-[0_12px_32px_rgba(15,23,42,0.04)]"
                  style={{
                    borderColor:
                      "color-mix(in srgb, var(--site-text) 8%, transparent)",
                  }}
                >
                  <p
                    className="text-xs font-semibold uppercase tracking-[0.24em]"
                    style={{ color: "var(--site-accent)" }}
                  >
                    {item.step}
                  </p>
                  <h3 className="mt-4 text-2xl">{item.title}</h3>
                  <p
                    className="mt-3 text-sm leading-6"
                    style={{ color: "var(--site-muted)" }}
                  >
                    {item.description}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </PublicSection>

        <PublicSection className="pt-0">
          <div
            className="rounded-[calc(var(--site-card-radius)+0.45rem)] border px-6 py-8 shadow-[0_24px_60px_rgba(15,23,42,0.08)] sm:px-8 sm:py-10"
            style={{
              background:
                "linear-gradient(135deg, color-mix(in srgb, var(--site-primary) 12%, white) 0%, color-mix(in srgb, var(--site-surface) 96%, white) 100%)",
              borderColor: "color-mix(in srgb, var(--site-text) 10%, transparent)",
            }}
          >
            <div className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr] lg:items-center">
              <div className="space-y-3">
                <p
                  className="text-xs font-semibold uppercase tracking-[0.28em]"
                  style={{ color: "var(--site-accent)" }}
                >
                  Have something special in mind?
                </p>
                <h2 className="text-3xl sm:text-[2.4rem]">
                  Tell us about your celebration and the design you&apos;re considering.
                </h2>
                <p
                  className="max-w-2xl text-base leading-7"
                  style={{ color: "var(--site-muted)" }}
                >
                  Whether you already have a favorite design or you&apos;re still
                  exploring, we&apos;re ready for the next step.
                </p>
              </div>

              <div className="flex flex-col gap-3 sm:flex-row lg:flex-col">
                <Button
                  asChild
                  size="lg"
                  className="h-12 px-6 shadow-sm"
                  style={{
                    backgroundColor: "var(--site-primary)",
                    color: "var(--site-surface)",
                    borderRadius: "var(--site-button-radius)",
                  }}
                >
                  <Link href="/contact">Request a Design</Link>
                </Button>
                <Button
                  asChild
                  size="lg"
                  variant="outline"
                  className="h-12 px-6"
                  style={{ borderRadius: "var(--site-button-radius)" }}
                >
                  <Link href="/products">Browse Collection</Link>
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
