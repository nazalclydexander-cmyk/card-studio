"use server";

import { updateTag } from "next/cache";

import { requireAdmin } from "@/lib/admin";
import {
  type AppearanceActionResult,
  type AppearanceFormValues,
  validateAppearanceFormValues,
} from "@/lib/appearance-settings";
import {
  regenerateProtectedPreviewsSummary,
  revalidateAppearanceRoutes,
} from "@/lib/product-preview-regeneration";
import type { PreviewRegenerationSummaryResult } from "@/lib/product-preview-regeneration-shared";
import { SITE_SETTINGS_CACHE_TAG } from "@/lib/site-settings";
import { createClient } from "@/lib/supabase/server";

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
} = {}): Promise<PreviewRegenerationSummaryResult> {
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

  return regenerateProtectedPreviewsSummary({ productId, productImageId });
}
