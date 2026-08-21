import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";

import { ProductImageGallery } from "@/components/public/product-image-gallery";
import { ProductCard } from "@/components/public/product-card";
import { PublicFooter } from "@/components/public/public-footer";
import { PublicHeader } from "@/components/public/public-header";
import { PublicStateCard } from "@/components/public/public-state-card";
import { Button } from "@/components/ui/button";
import {
  getPrimaryProductImageUrl,
  getCategoryDetails,
  getPublicPriceDisplay,
} from "@/lib/public-catalog-shared";
import {
  getPublicProductBySlugResult,
  getRelatedProductsResult,
} from "@/lib/public-catalog";
import { getSiteSettings } from "@/lib/site-settings";

type ProductDetailPageProps = {
  params: Promise<{
    slug: string;
  }>;
};

export async function generateMetadata({
  params,
}: ProductDetailPageProps): Promise<Metadata> {
  const { slug } = await params;
  const [siteSettings, productResult] = await Promise.all([
    getSiteSettings(),
    getPublicProductBySlugResult(slug),
  ]);

  if (!productResult.product) {
    return {
      title: "Product not found",
      robots: {
        index: false,
        follow: false,
      },
    };
  }

  const product = productResult.product;
  const primaryImageUrl = getPrimaryProductImageUrl(product);

  return {
    title: `${product.name} | ${siteSettings.site_name}`,
    description:
      product.short_description?.trim() ||
      product.description?.trim() ||
      siteSettings.tagline,
    openGraph: primaryImageUrl
      ? {
          title: `${product.name} | ${siteSettings.site_name}`,
          description:
            product.short_description?.trim() ||
            product.description?.trim() ||
            siteSettings.tagline,
          images: [
            {
              url: primaryImageUrl,
              alt: product.name,
            },
          ],
        }
      : undefined,
  };
}

function formatCustomerValue(value: string | null | undefined) {
  return value?.trim() || null;
}

export default async function ProductDetailPage({
  params,
}: ProductDetailPageProps) {
  return (
    <Suspense fallback={<ProductDetailFallback />}>
      <ProductDetailContent params={params} />
    </Suspense>
  );
}

function ProductDetailFallback() {
  return (
    <main className="min-h-screen">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-10 px-5 py-12">
        <div className="h-4 w-64 rounded bg-muted" />
        <div className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_minmax(320px,0.9fr)]">
          <div className="aspect-[4/3] rounded-[calc(var(--site-card-radius)+0.25rem)] bg-muted/60" />
          <div className="space-y-4">
            <div className="h-4 w-32 rounded bg-muted" />
            <div className="h-12 w-full max-w-xl rounded bg-muted" />
            <div className="h-24 w-full rounded bg-muted/70" />
            <div className="h-20 w-full max-w-sm rounded bg-muted/80" />
          </div>
        </div>
      </div>
    </main>
  );
}

async function ProductDetailContent({ params }: ProductDetailPageProps) {
  const { slug } = await params;
  const [siteSettings, productResult] = await Promise.all([
    getSiteSettings(),
    getPublicProductBySlugResult(slug),
  ]);

  if (productResult.hasError) {
    return (
      <>
        <PublicHeader siteSettings={siteSettings} />

        <main className="min-h-screen">
          <div className="mx-auto flex w-full max-w-7xl flex-col gap-8 px-5 py-12">
            <PublicStateCard
              title="This design couldn't be loaded right now"
              description="We couldn't load the latest product details at the moment. Please try again shortly."
              actionHref="/products"
              actionLabel="Back to the collection"
            />
          </div>
        </main>

        <PublicFooter siteSettings={siteSettings} />
      </>
    );
  }

  if (!productResult.product) {
    notFound();
  }

  const product = productResult.product;
  const relatedProductsResult = await getRelatedProductsResult({
    productId: product.id,
    categoryId: product.category_id,
    limit: 4,
  });

  const category = getCategoryDetails(product.category);
  const priceDisplay = getPublicPriceDisplay(product, siteSettings);
  const hasUsefulDescription = Boolean(product.description?.trim());
  const theme = formatCustomerValue(product.theme);
  const format = formatCustomerValue(product.format);
  const orientation = formatCustomerValue(product.orientation);

  return (
    <>
      <PublicHeader siteSettings={siteSettings} />

      <main className="min-h-screen">
        <div className="mx-auto flex w-full max-w-7xl flex-col gap-10 px-5 py-12">
          <nav
            aria-label="Breadcrumb"
            className="flex flex-wrap items-center gap-2 text-sm"
            style={{ color: "var(--site-muted)" }}
          >
            <Link href="/" className="hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
              Home
            </Link>
            <span aria-hidden="true">&gt;</span>
            <Link
              href="/products"
              className="hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              Collection
            </Link>
            <span aria-hidden="true">&gt;</span>
            <Link
              href={`/products?category=${category.slug}`}
              className="hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              {category.name}
            </Link>
            <span aria-hidden="true">&gt;</span>
            <span className="font-medium" style={{ color: "var(--site-text)" }}>
              {product.name}
            </span>
          </nav>

          <section className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_minmax(320px,0.9fr)] lg:items-start">
            <ProductImageGallery
              images={product.images}
              productName={product.name}
            />

            <div className="space-y-6">
              <div className="space-y-3">
                <p
                  className="text-sm font-semibold uppercase tracking-[0.24em]"
                  style={{ color: "var(--site-accent)" }}
                >
                  {category.name}
                </p>
                <h1 className="text-4xl leading-tight sm:text-5xl">
                  {product.name}
                </h1>
                {product.short_description?.trim() ? (
                  <p
                    className="max-w-2xl text-base leading-7 sm:text-lg"
                    style={{ color: "var(--site-muted)" }}
                  >
                    {product.short_description}
                  </p>
                ) : null}
              </div>

              {priceDisplay.kind === "price" ? (
                <div
                  className="rounded-[calc(var(--site-card-radius)+0.1rem)] border px-5 py-4 shadow-sm"
                  style={{
                    backgroundColor:
                      "color-mix(in srgb, var(--site-primary) 10%, white)",
                    borderColor:
                      "color-mix(in srgb, var(--site-text) 10%, transparent)",
                  }}
                >
                  <p
                    className="text-xs uppercase tracking-[0.2em]"
                    style={{ color: "var(--site-muted)" }}
                  >
                    Starting at
                  </p>
                  <p className="mt-2 text-2xl font-semibold">
                    {priceDisplay.label}
                  </p>
                </div>
              ) : priceDisplay.kind === "hidden" ? (
                <p className="text-base font-medium" style={{ color: "var(--site-muted)" }}>
                  {priceDisplay.label}
                </p>
              ) : null}

              <div className="grid gap-4 rounded-[calc(var(--site-card-radius)+0.1rem)] border p-5 shadow-sm sm:grid-cols-2">
                <div className="space-y-1">
                  <p className="text-sm" style={{ color: "var(--site-muted)" }}>
                    Design style
                  </p>
                  <p className="font-medium">
                    {product.customizable
                      ? "Customizable design"
                      : "Ready-made design concept"}
                  </p>
                </div>

                {theme ? (
                  <div className="space-y-1">
                    <p className="text-sm" style={{ color: "var(--site-muted)" }}>
                      Theme
                    </p>
                    <p className="font-medium">{theme}</p>
                  </div>
                ) : null}

                {format ? (
                  <div className="space-y-1">
                    <p className="text-sm" style={{ color: "var(--site-muted)" }}>
                      Format
                    </p>
                    <p className="font-medium">{format}</p>
                  </div>
                ) : null}

                {orientation ? (
                  <div className="space-y-1">
                    <p className="text-sm" style={{ color: "var(--site-muted)" }}>
                      Orientation
                    </p>
                    <p className="font-medium">
                      {orientation.charAt(0).toUpperCase() + orientation.slice(1)}
                    </p>
                  </div>
                ) : null}
              </div>

              <div className="space-y-3">
                <h2 className="text-2xl">About this design</h2>
                <p className="leading-7" style={{ color: "var(--site-muted)" }}>
                  {hasUsefulDescription
                    ? product.description
                    : "This elegant design is presented as part of our curated invitation and greeting card collection. More detail can be added as the catalog grows."}
                </p>
              </div>

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
                  <Link
                    href={`/contact?product=${encodeURIComponent(product.slug)}`}
                  >
                    Request This Design
                  </Link>
                </Button>
                <Button
                  asChild
                  size="lg"
                  variant="outline"
                  className="px-6"
                  style={{ borderRadius: "var(--site-button-radius)" }}
                >
                  <Link href="/products">Back to collection</Link>
                </Button>
              </div>
            </div>
          </section>

          <section className="space-y-5">
            <div className="space-y-2">
              <p
                className="text-sm font-semibold uppercase tracking-[0.24em]"
                style={{ color: "var(--site-accent)" }}
              >
                Related designs
              </p>
              <h2 className="text-3xl">You may also like</h2>
            </div>

            {relatedProductsResult.products.length > 0 ? (
              <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-4">
                {relatedProductsResult.products.map((relatedProduct) => (
                  <ProductCard
                    key={relatedProduct.id}
                    product={relatedProduct}
                    siteSettings={siteSettings}
                  />
                ))}
              </div>
            ) : relatedProductsResult.hasError ? (
              <PublicStateCard
                title="Related designs unavailable right now"
                description="We couldn't load related products for this design at the moment."
              />
            ) : (
              <PublicStateCard
                title="No related designs available"
                description="More products from this category will appear here as the catalog grows."
              />
            )}
          </section>
        </div>
      </main>

      <PublicFooter siteSettings={siteSettings} />
    </>
  );
}
