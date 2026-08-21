import Link from "next/link";
import { Suspense } from "react";

import { ProductCard } from "@/components/public/product-card";
import { PublicFooter } from "@/components/public/public-footer";
import { PublicHeader } from "@/components/public/public-header";
import { PublicStateCard } from "@/components/public/public-state-card";
import { Button } from "@/components/ui/button";
import { getHomepageCatalogData } from "@/lib/public-catalog";
import { getSiteSettings } from "@/lib/site-settings";

export const metadata = {
  title: "Home",
  description: "Elegant invitation and greeting card catalog.",
};

function HomeFallback() {
  return (
    <main className="min-h-screen">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-8 px-5 py-10">
        <div className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
          <div className="space-y-4">
            <div className="h-4 w-40 rounded bg-muted" />
            <div className="h-14 w-full max-w-2xl rounded bg-muted" />
            <div className="h-20 w-full max-w-3xl rounded bg-muted" />
            <div className="flex gap-3">
              <div className="h-11 w-36 rounded bg-muted" />
              <div className="h-11 w-36 rounded bg-muted" />
            </div>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-1">
            {Array.from({ length: 2 }).map((_, index) => (
              <div key={index} className="h-36 rounded-3xl bg-muted/70" />
            ))}
          </div>
        </div>
      </div>
    </main>
  );
}

async function HomeContent() {
  const [siteSettings, homepageData] = await Promise.all([
    getSiteSettings(),
    getHomepageCatalogData(),
  ]);

  return (
    <>
      <PublicHeader siteSettings={siteSettings} />

      <main className="min-h-screen">
        <section className="mx-auto w-full max-w-7xl px-5 py-12 sm:py-16">
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

          <div className="grid gap-8 lg:grid-cols-[1.2fr_0.8fr] lg:items-center">
            <div className="space-y-6">
              <div className="space-y-3">
                <p
                  className="text-sm font-semibold uppercase tracking-[0.28em]"
                  style={{ color: "var(--site-accent)" }}
                >
                  {siteSettings.site_name}
                </p>
                <h1 className="max-w-3xl text-4xl leading-tight sm:text-5xl lg:text-6xl">
                  {siteSettings.hero_title}
                </h1>
                <p
                  className="max-w-2xl text-base leading-7 sm:text-lg"
                  style={{ color: "var(--site-muted)" }}
                >
                  {siteSettings.hero_subtitle}
                </p>
              </div>

              <p
                className="max-w-xl text-sm leading-6"
                style={{ color: "var(--site-muted)" }}
              >
                {siteSettings.tagline}
              </p>

              <div className="flex flex-col gap-3 sm:flex-row">
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
                  <Link href="/products">Explore the collection</Link>
                </Button>
                <Button
                  asChild
                  size="lg"
                  variant="outline"
                  className="px-6"
                  style={{ borderRadius: "var(--site-button-radius)" }}
                >
                  <Link href="/#categories">Browse categories</Link>
                </Button>
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-1">
              <div
                className="rounded-[calc(var(--site-card-radius)+0.5rem)] border p-6 shadow-sm"
                style={{
                  backgroundColor: "var(--site-surface)",
                  borderColor:
                    "color-mix(in srgb, var(--site-text) 10%, transparent)",
                }}
              >
                <p
                  className="text-sm uppercase tracking-[0.24em]"
                  style={{ color: "var(--site-muted)" }}
                >
                  Curated categories
                </p>
                <p className="mt-4 text-4xl font-semibold">
                  {homepageData.totalActiveCategories ?? "—"}
                </p>
                <p
                  className="mt-2 text-sm leading-6"
                  style={{ color: "var(--site-muted)" }}
                >
                  Thoughtful invitation and greeting card collections ready to
                  browse.
                </p>
              </div>

              <div
                className="rounded-[calc(var(--site-card-radius)+0.5rem)] border p-6 shadow-sm"
                style={{
                  backgroundColor:
                    "color-mix(in srgb, var(--site-secondary) 18%, white)",
                  borderColor:
                    "color-mix(in srgb, var(--site-text) 10%, transparent)",
                }}
              >
                <p
                  className="text-sm uppercase tracking-[0.24em]"
                  style={{ color: "var(--site-muted)" }}
                >
                  Featured designs
                </p>
                <p className="mt-4 text-4xl font-semibold">
                  {homepageData.totalFeaturedProducts ?? "—"}
                </p>
                <p
                  className="mt-2 text-sm leading-6"
                  style={{ color: "var(--site-muted)" }}
                >
                  Elegant, premium-looking pieces selected for life&apos;s most
                  meaningful moments.
                </p>
              </div>
            </div>
          </div>
        </section>

        <section
          id="categories"
          className="mx-auto w-full max-w-7xl px-5 py-8 sm:py-12"
        >
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div className="space-y-2">
              <p
                className="text-sm font-semibold uppercase tracking-[0.28em]"
                style={{ color: "var(--site-accent)" }}
              >
                Categories
              </p>
              <h2 className="text-3xl">Browse by celebration</h2>
              <p
                className="max-w-2xl text-sm leading-6 sm:text-base"
                style={{ color: "var(--site-muted)" }}
              >
                Start with the type of event you&apos;re planning, then explore
                matching invitation styles from the collection.
              </p>
            </div>
            <Button asChild variant="link" className="px-0">
              <Link href="/products">See the full collection</Link>
            </Button>
          </div>

          {homepageData.categoriesError ? (
            <div className="mt-8">
              <PublicStateCard
                title="Categories unavailable right now"
                description="We couldn't load the latest category list. Please try again in a moment."
                actionHref="/products"
                actionLabel="Browse all products"
              />
            </div>
          ) : homepageData.categories.length > 0 ? (
            <div className="mt-8 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {homepageData.categories.map((category) => (
                <Link
                  key={category.id}
                  href={`/products?category=${category.slug}`}
                  className="rounded-[calc(var(--site-card-radius)+0.2rem)] border p-5 shadow-sm transition-transform hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  style={{
                    backgroundColor: "var(--site-surface)",
                    borderColor:
                      "color-mix(in srgb, var(--site-text) 10%, transparent)",
                  }}
                >
                  <div className="space-y-3">
                    <div className="flex items-center justify-between gap-4">
                      <h3 className="text-xl">{category.name}</h3>
                      <span
                        className="rounded-full px-3 py-1 text-xs font-medium"
                        style={{
                          backgroundColor:
                            "color-mix(in srgb, var(--site-primary) 10%, white)",
                          color: "var(--site-text)",
                        }}
                      >
                        {category.productCount} design
                        {category.productCount === 1 ? "" : "s"}
                      </span>
                    </div>
                    <p
                      className="text-sm leading-6"
                      style={{ color: "var(--site-muted)" }}
                    >
                      {category.description?.trim() ||
                        "Browse curated invitation styles for this celebration."}
                    </p>
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <div className="mt-8">
              <PublicStateCard
                title="No categories to browse yet"
                description="Categories will appear here once active catalog products are available."
                actionHref="/products"
                actionLabel="View the collection"
              />
            </div>
          )}
        </section>

        <section className="mx-auto w-full max-w-7xl px-5 py-8 sm:py-12">
          <div className="space-y-2">
            <p
              className="text-sm font-semibold uppercase tracking-[0.28em]"
              style={{ color: "var(--site-accent)" }}
            >
              Featured products
            </p>
            <h2 className="text-3xl">A few elegant favorites</h2>
            <p
              className="max-w-2xl text-sm leading-6 sm:text-base"
              style={{ color: "var(--site-muted)" }}
            >
              Handpicked designs that show the tone and polish of the catalog.
            </p>
          </div>

          {homepageData.featuredProductsError ? (
            <div className="mt-8">
              <PublicStateCard
                title="Featured designs unavailable right now"
                description="We couldn't load the featured catalog section at the moment. Please try again shortly."
                actionHref="/products"
                actionLabel="Browse all products"
              />
            </div>
          ) : homepageData.featuredProducts.length > 0 ? (
            <div className="mt-8 grid gap-6 sm:grid-cols-2 xl:grid-cols-3">
              {homepageData.featuredProducts.map((product) => (
                <ProductCard
                  key={product.id}
                  product={product}
                  siteSettings={siteSettings}
                />
              ))}
            </div>
          ) : (
            <div className="mt-8">
              <PublicStateCard
                title="No featured designs selected yet"
                description="Featured products will appear here once they are marked from the catalog."
                actionHref="/products"
                actionLabel="Explore the collection"
              />
            </div>
          )}
        </section>

        <section
          id="contact"
          className="mx-auto w-full max-w-7xl px-5 py-10 sm:py-14"
        >
          <div
            className="rounded-[calc(var(--site-card-radius)+0.6rem)] border px-6 py-8 shadow-sm sm:px-10 sm:py-10"
            style={{
              backgroundColor:
                "color-mix(in srgb, var(--site-primary) 8%, white)",
              borderColor:
                "color-mix(in srgb, var(--site-text) 10%, transparent)",
            }}
          >
            <div className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr] lg:items-center">
              <div className="space-y-3">
                <p
                  className="text-sm font-semibold uppercase tracking-[0.28em]"
                  style={{ color: "var(--site-accent)" }}
                >
                  Let&apos;s plan your design
                </p>
                <h2 className="text-3xl">
                  Beautiful invitations start with the right style
                </h2>
                <p
                  className="max-w-2xl text-sm leading-6 sm:text-base"
                  style={{ color: "var(--site-muted)" }}
                >
                  Explore the collection, shortlist the designs you love, and
                  reach out when you&apos;re ready to talk through your event.
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
                  <Link href="/#categories">View categories</Link>
                </Button>
              </div>
            </div>
          </div>
        </section>
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
