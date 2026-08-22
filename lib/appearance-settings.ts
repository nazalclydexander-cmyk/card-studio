import {
  DEFAULT_SITE_SETTINGS,
  type SiteSettings,
} from "@/lib/site-settings-config";
import {
  FONT_REGISTRY,
  getApprovedFontKey,
  type ApprovedFontKey,
} from "@/lib/font-registry";
import { isValidSiteLogoPath } from "@/lib/site-assets";
import {
  DEFAULT_WATERMARK_SETTINGS,
  WATERMARK_FONT_REGISTRY,
  clampWatermarkFontScale,
  clampWatermarkOpacity,
  clampWatermarkRotation,
  clampWatermarkSpacing,
  getApprovedWatermarkFontKey,
  isWatermarkMode,
  isValidWatermarkHexColor,
  normalizeWatermarkHexColor,
  normalizeWatermarkText,
  type WatermarkFontKey,
  type WatermarkMode,
} from "@/lib/watermark-settings";

export const COLOR_FIELD_OPTIONS = [
  { key: "primary_color", label: "Primary", description: "Buttons and emphasis" },
  {
    key: "secondary_color",
    label: "Secondary",
    description: "Soft supporting surfaces",
  },
  { key: "accent_color", label: "Accent", description: "Small highlight details" },
  {
    key: "background_color",
    label: "Background",
    description: "Overall page background",
  },
  { key: "surface_color", label: "Surface", description: "Cards and panels" },
  { key: "text_color", label: "Text", description: "Primary readable text" },
  {
    key: "muted_text_color",
    label: "Muted text",
    description: "Supporting text and captions",
  },
] as const satisfies ReadonlyArray<{
  key: keyof Pick<
    SiteSettings,
    | "primary_color"
    | "secondary_color"
    | "accent_color"
    | "background_color"
    | "surface_color"
    | "text_color"
    | "muted_text_color"
  >;
  label: string;
  description: string;
}>;

export const CURRENCY_OPTIONS = [
  { code: "PHP", label: "Philippine Peso (PHP)" },
  { code: "USD", label: "US Dollar (USD)" },
] as const;

export const MIN_RADIUS_PX = 0;
export const MAX_RADIUS_PX = 40;

const HEX_COLOR_PATTERN = /^#[0-9A-Fa-f]{6}$/;
const SAFE_RADIUS_PATTERN = /^[0-9]+px$/;
const EMAIL_PATTERN = /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i;
const HTTPS_ONLY_PATTERN = /^https:\/\//i;
const MAX_PHONE_LENGTH = 40;
const MAX_ADDRESS_LENGTH = 500;

const SOCIAL_HOSTS = {
  facebook_url: ["facebook.com"],
  instagram_url: ["instagram.com"],
} as const;

export type AppearanceFormValues = {
  site_name: string;
  tagline: string;
  logo_path: string;
  contact_email: string;
  contact_phone: string;
  business_address: string;
  facebook_url: string;
  instagram_url: string;
  hero_title: string;
  hero_subtitle: string;
  primary_color: string;
  secondary_color: string;
  accent_color: string;
  background_color: string;
  surface_color: string;
  text_color: string;
  muted_text_color: string;
  heading_font: ApprovedFontKey;
  body_font: ApprovedFontKey;
  card_radius_px: number;
  button_radius_px: number;
  show_prices: boolean;
  currency_code: (typeof CURRENCY_OPTIONS)[number]["code"];
  hidden_price_label: string;
  watermark_enabled: boolean;
  watermark_text: string;
  watermark_font: WatermarkFontKey;
  watermark_mode: WatermarkMode;
  watermark_color: string;
  watermark_light_color: string;
  watermark_dark_color: string;
  watermark_opacity_percent: number;
  watermark_rotation_degrees: number;
  watermark_font_scale_percent: number;
  watermark_spacing_x_percent: number;
  watermark_spacing_y_percent: number;
  watermark_repeat: boolean;
};

export type AppearanceFieldErrors = Partial<
  Record<keyof AppearanceFormValues, string>
>;

export type AppearanceActionResult = {
  success: boolean;
  message: string;
  fieldErrors?: AppearanceFieldErrors;
  values?: AppearanceFormValues;
};

export function getFontOptions() {
  return Object.keys(FONT_REGISTRY).map((fontKey) => ({
    value: fontKey as ApprovedFontKey,
    label: fontKey
      .split("_")
      .map((segment) => segment.charAt(0).toUpperCase() + segment.slice(1))
      .join(" "),
  }));
}

export function getWatermarkFontOptions() {
  return Object.keys(WATERMARK_FONT_REGISTRY).map((fontKey) => ({
    value: fontKey as WatermarkFontKey,
    label: fontKey
      .split("_")
      .map((segment) => segment.charAt(0).toUpperCase() + segment.slice(1))
      .join(" "),
  }));
}

export function normalizeHexColor(value: string) {
  return value.trim().toUpperCase();
}

function normalizeOptionalText(value: string) {
  const trimmedValue = value.trim();
  return trimmedValue || null;
}

function normalizeOptionalUrl(value: string) {
  const trimmedValue = value.trim();
  return trimmedValue || null;
}

export function isValidHexColor(value: string) {
  return HEX_COLOR_PATTERN.test(value);
}

function isApprovedSocialHost(value: string, allowedRoots: readonly string[]) {
  try {
    const url = new URL(value);
    const normalizedHost = url.hostname.toLowerCase();

    return allowedRoots.some((root) =>
      normalizedHost === root || normalizedHost.endsWith(`.${root}`),
    );
  } catch {
    return false;
  }
}

export function validateSocialUrl(
  value: string | null,
  field: keyof typeof SOCIAL_HOSTS,
) {
  if (!value) {
    return true;
  }

  if (!HTTPS_ONLY_PATTERN.test(value)) {
    return false;
  }

  return isApprovedSocialHost(value, SOCIAL_HOSTS[field]);
}

function clampRadius(value: number) {
  return Math.min(MAX_RADIUS_PX, Math.max(MIN_RADIUS_PX, Math.round(value)));
}

function convertRemToPx(value: number) {
  return Math.round(value * 16);
}

export function radiusCssToPixels(value: string) {
  const normalizedValue = value.trim().toLowerCase();

  if (normalizedValue.endsWith("px")) {
    const parsed = Number.parseFloat(normalizedValue.slice(0, -2));
    return Number.isFinite(parsed) ? clampRadius(parsed) : 0;
  }

  if (normalizedValue.endsWith("rem")) {
    const parsed = Number.parseFloat(normalizedValue.slice(0, -3));
    return Number.isFinite(parsed) ? clampRadius(convertRemToPx(parsed)) : 0;
  }

  return 0;
}

export function pixelsToRadiusCss(value: number) {
  return `${clampRadius(value)}px`;
}

export function createAppearanceFormValues(
  settings: SiteSettings,
): AppearanceFormValues {
  const headingFont =
    getApprovedFontKey(settings.heading_font) ??
    getApprovedFontKey(DEFAULT_SITE_SETTINGS.heading_font) ??
    "georgia";
  const bodyFont =
    getApprovedFontKey(settings.body_font) ??
    getApprovedFontKey(DEFAULT_SITE_SETTINGS.body_font) ??
    "arial";

  return {
    site_name: settings.site_name,
    tagline: settings.tagline,
    logo_path: settings.logo_path ?? "",
    contact_email: settings.contact_email ?? "",
    contact_phone: settings.contact_phone ?? "",
    business_address: settings.business_address ?? "",
    facebook_url: settings.facebook_url ?? "",
    instagram_url: settings.instagram_url ?? "",
    hero_title: settings.hero_title,
    hero_subtitle: settings.hero_subtitle,
    primary_color: settings.primary_color,
    secondary_color: settings.secondary_color,
    accent_color: settings.accent_color,
    background_color: settings.background_color,
    surface_color: settings.surface_color,
    text_color: settings.text_color,
    muted_text_color: settings.muted_text_color,
    heading_font: headingFont,
    body_font: bodyFont,
    card_radius_px: radiusCssToPixels(settings.card_radius),
    button_radius_px: radiusCssToPixels(settings.button_radius),
    show_prices: settings.show_prices,
    currency_code:
      CURRENCY_OPTIONS.find(
        (option) => option.code === settings.currency_code,
      )?.code ?? "PHP",
    hidden_price_label: settings.hidden_price_label,
    watermark_enabled: settings.watermark_enabled,
    watermark_text: settings.watermark_text,
    watermark_font:
      getApprovedWatermarkFontKey(settings.watermark_font) ??
      DEFAULT_WATERMARK_SETTINGS.watermark_font,
    watermark_mode: isWatermarkMode(settings.watermark_mode)
      ? settings.watermark_mode
      : DEFAULT_WATERMARK_SETTINGS.watermark_mode,
    watermark_color: settings.watermark_color,
    watermark_light_color: settings.watermark_light_color,
    watermark_dark_color: settings.watermark_dark_color,
    watermark_opacity_percent: Math.round(settings.watermark_opacity * 100),
    watermark_rotation_degrees: settings.watermark_rotation,
    watermark_font_scale_percent: Math.round(settings.watermark_font_scale * 100),
    watermark_spacing_x_percent: settings.watermark_spacing_x,
    watermark_spacing_y_percent: settings.watermark_spacing_y,
    watermark_repeat: settings.watermark_repeat,
  };
}

export const DEFAULT_APPEARANCE_FORM_VALUES = createAppearanceFormValues(
  DEFAULT_SITE_SETTINGS,
);

export function mapAppearanceFormValuesToSiteSettings(
  values: AppearanceFormValues,
  currentLogoPath: string | null,
): SiteSettings {
  return {
    site_name: values.site_name.trim(),
    tagline: values.tagline.trim(),
    logo_path: currentLogoPath,
    contact_email: normalizeOptionalText(values.contact_email)?.toLowerCase() ?? null,
    contact_phone: normalizeOptionalText(values.contact_phone),
    business_address: normalizeOptionalText(values.business_address),
    facebook_url: normalizeOptionalUrl(values.facebook_url),
    instagram_url: normalizeOptionalUrl(values.instagram_url),
    primary_color: normalizeHexColor(values.primary_color),
    secondary_color: normalizeHexColor(values.secondary_color),
    accent_color: normalizeHexColor(values.accent_color),
    background_color: normalizeHexColor(values.background_color),
    surface_color: normalizeHexColor(values.surface_color),
    text_color: normalizeHexColor(values.text_color),
    muted_text_color: normalizeHexColor(values.muted_text_color),
    heading_font: values.heading_font,
    body_font: values.body_font,
    card_radius: pixelsToRadiusCss(values.card_radius_px),
    button_radius: pixelsToRadiusCss(values.button_radius_px),
    show_prices: values.show_prices,
    currency_code: values.currency_code,
    hidden_price_label: values.hidden_price_label.trim(),
    hero_title: values.hero_title.trim(),
    hero_subtitle: values.hero_subtitle.trim(),
    watermark_enabled: values.watermark_enabled,
    watermark_text: normalizeWatermarkText(values.watermark_text),
    watermark_font:
      getApprovedWatermarkFontKey(values.watermark_font) ??
      DEFAULT_WATERMARK_SETTINGS.watermark_font,
    watermark_mode: isWatermarkMode(values.watermark_mode)
      ? values.watermark_mode
      : DEFAULT_WATERMARK_SETTINGS.watermark_mode,
    watermark_color: normalizeWatermarkHexColor(values.watermark_color),
    watermark_light_color: normalizeWatermarkHexColor(values.watermark_light_color),
    watermark_dark_color: normalizeWatermarkHexColor(values.watermark_dark_color),
    watermark_opacity: clampWatermarkOpacity(values.watermark_opacity_percent / 100),
    watermark_rotation: clampWatermarkRotation(values.watermark_rotation_degrees),
    watermark_font_scale: clampWatermarkFontScale(
      values.watermark_font_scale_percent / 100,
    ),
    watermark_spacing_x: clampWatermarkSpacing(values.watermark_spacing_x_percent),
    watermark_spacing_y: clampWatermarkSpacing(values.watermark_spacing_y_percent),
    watermark_repeat: values.watermark_repeat,
  };
}

export function validateAppearanceFormValues(
  input: AppearanceFormValues,
): {
  success: true;
  data: SiteSettings;
} | {
  success: false;
  fieldErrors: AppearanceFieldErrors;
  values: AppearanceFormValues;
} {
  const normalizedValues: AppearanceFormValues = {
    ...input,
    site_name: input.site_name.trim(),
    tagline: input.tagline.trim(),
    contact_email: input.contact_email.trim(),
    contact_phone: input.contact_phone.trim(),
    business_address: input.business_address.trim(),
    facebook_url: input.facebook_url.trim(),
    instagram_url: input.instagram_url.trim(),
    hero_title: input.hero_title.trim(),
    hero_subtitle: input.hero_subtitle.trim(),
    hidden_price_label: input.hidden_price_label.trim(),
    watermark_text: normalizeWatermarkText(input.watermark_text),
    primary_color: normalizeHexColor(input.primary_color),
    secondary_color: normalizeHexColor(input.secondary_color),
    accent_color: normalizeHexColor(input.accent_color),
    background_color: normalizeHexColor(input.background_color),
    surface_color: normalizeHexColor(input.surface_color),
    text_color: normalizeHexColor(input.text_color),
    muted_text_color: normalizeHexColor(input.muted_text_color),
    card_radius_px: clampRadius(input.card_radius_px),
    button_radius_px: clampRadius(input.button_radius_px),
    watermark_color: normalizeWatermarkHexColor(input.watermark_color),
    watermark_light_color: normalizeWatermarkHexColor(input.watermark_light_color),
    watermark_dark_color: normalizeWatermarkHexColor(input.watermark_dark_color),
    watermark_opacity_percent: Math.round(
      clampWatermarkOpacity(input.watermark_opacity_percent / 100) * 100,
    ),
    watermark_rotation_degrees: clampWatermarkRotation(
      input.watermark_rotation_degrees,
    ),
    watermark_font_scale_percent: Math.round(
      clampWatermarkFontScale(input.watermark_font_scale_percent / 100) * 100,
    ),
    watermark_spacing_x_percent: clampWatermarkSpacing(
      input.watermark_spacing_x_percent,
    ),
    watermark_spacing_y_percent: clampWatermarkSpacing(
      input.watermark_spacing_y_percent,
    ),
  };

  const fieldErrors: AppearanceFieldErrors = {};

  if (!normalizedValues.site_name) {
    fieldErrors.site_name = "Site name is required.";
  }

  if (!normalizedValues.tagline) {
    fieldErrors.tagline = "Tagline is required.";
  }

  if (normalizedValues.logo_path && !isValidSiteLogoPath(normalizedValues.logo_path)) {
    fieldErrors.logo_path = "Use a valid stored logo path.";
  }

  if (
    normalizedValues.contact_email &&
    !EMAIL_PATTERN.test(normalizedValues.contact_email)
  ) {
    fieldErrors.contact_email = "Use a valid email address.";
  }

  if (normalizedValues.contact_phone.length > MAX_PHONE_LENGTH) {
    fieldErrors.contact_phone = `Phone must be ${MAX_PHONE_LENGTH} characters or fewer.`;
  }

  if (normalizedValues.business_address.length > MAX_ADDRESS_LENGTH) {
    fieldErrors.business_address =
      `Address must be ${MAX_ADDRESS_LENGTH} characters or fewer.`;
  }

  if (
    normalizedValues.facebook_url &&
    !validateSocialUrl(normalizedValues.facebook_url, "facebook_url")
  ) {
    fieldErrors.facebook_url =
      "Use a valid https://facebook.com URL.";
  }

  if (
    normalizedValues.instagram_url &&
    !validateSocialUrl(normalizedValues.instagram_url, "instagram_url")
  ) {
    fieldErrors.instagram_url =
      "Use a valid https://instagram.com URL.";
  }

  if (!normalizedValues.hero_title) {
    fieldErrors.hero_title = "Hero title is required.";
  }

  if (!normalizedValues.hero_subtitle) {
    fieldErrors.hero_subtitle = "Hero subtitle is required.";
  }

  if (!normalizedValues.hidden_price_label) {
    fieldErrors.hidden_price_label = "Hidden price label is required.";
  }

  if (normalizedValues.watermark_enabled && !normalizedValues.watermark_text) {
    fieldErrors.watermark_text =
      "Watermark text is required when watermarking is enabled.";
  }

  if (!getApprovedWatermarkFontKey(normalizedValues.watermark_font)) {
    fieldErrors.watermark_font = "Choose an approved watermark font.";
  }

  if (!isWatermarkMode(normalizedValues.watermark_mode)) {
    fieldErrors.watermark_mode = "Choose a supported watermark mode.";
  }

  if (!isValidWatermarkHexColor(normalizedValues.watermark_color)) {
    fieldErrors.watermark_color = "Use a valid 6-digit hex color.";
  }

  if (!isValidWatermarkHexColor(normalizedValues.watermark_light_color)) {
    fieldErrors.watermark_light_color = "Use a valid 6-digit hex color.";
  }

  if (!isValidWatermarkHexColor(normalizedValues.watermark_dark_color)) {
    fieldErrors.watermark_dark_color = "Use a valid 6-digit hex color.";
  }

  for (const colorField of COLOR_FIELD_OPTIONS) {
    if (!isValidHexColor(normalizedValues[colorField.key])) {
      fieldErrors[colorField.key] = "Use a valid 6-digit hex color.";
    }
  }

  if (!getApprovedFontKey(normalizedValues.heading_font)) {
    fieldErrors.heading_font = "Choose an approved heading font.";
  }

  if (!getApprovedFontKey(normalizedValues.body_font)) {
    fieldErrors.body_font = "Choose an approved body font.";
  }

  const cardRadius = pixelsToRadiusCss(normalizedValues.card_radius_px);
  if (!SAFE_RADIUS_PATTERN.test(cardRadius)) {
    fieldErrors.card_radius_px = "Choose a safe card radius value.";
  }

  const buttonRadius = pixelsToRadiusCss(normalizedValues.button_radius_px);
  if (!SAFE_RADIUS_PATTERN.test(buttonRadius)) {
    fieldErrors.button_radius_px = "Choose a safe button radius value.";
  }

  if (
    !CURRENCY_OPTIONS.some(
      (option) => option.code === normalizedValues.currency_code,
    )
  ) {
    fieldErrors.currency_code = "Choose a supported currency.";
  }

  if (Object.keys(fieldErrors).length > 0) {
    return {
      success: false,
      fieldErrors,
      values: normalizedValues,
    };
  }

  return {
    success: true,
    data: mapAppearanceFormValuesToSiteSettings(
      normalizedValues,
      input.logo_path.trim() || null,
    ),
  };
}
