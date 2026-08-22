import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { cacheLife, cacheTag } from "next/cache";

import {
  DEFAULT_SITE_SETTINGS,
  type SiteSettings,
} from "@/lib/site-settings-config";
export { DEFAULT_SITE_SETTINGS };
export type { SiteSettings };

export const SITE_SETTINGS_CACHE_TAG = "site-settings";

type SiteSettingsRow = SiteSettings & {
  id: boolean;
};

const siteSettingsSelect = `
  id,
  site_name,
  tagline,
  logo_path,
  contact_email,
  contact_phone,
  business_address,
  facebook_url,
  instagram_url,
  primary_color,
  secondary_color,
  accent_color,
  background_color,
  surface_color,
  text_color,
  muted_text_color,
  heading_font,
  body_font,
  card_radius,
  button_radius,
  show_prices,
  currency_code,
  hidden_price_label,
  hero_title,
  hero_subtitle,
  watermark_enabled,
  watermark_text,
  watermark_font,
  watermark_mode,
  watermark_color,
  watermark_light_color,
  watermark_dark_color,
  watermark_opacity,
  watermark_rotation,
  watermark_font_scale,
  watermark_spacing_x,
  watermark_spacing_y,
  watermark_repeat
`;

const legacySiteSettingsSelect = `
  id,
  site_name,
  tagline,
  logo_path,
  contact_email,
  contact_phone,
  business_address,
  facebook_url,
  instagram_url,
  primary_color,
  secondary_color,
  accent_color,
  background_color,
  surface_color,
  text_color,
  muted_text_color,
  heading_font,
  body_font,
  card_radius,
  button_radius,
  show_prices,
  currency_code,
  hidden_price_label,
  hero_title,
  hero_subtitle
`;

function normalizeSiteSettings(row: SiteSettingsRow | null): SiteSettings {
  if (!row) {
    return DEFAULT_SITE_SETTINGS;
  }

  return {
    site_name: row.site_name,
    tagline: row.tagline,
    logo_path: row.logo_path,
    contact_email: row.contact_email,
    contact_phone: row.contact_phone,
    business_address: row.business_address,
    facebook_url: row.facebook_url,
    instagram_url: row.instagram_url,
    primary_color: row.primary_color,
    secondary_color: row.secondary_color,
    accent_color: row.accent_color,
    background_color: row.background_color,
    surface_color: row.surface_color,
    text_color: row.text_color,
    muted_text_color: row.muted_text_color,
    heading_font: row.heading_font,
    body_font: row.body_font,
    card_radius: row.card_radius,
    button_radius: row.button_radius,
    show_prices: row.show_prices,
    currency_code: row.currency_code,
    hidden_price_label: row.hidden_price_label,
    hero_title: row.hero_title,
    hero_subtitle: row.hero_subtitle,
    watermark_enabled: row.watermark_enabled,
    watermark_text: row.watermark_text,
    watermark_font: row.watermark_font,
    watermark_mode: row.watermark_mode,
    watermark_color: row.watermark_color,
    watermark_light_color: row.watermark_light_color,
    watermark_dark_color: row.watermark_dark_color,
    watermark_opacity: row.watermark_opacity,
    watermark_rotation: row.watermark_rotation,
    watermark_font_scale: row.watermark_font_scale,
    watermark_spacing_x: row.watermark_spacing_x,
    watermark_spacing_y: row.watermark_spacing_y,
    watermark_repeat: row.watermark_repeat,
  };
}

function isMissingWatermarkColumnError(error: { code?: string | null; message?: string | null }) {
  return (
    error.code === "42703" &&
    typeof error.message === "string" &&
    error.message.includes("watermark_")
  );
}

function createPublicSiteSettingsClient() {
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
        detectSessionInUrl: false,
      },
    },
  );
}

async function loadSiteSettingsFromSupabase() {
  const supabase = createPublicSiteSettingsClient();
  const { data, error } = await supabase
    .from("site_settings")
    .select(siteSettingsSelect)
    .eq("id", true)
    .single();

  if (!error) {
    return normalizeSiteSettings(data as SiteSettingsRow | null);
  }

  if (isMissingWatermarkColumnError(error)) {
    const { data: legacyData, error: legacyError } = await supabase
      .from("site_settings")
      .select(legacySiteSettingsSelect)
      .eq("id", true)
      .single();

    if (!legacyError) {
      return {
        ...DEFAULT_SITE_SETTINGS,
        ...(legacyData ?? {}),
      };
    }

    console.error("Failed to load site settings", {
      code: legacyError.code,
      message: legacyError.message,
      details: legacyError.details,
      hint: legacyError.hint,
    });
  }

  if (error) {
    console.error("Failed to load site settings", {
      code: error.code,
      message: error.message,
      details: error.details,
      hint: error.hint,
    });

    return DEFAULT_SITE_SETTINGS;
  }

  return normalizeSiteSettings(data as SiteSettingsRow | null);
}

export async function getCachedPublicSiteSettings() {
  "use cache";

  cacheTag(SITE_SETTINGS_CACHE_TAG);
  cacheLife("max");

  return loadSiteSettingsFromSupabase();
}

export async function getLatestSiteSettings() {
  return loadSiteSettingsFromSupabase();
}

export async function getSiteSettings() {
  return getCachedPublicSiteSettings();
}
