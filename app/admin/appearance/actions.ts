"use server";

import { revalidatePath, updateTag } from "next/cache";

import { requireAdmin } from "@/lib/admin";
import {
  type AppearanceActionResult,
  type AppearanceFormValues,
  validateAppearanceFormValues,
} from "@/lib/appearance-settings";
import {
  getLatestSiteSettings,
  SITE_SETTINGS_CACHE_TAG,
} from "@/lib/site-settings";
import { uploadProtectedProductPreview } from "@/lib/product-image-storage";
import { PRODUCT_IMAGE_ORIGINALS_BUCKET } from "@/lib/product-images";
import { createClient } from "@/lib/supabase/server";
import { pickWatermarkSettings } from "@/lib/watermark-settings";

type PreviewRegenerationFailure = {
  productName: string;
  imageId: string;
  message: string;
};

type PreviewRegenerationActionResult = {
  success: boolean;
  total: number;
  updated: number;
  failed: number;
  failures: PreviewRegenerationFailure[];
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

async function revalidateAppearanceRoutes() {
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

export async function updateAppearanceSettingsAction(
  values: AppearanceFormValues,
): Promise<AppearanceActionResult> {
  const access = await requireAdmin();

  if (!access.isAdmin) {
    return {
      success: false,
      message: "You are not authorized to update appearance settings.",
      values,
    };
  }

  const validation = validateAppearanceFormValues(values);

  if (!validation.success) {
    return {
      success: false,
      message: "Please fix the highlighted appearance settings.",
      fieldErrors: validation.fieldErrors,
      values: validation.values,
    };
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("site_settings")
    .update({
      site_name: validation.data.site_name,
      tagline: validation.data.tagline,
      logo_path: validation.data.logo_path,
      contact_email: validation.data.contact_email,
      contact_phone: validation.data.contact_phone,
      business_address: validation.data.business_address,
      facebook_url: validation.data.facebook_url,
      instagram_url: validation.data.instagram_url,
      primary_color: validation.data.primary_color,
      secondary_color: validation.data.secondary_color,
      accent_color: validation.data.accent_color,
      background_color: validation.data.background_color,
      surface_color: validation.data.surface_color,
      text_color: validation.data.text_color,
      muted_text_color: validation.data.muted_text_color,
      heading_font: validation.data.heading_font,
      body_font: validation.data.body_font,
      card_radius: validation.data.card_radius,
      button_radius: validation.data.button_radius,
      show_prices: validation.data.show_prices,
      currency_code: validation.data.currency_code,
      hidden_price_label: validation.data.hidden_price_label,
      hero_title: validation.data.hero_title,
      hero_subtitle: validation.data.hero_subtitle,
      watermark_enabled: validation.data.watermark_enabled,
      watermark_text: validation.data.watermark_text,
      watermark_font: validation.data.watermark_font,
      watermark_mode: validation.data.watermark_mode,
      watermark_color: validation.data.watermark_color,
      watermark_light_color: validation.data.watermark_light_color,
      watermark_dark_color: validation.data.watermark_dark_color,
      watermark_opacity: validation.data.watermark_opacity,
      watermark_rotation: validation.data.watermark_rotation,
      watermark_font_scale: validation.data.watermark_font_scale,
      watermark_spacing_x: validation.data.watermark_spacing_x,
      watermark_spacing_y: validation.data.watermark_spacing_y,
      watermark_repeat: validation.data.watermark_repeat,
    })
    .eq("id", true);

  if (error) {
    console.error("Failed to update appearance settings", {
      code: error.code,
      message: error.message,
      details: error.details,
      hint: error.hint,
    });

    return {
      success: false,
      message:
        "We couldn't save the appearance settings right now. Please try again.",
      values,
    };
  }

  updateTag(SITE_SETTINGS_CACHE_TAG);
  await revalidateAppearanceRoutes();

  return {
    success: true,
    message: "Appearance settings saved successfully.",
  };
}

export async function regenerateExistingProtectedPreviewsAction({
  productId,
  productImageId,
}: {
  productId?: string;
  productImageId?: string;
} = {}): Promise<PreviewRegenerationActionResult> {
  const access = await requireAdmin();

  if (!access.isAdmin) {
    return {
      success: false,
      total: 0,
      updated: 0,
      failed: 1,
      failures: [
        {
          productName: "Authorization",
          imageId: productImageId ?? productId ?? "all",
          message: "You are not authorized to regenerate product previews.",
        },
      ],
    };
  }

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
      success: false,
      total: 0,
      updated: 0,
      failed: 1,
      failures: [
        {
          productName: "Catalog",
          imageId: productImageId ?? productId ?? "all",
          message: "The existing product previews could not be loaded.",
        },
      ],
    };
  }

  const productIds = Array.from(
    new Set((imageRows ?? []).map((row) => row.product_id)),
  );
  const { data: productRows, error: productRowsError } = productIds.length
    ? await supabase
        .from("products")
        .select("id, name")
        .in("id", productIds)
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
  const images = (imageRows ?? []).map((row) => ({
    id: row.id,
    product_id: row.product_id,
    preview_path: row.preview_path,
    productName: productNamesById.get(row.product_id) ?? "Product",
  }));

  if (!images.length) {
    return {
      success: true,
      total: 0,
      updated: 0,
      failed: 0,
      failures: [],
    };
  }

  const { data: originalRows, error: originalRowsError } = await supabase
    .from("product_image_originals")
    .select("product_image_id, storage_path")
    .in(
      "product_image_id",
      images.map((image) => image.id),
    );

  if (originalRowsError) {
    console.error("Failed to load private original metadata for regeneration", {
      code: originalRowsError.code,
      message: originalRowsError.message,
      details: originalRowsError.details,
      hint: originalRowsError.hint,
    });

    return {
      success: false,
      total: images.length,
      updated: 0,
      failed: images.length,
      failures: images.map((image) => ({
        productName: image.productName,
        imageId: image.id,
        message: "The private original mapping could not be loaded.",
      })),
    };
  }

  const originalsByImageId = new Map(
    (originalRows ?? []).map((row) => [row.product_image_id, row.storage_path]),
  );
  const watermarkSettings = pickWatermarkSettings(await getLatestSiteSettings());
  const failures: PreviewRegenerationFailure[] = [];
  let updated = 0;

  for (const image of images) {
    const previewPath = image.preview_path?.trim() || null;
    const originalPath = originalsByImageId.get(image.id)?.trim() || null;

    if (!previewPath) {
      failures.push({
        productName: image.productName,
        imageId: image.id,
        message: "This image does not have a protected preview path yet.",
      });
      continue;
    }

    if (!originalPath) {
      failures.push({
        productName: image.productName,
        imageId: image.id,
        message: "This image does not have a private original mapping yet.",
      });
      continue;
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

      failures.push({
        productName: image.productName,
        imageId: image.id,
        message: summarizePreviewRegenerationError(
          downloadError,
          "The private original could not be downloaded.",
        ),
      });
      continue;
    }

    const uploadResult = await uploadProtectedProductPreview({
      supabase,
      previewPath,
      sourceBuffer: Buffer.from(await originalFile.arrayBuffer()),
      watermarkSettings,
      upsert: true,
    });

    if (!uploadResult.success) {
      failures.push({
        productName: image.productName,
        imageId: image.id,
        message: uploadResult.message,
      });
      continue;
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

      failures.push({
        productName: image.productName,
        imageId: image.id,
        message: "The preview was regenerated, but its public cache version could not be refreshed.",
      });
      continue;
    }

    updated += 1;
  }

  if (updated > 0) {
    await revalidateAppearanceRoutes();
  }

  return {
    success: failures.length === 0,
    total: images.length,
    updated,
    failed: failures.length,
    failures,
  };
}
