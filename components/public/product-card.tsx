import Image from "next/image";
import Link from "next/link";
import { ArrowRight } from "lucide-react";

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
      className="group flex h-full flex-col overflow-hidden rounded-[calc(var(--site-card-radius)+0.25rem)] border bg-[color:var(--site-surface)] shadow-[0_12px_32px_rgba(15,23,42,0.04)] transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_20px_50px_rgba(15,23,42,0.1)] motion-reduce:transform-none"
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
            background:
              "linear-gradient(180deg, color-mix(in srgb, var(--site-secondary) 18%, white) 0%, color-mix(in srgb, var(--site-background) 88%, white) 100%)",
            borderColor:
              "color-mix(in srgb, var(--site-text) 7%, transparent)",
          }}
        >
          <div
            aria-hidden="true"
            className="absolute inset-[8%] rounded-[calc(var(--site-card-radius)+0.1rem)] border bg-white/80 shadow-[0_20px_45px_rgba(15,23,42,0.08)]"
            style={{
              borderColor:
                "color-mix(in srgb, var(--site-text) 6%, transparent)",
            }}
          />
          {imageUrl ? (
            <Image
              src={imageUrl}
              alt={imageAlt}
              fill
              sizes="(max-width: 639px) 100vw, (max-width: 1279px) 50vw, 33vw"
              className="object-contain p-5 transition-transform duration-300 group-hover:scale-[1.02] motion-reduce:transform-none"
            />
          ) : (
            <div
              className="relative z-10 flex h-full w-full items-center justify-center px-6 text-center"
              style={{ color: "var(--site-muted)" }}
            >
              <div className="space-y-2">
                <div
                  className="mx-auto h-16 w-24 rounded-2xl border bg-white/80 shadow-sm"
                  style={{
                    borderColor:
                      "color-mix(in srgb, var(--site-text) 7%, transparent)",
                  }}
                />
                <p className="text-sm">Design preview</p>
              </div>
            </div>
          )}
        </div>
      </Link>

      <div className="flex h-full flex-col gap-5 p-5 sm:p-6">
        <div className="space-y-3">
          <p
            className="text-xs font-semibold uppercase tracking-[0.22em]"
            style={{ color: "var(--site-accent)" }}
          >
            {category.name}
          </p>

          <div className="space-y-2">
            <h3 className="text-[1.45rem] leading-snug">
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

        <div className="mt-auto flex items-end justify-between gap-4 border-t pt-4">
          <div className="space-y-1.5">
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
                Customizable for your event
              </p>
            ) : null}
          </div>

          <Link
            href={productHref}
            className="inline-flex items-center gap-1 rounded-md px-0 py-2 text-sm font-medium transition-transform duration-300 hover:translate-x-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring motion-reduce:transform-none"
          >
            View Design
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </div>
    </article>
  );
}
