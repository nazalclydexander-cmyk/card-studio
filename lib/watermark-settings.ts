export const WATERMARK_FONT_REGISTRY = {
  arial: 'Arial, Helvetica, sans-serif',
  helvetica: 'Helvetica, Arial, sans-serif',
  georgia: 'Georgia, "Times New Roman", Times, serif',
  times_new_roman: '"Times New Roman", Times, serif',
  trebuchet_ms: '"Trebuchet MS", Helvetica, sans-serif',
} as const;

export type WatermarkFontKey = keyof typeof WATERMARK_FONT_REGISTRY;
export type WatermarkMode = "manual" | "adaptive";

export type WatermarkSettings = {
  watermark_enabled: boolean;
  watermark_text: string;
  watermark_font: WatermarkFontKey;
  watermark_mode: WatermarkMode;
  watermark_color: string;
  watermark_light_color: string;
  watermark_dark_color: string;
  watermark_opacity: number;
  watermark_rotation: number;
  watermark_font_scale: number;
  watermark_spacing_x: number;
  watermark_spacing_y: number;
  watermark_repeat: boolean;
};

export type WatermarkSettingsInput = Partial<{
  [K in keyof WatermarkSettings]: WatermarkSettings[K] | string | number | boolean | null;
}>;

export const DEFAULT_WATERMARK_SETTINGS: WatermarkSettings = {
  watermark_enabled: true,
  watermark_text: "PREVIEW",
  watermark_font: "arial",
  watermark_mode: "adaptive",
  watermark_color: "#60544C",
  watermark_light_color: "#F8F4EE",
  watermark_dark_color: "#60544C",
  watermark_opacity: 0.2,
  watermark_rotation: -30,
  watermark_font_scale: 1,
  watermark_spacing_x: 100,
  watermark_spacing_y: 100,
  watermark_repeat: true,
};

export const WATERMARK_TEXT_MAX_LENGTH = 40;
export const WATERMARK_OPACITY_MIN = 0.05;
export const WATERMARK_OPACITY_MAX = 0.5;
export const WATERMARK_ROTATION_MIN = -60;
export const WATERMARK_ROTATION_MAX = 60;
export const WATERMARK_FONT_SCALE_MIN = 0.6;
export const WATERMARK_FONT_SCALE_MAX = 1.8;
export const WATERMARK_SPACING_MIN = 60;
export const WATERMARK_SPACING_MAX = 180;

const HEX_COLOR_PATTERN = /^#[0-9A-Fa-f]{6}$/;

export function normalizeWatermarkHexColor(value: string) {
  return value.trim().toUpperCase();
}

export function isValidWatermarkHexColor(value: string) {
  return HEX_COLOR_PATTERN.test(value);
}

export function getApprovedWatermarkFontKey(value: string | null | undefined) {
  if (!value) {
    return null;
  }

  if (value in WATERMARK_FONT_REGISTRY) {
    return value as WatermarkFontKey;
  }

  return null;
}

export function getWatermarkFontStack(value: string | null | undefined) {
  const fontKey =
    getApprovedWatermarkFontKey(value) ??
    DEFAULT_WATERMARK_SETTINGS.watermark_font;

  return WATERMARK_FONT_REGISTRY[fontKey];
}

export function normalizeWatermarkText(value: string) {
  return value.trim().replace(/\s+/g, " ").slice(0, WATERMARK_TEXT_MAX_LENGTH);
}

export function clampWatermarkOpacity(value: number) {
  return Number(
    Math.min(WATERMARK_OPACITY_MAX, Math.max(WATERMARK_OPACITY_MIN, value)).toFixed(
      2,
    ),
  );
}

export function clampWatermarkRotation(value: number) {
  return Math.min(WATERMARK_ROTATION_MAX, Math.max(WATERMARK_ROTATION_MIN, Math.round(value)));
}

export function clampWatermarkFontScale(value: number) {
  return Number(
    Math.min(WATERMARK_FONT_SCALE_MAX, Math.max(WATERMARK_FONT_SCALE_MIN, value)).toFixed(
      2,
    ),
  );
}

export function clampWatermarkSpacing(value: number) {
  return Math.min(WATERMARK_SPACING_MAX, Math.max(WATERMARK_SPACING_MIN, Math.round(value)));
}

export function isWatermarkMode(value: string | null | undefined): value is WatermarkMode {
  return value === "manual" || value === "adaptive";
}

export function validateWatermarkSettings(
  input: WatermarkSettings,
): {
  success: true;
  data: WatermarkSettings;
} | {
  success: false;
  fieldErrors: Partial<Record<keyof WatermarkSettings, string>>;
  values: WatermarkSettings;
} {
  const values: WatermarkSettings = {
    watermark_enabled: input.watermark_enabled,
    watermark_text: normalizeWatermarkText(input.watermark_text),
    watermark_font:
      getApprovedWatermarkFontKey(input.watermark_font) ??
      DEFAULT_WATERMARK_SETTINGS.watermark_font,
    watermark_mode: isWatermarkMode(input.watermark_mode)
      ? input.watermark_mode
      : DEFAULT_WATERMARK_SETTINGS.watermark_mode,
    watermark_color: normalizeWatermarkHexColor(input.watermark_color),
    watermark_light_color: normalizeWatermarkHexColor(input.watermark_light_color),
    watermark_dark_color: normalizeWatermarkHexColor(input.watermark_dark_color),
    watermark_opacity: clampWatermarkOpacity(input.watermark_opacity),
    watermark_rotation: clampWatermarkRotation(input.watermark_rotation),
    watermark_font_scale: clampWatermarkFontScale(input.watermark_font_scale),
    watermark_spacing_x: clampWatermarkSpacing(input.watermark_spacing_x),
    watermark_spacing_y: clampWatermarkSpacing(input.watermark_spacing_y),
    watermark_repeat: input.watermark_repeat,
  };

  const fieldErrors: Partial<Record<keyof WatermarkSettings, string>> = {};

  if (values.watermark_enabled && !values.watermark_text) {
    fieldErrors.watermark_text = "Watermark text is required when watermarking is enabled.";
  }

  if (!getApprovedWatermarkFontKey(values.watermark_font)) {
    fieldErrors.watermark_font = "Choose an approved watermark font.";
  }

  if (!isValidWatermarkHexColor(values.watermark_color)) {
    fieldErrors.watermark_color = "Use a valid 6-digit hex color.";
  }

  if (!isValidWatermarkHexColor(values.watermark_light_color)) {
    fieldErrors.watermark_light_color = "Use a valid 6-digit hex color.";
  }

  if (!isValidWatermarkHexColor(values.watermark_dark_color)) {
    fieldErrors.watermark_dark_color = "Use a valid 6-digit hex color.";
  }

  if (values.watermark_opacity < WATERMARK_OPACITY_MIN || values.watermark_opacity > WATERMARK_OPACITY_MAX) {
    fieldErrors.watermark_opacity = "Opacity must stay between 5% and 50%.";
  }

  if (values.watermark_rotation < WATERMARK_ROTATION_MIN || values.watermark_rotation > WATERMARK_ROTATION_MAX) {
    fieldErrors.watermark_rotation = "Rotation must stay between -60° and 60°.";
  }

  if (values.watermark_font_scale < WATERMARK_FONT_SCALE_MIN || values.watermark_font_scale > WATERMARK_FONT_SCALE_MAX) {
    fieldErrors.watermark_font_scale = "Size must stay within the supported range.";
  }

  if (values.watermark_spacing_x < WATERMARK_SPACING_MIN || values.watermark_spacing_x > WATERMARK_SPACING_MAX) {
    fieldErrors.watermark_spacing_x = "Horizontal spacing must stay within the supported range.";
  }

  if (values.watermark_spacing_y < WATERMARK_SPACING_MIN || values.watermark_spacing_y > WATERMARK_SPACING_MAX) {
    fieldErrors.watermark_spacing_y = "Vertical spacing must stay within the supported range.";
  }

  if (Object.keys(fieldErrors).length > 0) {
    return {
      success: false,
      fieldErrors,
      values,
    };
  }

  return {
    success: true,
    data: values,
  };
}

function parseBooleanValue(value: unknown, fallback: boolean) {
  if (typeof value === "boolean") {
    return value;
  }

  if (typeof value === "string") {
    const normalized = value.trim().toLowerCase();
    if (normalized === "true") {
      return true;
    }

    if (normalized === "false") {
      return false;
    }
  }

  return fallback;
}

function parseNumberValue(value: unknown, fallback: number) {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === "string") {
    const parsedValue = Number(value);
    if (Number.isFinite(parsedValue)) {
      return parsedValue;
    }
  }

  return fallback;
}

export function coerceWatermarkSettingsInput(
  input: WatermarkSettingsInput | null | undefined,
): WatermarkSettings {
  const source = input ?? {};
  const watermarkModeValue =
    typeof source.watermark_mode === "string" ? source.watermark_mode : null;
  const parsedWatermarkMode: WatermarkMode = isWatermarkMode(watermarkModeValue)
    ? watermarkModeValue
    : DEFAULT_WATERMARK_SETTINGS.watermark_mode;

  return {
    watermark_enabled: parseBooleanValue(
      source.watermark_enabled,
      DEFAULT_WATERMARK_SETTINGS.watermark_enabled,
    ),
    watermark_text:
      typeof source.watermark_text === "string"
        ? source.watermark_text
        : DEFAULT_WATERMARK_SETTINGS.watermark_text,
    watermark_font:
      getApprovedWatermarkFontKey(
        typeof source.watermark_font === "string" ? source.watermark_font : null,
      ) ?? DEFAULT_WATERMARK_SETTINGS.watermark_font,
    watermark_mode: parsedWatermarkMode,
    watermark_color:
      typeof source.watermark_color === "string"
        ? source.watermark_color
        : DEFAULT_WATERMARK_SETTINGS.watermark_color,
    watermark_light_color:
      typeof source.watermark_light_color === "string"
        ? source.watermark_light_color
        : DEFAULT_WATERMARK_SETTINGS.watermark_light_color,
    watermark_dark_color:
      typeof source.watermark_dark_color === "string"
        ? source.watermark_dark_color
        : DEFAULT_WATERMARK_SETTINGS.watermark_dark_color,
    watermark_opacity: parseNumberValue(
      source.watermark_opacity,
      DEFAULT_WATERMARK_SETTINGS.watermark_opacity,
    ),
    watermark_rotation: parseNumberValue(
      source.watermark_rotation,
      DEFAULT_WATERMARK_SETTINGS.watermark_rotation,
    ),
    watermark_font_scale: parseNumberValue(
      source.watermark_font_scale,
      DEFAULT_WATERMARK_SETTINGS.watermark_font_scale,
    ),
    watermark_spacing_x: parseNumberValue(
      source.watermark_spacing_x,
      DEFAULT_WATERMARK_SETTINGS.watermark_spacing_x,
    ),
    watermark_spacing_y: parseNumberValue(
      source.watermark_spacing_y,
      DEFAULT_WATERMARK_SETTINGS.watermark_spacing_y,
    ),
    watermark_repeat: parseBooleanValue(
      source.watermark_repeat,
      DEFAULT_WATERMARK_SETTINGS.watermark_repeat,
    ),
  };
}

export function pickWatermarkSettings(
  settings: Pick<
    WatermarkSettings,
    | "watermark_enabled"
    | "watermark_text"
    | "watermark_font"
    | "watermark_mode"
    | "watermark_color"
    | "watermark_light_color"
    | "watermark_dark_color"
    | "watermark_opacity"
    | "watermark_rotation"
    | "watermark_font_scale"
    | "watermark_spacing_x"
    | "watermark_spacing_y"
    | "watermark_repeat"
  >,
): WatermarkSettings {
  return {
    watermark_enabled: settings.watermark_enabled,
    watermark_text: settings.watermark_text,
    watermark_font: settings.watermark_font,
    watermark_mode: settings.watermark_mode,
    watermark_color: settings.watermark_color,
    watermark_light_color: settings.watermark_light_color,
    watermark_dark_color: settings.watermark_dark_color,
    watermark_opacity: settings.watermark_opacity,
    watermark_rotation: settings.watermark_rotation,
    watermark_font_scale: settings.watermark_font_scale,
    watermark_spacing_x: settings.watermark_spacing_x,
    watermark_spacing_y: settings.watermark_spacing_y,
    watermark_repeat: settings.watermark_repeat,
  };
}
