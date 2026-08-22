import "server-only";

import { revalidatePath, updateTag } from "next/cache";

import { uploadProtectedProductPreview } from "@/lib/product-image-storage";
import { PRODUCT_IMAGE_ORIGINALS_BUCKET } from "@/lib/product-images";
import {
  type PreviewRegenerationFailure,
  type PreviewRegenerationItemResult,
  type PreviewRegenerationPrepareResult,
  type PreviewRegenerationSummaryResult,
  type PreviewRegenerationTarget,
} from "@/lib/product-preview-regeneration-shared";
import { getLatestSiteSettings, SITE_SETTINGS_CACHE_TAG } from "@/lib/site-settings";
import { createClient } from "@/lib/supabase/server";
import { pickWatermarkSettings } from "@/lib/watermark-settings";

type ProductPreviewRow = {
  id: string;
  product_id: string;
  preview_path: string | null;
  productName: string;
};

async function getAllProductSlugs() {
  const supabase = await createClient();
  const { data, error } = await supabase.from("products").select("slug");

  if (error) {
    console.error("Failed to load product slugs for appearance revalidation", {
      code: error.code,
      message: error.message,
      details: error.details,
      hint: error.hint,
    });

    return [] as string[];
  }

  return (data ?? [])
    .map((product) => product.slug)
    .filter((slug): slug is string => typeof slug === "string" && slug.length > 0);
}

export async function revalidateAppearanceRoutes() {
  revalidatePath("/", "layout");
  revalidatePath("/");
  revalidatePath("/products");
  revalidatePath("/contact");
  revalidatePath("/admin");
  revalidatePath("/admin/appearance");

  const productSlugs = await getAllProductSlugs();

  for (const slug of productSlugs) {
    revalidatePath(`/products/${slug}`);
  }
}

function summarizePreviewRegenerationError(
  error: { message: string } | null | undefined,
  fallback: string,
) {
  const message = error?.message?.trim();

  if (!message) {
    return fallback;
  }

  return message.length > 180 ? fallback : message;
}

async function loadProductPreviewRows({
  productId,
  productImageId,
}: {
  productId?: string;
  productImageId?: string;
}) {
  const supabase = await createClient();
  let imagesQuery = supabase
    .from("product_images")
    .select("id, product_id, preview_path")
    .order("created_at", { ascending: true });

  if (productId) {
    imagesQuery = imagesQuery.eq("product_id", productId);
  }

  if (productImageId) {
    imagesQuery = imagesQuery.eq("id", productImageId);
  }

  const { data: imageRows, error: imageRowsError } = await imagesQuery;

  if (imageRowsError) {
    console.error("Failed to load product previews for regeneration", {
      code: imageRowsError.code,
      message: imageRowsError.message,
      details: imageRowsError.details,
      hint: imageRowsError.hint,
    });

    return {
      success: false as const,
      message: "The existing product previews could not be loaded.",
    };
  }

  const normalizedRows = (imageRows ?? []).filter(
    (row) => typeof row.preview_path === "string" && row.preview_path.trim().length > 0,
  );

  const productIds = Array.from(new Set(normalizedRows.map((row) => row.product_id)));
  const { data: productRows, error: productRowsError } = productIds.length
    ? await supabase.from("products").select("id, name").in("id", productIds)
    : { data: [], error: null };

  if (productRowsError) {
    console.error("Failed to load product names for preview regeneration", {
      code: productRowsError.code,
      message: productRowsError.message,
      details: productRowsError.details,
      hint: productRowsError.hint,
    });
  }

  const productNamesById = new Map(
    (productRows ?? []).map((row) => [row.id, row.name]),
  );

  const images: ProductPreviewRow[] = normalizedRows.map((row) => ({
    id: row.id,
    product_id: row.product_id,
    preview_path: row.preview_path,
    productName: productNamesById.get(row.product_id) ?? "Product",
  }));

  return {
    success: true as const,
    images,
  };
}

export async function prepareProtectedPreviewRegeneration({
  productId,
  productImageId,
}: {
  productId?: string;
  productImageId?: string;
} = {}): Promise<PreviewRegenerationPrepareResult> {
  const rowsResult = await loadProductPreviewRows({ productId, productImageId });

  if (!rowsResult.success) {
    return {
      success: false,
      message: rowsResult.message,
    };
  }

  const items: PreviewRegenerationTarget[] = rowsResult.images.map((image) => ({
    imageId: image.id,
    productId: image.product_id,
    productName: image.productName,
  }));

  return {
    success: true,
    total: items.length,
    items,
  };
}

export async function regenerateProtectedPreviewByImageId(
  imageId: string,
): Promise<PreviewRegenerationItemResult> {
  const rowsResult = await loadProductPreviewRows({ productImageId: imageId });

  if (!rowsResult.success) {
    return {
      success: false,
      imageId,
      productName: "Product",
      message: rowsResult.message,
    };
  }

  const image = rowsResult.images[0];

  if (!image) {
    return {
      success: false,
      imageId,
      productName: "Product",
      message: "The requested protected preview could not be found.",
    };
  }

  const previewPath = image.preview_path?.trim() || null;

  if (!previewPath) {
    return {
      success: false,
      imageId: image.id,
      productName: image.productName,
      message: "This image does not have a protected preview path yet.",
    };
  }

  const supabase = await createClient();
  const { data: originalRows, error: originalRowsError } = await supabase
    .from("product_image_originals")
    .select("storage_path")
    .eq("product_image_id", image.id)
    .limit(1);

  if (originalRowsError) {
    console.error("Failed to load private original metadata for regeneration", {
      code: originalRowsError.code,
      message: originalRowsError.message,
      details: originalRowsError.details,
      hint: originalRowsError.hint,
      imageId: image.id,
      productId: image.product_id,
    });

    return {
      success: false,
      imageId: image.id,
      productName: image.productName,
      message: "The private original mapping could not be loaded.",
    };
  }

  const originalPath = originalRows?.[0]?.storage_path?.trim() || null;

  if (!originalPath) {
    return {
      success: false,
      imageId: image.id,
      productName: image.productName,
      message: "This image does not have a private original mapping yet.",
    };
  }

  const { data: originalFile, error: downloadError } = await supabase.storage
    .from(PRODUCT_IMAGE_ORIGINALS_BUCKET)
    .download(originalPath);

  if (downloadError || !originalFile) {
    console.error("Failed to download private original for preview regeneration", {
      imageId: image.id,
      productId: image.product_id,
      message: downloadError?.message ?? "Missing original file data",
    });

    return {
      success: false,
      imageId: image.id,
      productName: image.productName,
      message: summarizePreviewRegenerationError(
        downloadError,
        "The private original could not be downloaded.",
      ),
    };
  }

  const watermarkSettings = pickWatermarkSettings(await getLatestSiteSettings());
  const uploadResult = await uploadProtectedProductPreview({
    supabase,
    previewPath,
    sourceBuffer: Buffer.from(await originalFile.arrayBuffer()),
    watermarkSettings,
    upsert: true,
  });

  if (!uploadResult.success) {
    return {
      success: false,
      imageId: image.id,
      productName: image.productName,
      message: uploadResult.message,
    };
  }

  const { error: updateError } = await supabase
    .from("product_images")
    .update({
      preview_updated_at: new Date().toISOString(),
    })
    .eq("id", image.id);

  if (updateError) {
    console.error("Failed to update preview version after regeneration", {
      imageId: image.id,
      productId: image.product_id,
      code: updateError.code,
      message: updateError.message,
      details: updateError.details,
      hint: updateError.hint,
    });

    return {
      success: false,
      imageId: image.id,
      productName: image.productName,
      message:
        "The preview was regenerated, but its public cache version could not be refreshed.",
    };
  }

  return {
    success: true,
    imageId: image.id,
    productName: image.productName,
  };
}

export async function regenerateProtectedPreviewsSummary({
  productId,
  productImageId,
}: {
  productId?: string;
  productImageId?: string;
} = {}): Promise<PreviewRegenerationSummaryResult> {
  const prepareResult = await prepareProtectedPreviewRegeneration({
    productId,
    productImageId,
  });

  if (!prepareResult.success) {
    return {
      success: false,
      total: 0,
      updated: 0,
      failed: 1,
      failures: [
        {
          productName: "Catalog",
          imageId: productImageId ?? productId ?? "all",
          message: prepareResult.message,
        },
      ],
    };
  }

  if (prepareResult.total === 0) {
    return {
      success: true,
      total: 0,
      updated: 0,
      failed: 0,
      failures: [],
    };
  }

  const failures: PreviewRegenerationFailure[] = [];
  let updated = 0;

  for (const item of prepareResult.items) {
    const result = await regenerateProtectedPreviewByImageId(item.imageId);

    if (result.success) {
      updated += 1;
      continue;
    }

    failures.push({
      productName: result.productName,
      imageId: result.imageId,
      message: result.message,
    });
  }

  if (updated > 0) {
    updateTag(SITE_SETTINGS_CACHE_TAG);
    await revalidateAppearanceRoutes();
  }

  return {
    success: failures.length === 0,
    total: prepareResult.total,
    updated,
    failed: failures.length,
    failures,
  };
}
