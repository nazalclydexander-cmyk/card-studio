import { cache } from "react";

import {
  DEFAULT_SITE_SETTINGS,
  type SiteSettings,
} from "@/lib/site-settings-config";
import { createClient } from "@/lib/supabase/server";
export { DEFAULT_SITE_SETTINGS };
export type { SiteSettings };

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
  };
}

export const getSiteSettings = cache(async () => {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("site_settings")
    .select(siteSettingsSelect)
    .eq("id", true)
    .single();

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
});
