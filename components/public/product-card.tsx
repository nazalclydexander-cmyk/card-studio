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
      className="flex h-full flex-col overflow-hidden border shadow-sm"
      style={{
        backgroundColor: "var(--site-surface)",
        borderColor: "color-mix(in srgb, var(--site-text) 10%, transparent)",
        borderRadius: "var(--site-card-radius)",
      }}
    >
      <div
        className="relative flex aspect-[4/3] items-center justify-center overflow-hidden border-b p-4"
        style={{
          backgroundColor: "color-mix(in srgb, var(--site-secondary) 12%, white)",
          borderColor: "color-mix(in srgb, var(--site-text) 8%, transparent)",
        }}
      >
        {imageUrl ? (
          <Link
            href={productHref}
            className="absolute inset-0 z-10 rounded-[inherit] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            aria-label={`View ${product.name}`}
          >
            <Image
              src={imageUrl}
              alt={imageAlt}
              fill
              sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
              className="object-contain p-4"
            />
          </Link>
        ) : (
          <div
            className="flex h-full w-full items-center justify-center rounded-[calc(var(--site-card-radius)-0.2rem)] border border-dashed border-black/10 px-6 text-center text-sm"
            style={{ color: "var(--site-muted)" }}
          >
            Preview unavailable
          </div>
        )}
      </div>

      <div className="flex h-full flex-col gap-4 p-5">
        <div className="space-y-3">
          <p
            className="text-xs font-semibold uppercase tracking-[0.24em]"
            style={{ color: "var(--site-accent)" }}
          >
            {category.name}
          </p>
          <div className="space-y-2">
            <h3 className="text-xl leading-snug">
              <Link
                href={productHref}
                className="rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring hover:underline"
              >
                {product.name}
              </Link>
            </h3>
            <p
              className="line-clamp-3 text-sm leading-6"
              style={{ color: "var(--site-muted)" }}
            >
              {product.short_description?.trim() ||
                "A thoughtful invitation design curated for meaningful celebrations."}
            </p>
          </div>
        </div>

        <div className="mt-auto space-y-3">
          {priceDisplay.kind === "price" ? (
            <div
              className="rounded-xl px-4 py-3"
              style={{
                backgroundColor:
                  "color-mix(in srgb, var(--site-primary) 10%, white)",
              }}
            >
              <p
                className="text-xs uppercase tracking-[0.2em]"
                style={{ color: "var(--site-muted)" }}
              >
                Starting at
              </p>
              <p className="mt-2 text-lg font-semibold">{priceDisplay.label}</p>
            </div>
          ) : priceDisplay.kind === "hidden" ? (
            <p className="text-sm font-medium" style={{ color: "var(--site-muted)" }}>
              {priceDisplay.label}
            </p>
          ) : null}

          <div className="flex items-center justify-between gap-3">
            <p className="text-sm" style={{ color: "var(--site-muted)" }}>
              {product.customizable
                ? "Customizable for your event"
                : "Ready-made design concept"}
            </p>
            {product.theme ? (
              <span
                className="rounded-full border px-3 py-1 text-xs"
                style={{
                  borderColor:
                    "color-mix(in srgb, var(--site-text) 10%, transparent)",
                  color: "var(--site-text)",
                }}
              >
                {product.theme}
              </span>
            ) : null}
          </div>

          <div>
            <Link
              href={productHref}
              className="inline-flex items-center justify-center rounded-md px-4 py-2 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              style={{
                backgroundColor: "var(--site-primary)",
                color: "var(--site-surface)",
                borderRadius: "var(--site-button-radius)",
              }}
            >
              View design
            </Link>
          </div>
        </div>
      </div>
    </article>
  );
}
