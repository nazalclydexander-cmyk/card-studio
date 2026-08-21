import Image from "next/image";
import Link from "next/link";

import {
  getCategoryDetails,
  getPrimaryProductImageAlt,
  getPrimaryProductImageUrl,
  getPublicPriceDisplay,
  type PublicProduct,
} from "@/lib/public-catalog-shared";
import type { SiteSettings } from "@/lib/site-settings-config";

type ProductCardProps = {
  product: PublicProduct;
  siteSettings: SiteSettings;
};

export function ProductCard({ product, siteSettings }: ProductCardProps) {
  const category = getCategoryDetails(product.category);
  const imageUrl = getPrimaryProductImageUrl(product);
  const imageAlt = getPrimaryProductImageAlt(product);
  const productHref = `/products/${product.slug}`;
  const priceDisplay = getPublicPriceDisplay(product, siteSettings);

  return (
    <article
      className="group flex h-full flex-col overflow-hidden rounded-[calc(var(--site-card-radius)+0.15rem)] border bg-[color:var(--site-surface)] transition-shadow hover:shadow-md"
      style={{
        borderColor: "color-mix(in srgb, var(--site-text) 8%, transparent)",
      }}
    >
      <Link
        href={productHref}
        className="block rounded-[inherit] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        aria-label={`View ${product.name}`}
      >
        <div
          className="relative flex aspect-[4/3] items-center justify-center overflow-hidden border-b px-5 py-6 sm:px-6"
          style={{
            backgroundColor:
              "color-mix(in srgb, var(--site-secondary) 10%, white)",
            borderColor:
              "color-mix(in srgb, var(--site-text) 7%, transparent)",
          }}
        >
          {imageUrl ? (
            <Image
              src={imageUrl}
              alt={imageAlt}
              fill
              sizes="(max-width: 639px) 100vw, (max-width: 1279px) 50vw, 33vw"
              className="object-contain p-4 transition-transform duration-300 group-hover:scale-[1.01]"
            />
          ) : (
            <div
              className="flex h-full w-full items-center justify-center rounded-[calc(var(--site-card-radius)-0.1rem)] border border-dashed px-6 text-center text-sm"
              style={{ color: "var(--site-muted)" }}
            >
              Preview unavailable
            </div>
          )}
        </div>
      </Link>

      <div className="flex h-full flex-col gap-4 p-5 sm:p-6">
        <div className="space-y-3">
          <p
            className="text-xs font-semibold uppercase tracking-[0.22em]"
            style={{ color: "var(--site-accent)" }}
          >
            {category.name}
          </p>

          <div className="space-y-2">
            <h3 className="text-xl leading-snug">
              <Link
                href={productHref}
                className="rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                {product.name}
              </Link>
            </h3>

            {product.short_description?.trim() ? (
              <p
                className="line-clamp-2 text-sm leading-6"
                style={{ color: "var(--site-muted)" }}
              >
                {product.short_description}
              </p>
            ) : null}
          </div>
        </div>

        <div className="mt-auto flex items-end justify-between gap-4">
          <div className="space-y-2">
            {priceDisplay.kind === "price" ? (
              <div className="space-y-1">
                <p
                  className="text-xs uppercase tracking-[0.18em]"
                  style={{ color: "var(--site-muted)" }}
                >
                  Starting at
                </p>
                <p className="text-lg font-semibold">{priceDisplay.label}</p>
              </div>
            ) : priceDisplay.kind === "hidden" ? (
              <p
                className="text-sm font-medium"
                style={{ color: "var(--site-muted)" }}
              >
                {priceDisplay.label}
              </p>
            ) : null}

            {product.customizable ? (
              <p className="text-sm" style={{ color: "var(--site-muted)" }}>
                Customizable
              </p>
            ) : null}
          </div>

          <Link
            href={productHref}
            className="inline-flex items-center justify-center rounded-md px-0 py-2 text-sm font-medium transition-colors hover:opacity-80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            View Design
          </Link>
        </div>
      </div>
    </article>
  );
}
