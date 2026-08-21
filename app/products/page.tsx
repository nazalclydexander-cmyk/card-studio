import type { CSSProperties } from "react";
import Link from "next/link";
import { Suspense } from "react";

import { CatalogFilters } from "@/components/public/catalog-filters";
import { ProductCard } from "@/components/public/product-card";
import { PublicFooter } from "@/components/public/public-footer";
import { PublicHeader } from "@/components/public/public-header";
import { PublicStateCard } from "@/components/public/public-state-card";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { getPublicProductsPageData } from "@/lib/public-catalog";
import { getSiteSettings } from "@/lib/site-settings";

export const metadata = {
  title: "Collection",
  description: "Browse invitation and greeting card designs.",
};

type ProductsPageProps = {
  searchParams: Promise<{
    category?: string;
    q?: string;
  }>;
};

function getShellCardStyle(): CSSProperties {
  return {
    backgroundColor: "var(--site-surface)",
    borderColor: "color-mix(in srgb, var(--site-text) 10%, transparent)",
    borderRadius: "var(--site-card-radius)",
  };
}

function ProductsFallback() {
  return (
    <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
      {Array.from({ length: 4 }).map((_, index) => (
        <div
          key={index}
          className="overflow-hidden rounded-[calc(var(--site-card-radius)+0.1rem)] border"
          style={getShellCardStyle()}
        >
          <div className="aspect-[4/3] bg-muted/60" />
          <div className="space-y-4 p-5">
            <div className="h-4 w-28 rounded-md bg-muted" />
            <div className="h-7 w-3/4 rounded-md bg-muted" />
            <div className="h-16 rounded-md bg-muted/70" />
            <div className="h-10 rounded-md bg-muted/80" />
          </div>
        </div>
      ))}
    </div>
  );
}

async function ProductsContent({
  searchParams,
}: {
  searchParams: Promise<{
    category?: string;
    q?: string;
  }>;
}) {
  const resolvedSearchParams = await searchParams;
  const [siteSettings, catalogData] = await Promise.all([
    getSiteSettings(),
    getPublicProductsPageData({
      categorySlug: resolvedSearchParams.category,
      searchQuery: resolvedSearchParams.q,
    }),
  ]);

  if (catalogData.invalidCategory) {
    return (
      <Card style={getShellCardStyle()}>
        <CardHeader>
          <CardTitle>Category not found</CardTitle>
          <CardDescription>
            That category is not available in the public catalog right now.
          </CardDescription>
        </CardHeader>
        <div className="px-6 pb-6">
          <Button asChild variant="outline">
            <Link href="/products">Back to all products</Link>
          </Button>
        </div>
      </Card>
    );
  }

  return (
    <div className="space-y-8">
      {catalogData.hasError ? (
        <PublicStateCard
          title="Catalog temporarily unavailable"
          description="We couldn't load the latest catalog data right now. Please try refreshing the page in a moment."
        />
      ) : null}

      <CatalogFilters
        categories={catalogData.categories}
        selectedCategorySlug={catalogData.selectedCategory?.slug ?? null}
        searchQuery={catalogData.normalizedSearchQuery}
      />

      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div className="space-y-1">
          <p
            className="text-sm uppercase tracking-[0.24em]"
            style={{ color: "var(--site-accent)" }}
          >
            {catalogData.selectedCategory?.name ?? "All designs"}
          </p>
          <h2 className="text-3xl">
            {catalogData.productsError
              ? "Catalog unavailable"
              : `${catalogData.products.length} design${
                  catalogData.products.length === 1 ? "" : "s"
                } available`}
          </h2>
        </div>

        {catalogData.normalizedSearchQuery ? (
          <p className="text-sm" style={{ color: "var(--site-muted)" }}>
            Search results for &quot;{catalogData.normalizedSearchQuery}&quot;
          </p>
        ) : null}
      </div>

      {catalogData.products.length > 0 ? (
        <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
          {catalogData.products.map((product) => (
            <ProductCard
              key={product.id}
              product={product}
              siteSettings={siteSettings}
            />
          ))}
        </div>
      ) : catalogData.productsError ? (
        <PublicStateCard
          title="We couldn't load the collection right now"
          description="Please try again in a moment. If the issue continues, refreshing the page usually helps."
        />
      ) : (
        <PublicStateCard
          title="No matching designs yet"
          description="Try another category or search phrase, or clear the current filters to browse the full collection."
        />
      )}
    </div>
  );
}

async function ProductsPageContent({ searchParams }: ProductsPageProps) {
  const siteSettings = await getSiteSettings();

  return (
    <>
      <PublicHeader siteSettings={siteSettings} />

      <main className="min-h-screen">
        <div className="mx-auto flex w-full max-w-7xl flex-col gap-8 px-5 py-12">
          <div className="space-y-3">
            <p
              className="text-sm font-semibold uppercase tracking-[0.28em]"
              style={{ color: "var(--site-accent)" }}
            >
              Collection
            </p>
            <h1 className="text-4xl sm:text-5xl">
              Invitation and greeting card designs
            </h1>
            <p
              className="max-w-3xl text-sm leading-6 sm:text-base"
              style={{ color: "var(--site-muted)" }}
            >
              Explore elegant, customizable designs for weddings, birthdays,
              christenings, debuts, greeting cards, and other meaningful
              celebrations.
            </p>
          </div>

          <Suspense fallback={<ProductsFallback />}>
            <ProductsContent searchParams={searchParams} />
          </Suspense>
        </div>
      </main>

      <PublicFooter siteSettings={siteSettings} />
    </>
  );
}

export default function ProductsPage({ searchParams }: ProductsPageProps) {
  return (
    <Suspense
      fallback={
        <main className="min-h-screen">
          <div className="mx-auto flex w-full max-w-7xl flex-col gap-8 px-5 py-12">
            <div className="space-y-3">
              <div className="h-4 w-40 rounded bg-muted" />
              <div className="h-12 w-80 rounded bg-muted" />
              <div className="h-5 w-full max-w-2xl rounded bg-muted" />
            </div>
            <ProductsFallback />
          </div>
        </main>
      }
    >
      <ProductsPageContent searchParams={searchParams} />
    </Suspense>
  );
}
