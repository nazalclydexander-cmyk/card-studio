import "server-only";

import {
  normalizeSearchQuery,
  type PublicProduct,
} from "@/lib/public-catalog-shared";
import { createClient } from "@/lib/supabase/server";

type RawCategoryRow = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  sort_order: number;
};

function mapCategoriesWithCounts(
  categories: RawCategoryRow[] | null,
  categoryIds: string[] | null,
) {
  const counts = new Map<string, number>();

  for (const categoryId of categoryIds ?? []) {
    counts.set(categoryId, (counts.get(categoryId) ?? 0) + 1);
  }

  return (categories ?? []).map((category) => ({
    ...category,
    productCount: counts.get(category.id) ?? 0,
  }));
}

const publicProductSelect = `
  id,
  name,
  slug,
  category_id,
  short_description,
  description,
  price_from,
  show_price,
  theme,
  orientation,
  format,
  customizable,
  category:categories!products_category_id_fkey (
    name,
    slug
  ),
  images:product_images!product_images_product_id_fkey (
    storage_path,
    alt_text,
    is_primary,
    sort_order,
    created_at
  )
`;

export async function getHomepageCatalogData() {
  const supabase = await createClient();
  const featuredProductsQuery = supabase
    .from("products")
    .select(
      publicProductSelect,
    )
    .eq("active", true)
    .eq("featured", true)
    .order("created_at", { ascending: false })
    .limit(6);

  const [categoriesResult, categoryUsageResult, featuredProductsResult] =
    await Promise.all([
      supabase
        .from("categories")
        .select("id, name, slug, description, sort_order")
        .eq("active", true)
        .order("sort_order", { ascending: true })
        .order("name", { ascending: true }),
      supabase.from("products").select("category_id").eq("active", true),
      featuredProductsQuery,
    ]);

  if (categoriesResult.error) {
    console.error("Failed to load homepage categories", {
      code: categoriesResult.error.code,
      message: categoriesResult.error.message,
      details: categoriesResult.error.details,
      hint: categoriesResult.error.hint,
    });
  }

  if (categoryUsageResult.error) {
    console.error("Failed to load homepage category usage", {
      code: categoryUsageResult.error.code,
      message: categoryUsageResult.error.message,
      details: categoryUsageResult.error.details,
      hint: categoryUsageResult.error.hint,
    });
  }

  if (featuredProductsResult.error) {
    console.error("Failed to load homepage featured products", {
      code: featuredProductsResult.error.code,
      message: featuredProductsResult.error.message,
      details: featuredProductsResult.error.details,
      hint: featuredProductsResult.error.hint,
    });
  }

  const categories = mapCategoriesWithCounts(
    categoriesResult.data as RawCategoryRow[] | null,
    (categoryUsageResult.data ?? []).map((row) => row.category_id),
  )
    .filter((category) => category.productCount > 0)
    .slice(0, 6);

  const categoriesError = Boolean(
    categoriesResult.error || categoryUsageResult.error,
  );
  const featuredProductsError = Boolean(featuredProductsResult.error);

  return {
    hasError: categoriesError || featuredProductsError,
    categoriesError,
    featuredProductsError,
    categories,
    featuredProducts: (featuredProductsResult.data ?? []) as PublicProduct[],
    totalActiveCategories: categoriesError ? null : categories.length,
    totalFeaturedProducts: featuredProductsError
      ? null
      : (featuredProductsResult.data ?? []).length,
  };
}

export async function getPublicProductsPageData({
  categorySlug,
  searchQuery,
}: {
  categorySlug?: string;
  searchQuery?: string;
}) {
  const supabase = await createClient();
  const normalizedSearchQuery = normalizeSearchQuery(searchQuery);
  const [categoriesResult, categoryUsageResult] = await Promise.all([
    supabase
      .from("categories")
      .select("id, name, slug, description, sort_order")
      .eq("active", true)
      .order("sort_order", { ascending: true })
      .order("name", { ascending: true }),
    supabase.from("products").select("category_id").eq("active", true),
  ]);

  if (categoriesResult.error) {
    console.error("Failed to load catalog categories", {
      code: categoriesResult.error.code,
      message: categoriesResult.error.message,
      details: categoriesResult.error.details,
      hint: categoriesResult.error.hint,
    });
  }

  if (categoryUsageResult.error) {
    console.error("Failed to load catalog category usage", {
      code: categoryUsageResult.error.code,
      message: categoryUsageResult.error.message,
      details: categoryUsageResult.error.details,
      hint: categoryUsageResult.error.hint,
    });
  }

  const categories = mapCategoriesWithCounts(
    categoriesResult.data as RawCategoryRow[] | null,
    (categoryUsageResult.data ?? []).map((row) => row.category_id),
  );

  const categoriesError = Boolean(categoriesResult.error || categoryUsageResult.error);

  const selectedCategory =
    categories.find((category) => category.slug === categorySlug) ?? null;
  const invalidCategory =
    !categoriesError && Boolean(categorySlug) && !selectedCategory;

  if (invalidCategory) {
    return {
      hasError: false,
      categories,
      products: [] as PublicProduct[],
      selectedCategory,
      invalidCategory: true,
      normalizedSearchQuery,
    };
  }

  let productsQuery = supabase
    .from("products")
    .select(
      publicProductSelect,
    )
    .eq("active", true)
    .order("featured", { ascending: false })
    .order("created_at", { ascending: false });

  if (selectedCategory) {
    productsQuery = productsQuery.eq("category_id", selectedCategory.id);
  }

  if (normalizedSearchQuery) {
    const escapedQuery = normalizedSearchQuery.replace(/\s+/g, "%");
    productsQuery = productsQuery.or(
      `name.ilike.%${escapedQuery}%,theme.ilike.%${escapedQuery}%,short_description.ilike.%${escapedQuery}%`,
    );
  }

  const { data: products, error: productsError } = await productsQuery;

  if (productsError) {
    console.error("Failed to load public catalog products", {
      code: productsError.code,
      message: productsError.message,
      details: productsError.details,
      hint: productsError.hint,
    });
  }

  return {
    hasError: Boolean(categoriesError || productsError),
    categoriesError,
    productsError: Boolean(productsError),
    categories,
    products: (products ?? []) as PublicProduct[],
    selectedCategory,
    invalidCategory: false,
    normalizedSearchQuery,
  };
}

export async function getPublicProductBySlugResult(slug: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("products")
    .select(publicProductSelect)
    .eq("slug", slug)
    .eq("active", true)
    .maybeSingle();

  if (error) {
    console.error("Failed to load public product by slug", {
      code: error.code,
      message: error.message,
      details: error.details,
      hint: error.hint,
    });

    return {
      product: null,
      hasError: true,
    };
  }

  return {
    product: (data ?? null) as (PublicProduct & { category_id: string | null }) | null,
    hasError: false,
  };
}

export async function getPublicProductBySlug(slug: string) {
  const result = await getPublicProductBySlugResult(slug);
  return result.product;
}

export async function getRelatedProductsResult({
  productId,
  categoryId,
  limit = 4,
}: {
  productId: string;
  categoryId: string | null;
  limit?: number;
}) {
  const supabase = await createClient();

  if (!categoryId) {
    return {
      products: [] as PublicProduct[],
      hasError: false,
    };
  }

  const { data, error } = await supabase
    .from("products")
    .select(publicProductSelect)
    .eq("active", true)
    .eq("category_id", categoryId)
    .neq("id", productId)
    .order("featured", { ascending: false })
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) {
    console.error("Failed to load related public products", {
      code: error.code,
      message: error.message,
      details: error.details,
      hint: error.hint,
    });

    return {
      products: [] as PublicProduct[],
      hasError: true,
    };
  }

  return {
    products: (data ?? []) as PublicProduct[],
    hasError: false,
  };
}

export async function getRelatedProducts(args: {
  productId: string;
  categoryId: string | null;
  limit?: number;
}) {
  const result = await getRelatedProductsResult(args);
  return result.products;
}
