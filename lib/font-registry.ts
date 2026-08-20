export const FONT_REGISTRY = {
  geist: 'var(--font-geist-sans), system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
  georgia: 'Georgia, "Times New Roman", Times, serif',
  times_new_roman: '"Times New Roman", Times, serif',
  arial: 'Arial, Helvetica, sans-serif',
  trebuchet_ms: '"Trebuchet MS", Helvetica, sans-serif',
} as const;

export type ApprovedFontKey = keyof typeof FONT_REGISTRY;

export const DEFAULT_HEADING_FONT: ApprovedFontKey = "georgia";
export const DEFAULT_BODY_FONT: ApprovedFontKey = "arial";

export function getApprovedFontKey(font: string | null | undefined) {
  if (!font) {
    return null;
  }

  if (font in FONT_REGISTRY) {
    return font as ApprovedFontKey;
  }

  return null;
}

export function getFontStack(
  font: string | null | undefined,
  fallback: ApprovedFontKey,
) {
  const fontKey = getApprovedFontKey(font) ?? fallback;

  return FONT_REGISTRY[fontKey];
}
