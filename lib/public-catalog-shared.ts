import { getProductPreviewPublicUrl } from "@/lib/product-images";
import type { SiteSettings } from "@/lib/site-settings-config";

export type CategoryRelation =
  | {
      name: string | null;
      slug: string | null;
    }
  | {
      name: string | null;
      slug: string | null;
    }[]
  | null;

export type PublicCategory = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  sort_order: number;
  productCount: number;
};

export type PublicProductImage = {
  storage_path: string;
  preview_path: string | null;
  preview_updated_at: string | null;
  alt_text: string | null;
  is_primary: boolean;
  sort_order: number;
  created_at: string;
};

export type PublicProduct = {
  id: string;
  name: string;
  slug: string;
  short_description: string | null;
  description?: string | null;
  price_from: number | null;
  show_price: boolean;
  theme: string | null;
  orientation?: string | null;
  format?: string | null;
  customizable: boolean;
  category: CategoryRelation;
  images: PublicProductImage[] | null;
};

export function getCategoryDetails(category: CategoryRelation) {
  const resolvedCategory = Array.isArray(category) ? category[0] : category;

  return {
    name: resolvedCategory?.name ?? "Uncategorized",
    slug: resolvedCategory?.slug ?? "",
  };
}

export function getPrimaryProductImage(
  images: PublicProductImage[] | null | undefined,
) {
  return [...(images ?? [])].sort((left, right) => {
    if (left.is_primary !== right.is_primary) {
      return left.is_primary ? -1 : 1;
    }

    if (left.sort_order !== right.sort_order) {
      return left.sort_order - right.sort_order;
    }

    return left.created_at.localeCompare(right.created_at);
  })[0] ?? null;
}

export function getPrimaryProductImageUrl(product: PublicProduct) {
  const primaryImage = getPrimaryProductImage(product.images);
  return primaryImage ? getProductPreviewPublicUrl(primaryImage) : null;
}

export function getPrimaryProductImageAlt(product: PublicProduct) {
  const primaryImage = getPrimaryProductImage(product.images);
  return primaryImage?.alt_text?.trim() || `${product.name} invitation design`;
}

export function formatCatalogPrice(
  priceFrom: number,
  currencyCode: string,
  locale = "en-PH",
) {
  try {
    return new Intl.NumberFormat(locale, {
      style: "currency",
      currency: currencyCode,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(priceFrom);
  } catch {
    return new Intl.NumberFormat(locale, {
      style: "currency",
      currency: "PHP",
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(priceFrom);
  }
}

export function normalizeSearchQuery(value: string | null | undefined) {
  return (value ?? "")
    .trim()
    .replace(/[,%()]/g, " ")
    .replace(/\s+/g, " ")
    .slice(0, 80);
}

export function getPublicPriceDisplay(
  product: Pick<PublicProduct, "price_from" | "show_price">,
  siteSettings: Pick<
    SiteSettings,
    "show_prices" | "currency_code" | "hidden_price_label"
  >,
) {
  if (
    siteSettings.show_prices &&
    product.show_price &&
    product.price_from !== null
  ) {
    return {
      kind: "price" as const,
      label: formatCatalogPrice(product.price_from, siteSettings.currency_code),
    };
  }

  if (siteSettings.hidden_price_label.trim()) {
    return {
      kind: "hidden" as const,
      label: siteSettings.hidden_price_label,
    };
  }

  return {
    kind: "none" as const,
    label: "",
  };
}
