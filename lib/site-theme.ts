import type { CSSProperties } from "react";

import {
  DEFAULT_BODY_FONT,
  DEFAULT_HEADING_FONT,
  getFontStack,
} from "@/lib/font-registry";
import type { SiteSettings } from "@/lib/site-settings-config";

type SiteThemeVariableName =
  | "--site-primary"
  | "--site-secondary"
  | "--site-accent"
  | "--site-background"
  | "--site-surface"
  | "--site-text"
  | "--site-muted"
  | "--site-card-radius"
  | "--site-button-radius"
  | "--site-font-heading"
  | "--site-font-body";

type SiteThemeVariables = CSSProperties &
  Record<SiteThemeVariableName, string>;

export function getSiteThemeVariables(
  settings: SiteSettings,
): SiteThemeVariables {
  return {
    "--site-primary": settings.primary_color,
    "--site-secondary": settings.secondary_color,
    "--site-accent": settings.accent_color,
    "--site-background": settings.background_color,
    "--site-surface": settings.surface_color,
    "--site-text": settings.text_color,
    "--site-muted": settings.muted_text_color,
    "--site-card-radius": settings.card_radius,
    "--site-button-radius": settings.button_radius,
    "--site-font-heading": getFontStack(
      settings.heading_font,
      DEFAULT_HEADING_FONT,
    ),
    "--site-font-body": getFontStack(settings.body_font, DEFAULT_BODY_FONT),
  };
}
