import fs from "node:fs";
import path from "node:path";

import {
  DEFAULT_WATERMARK_SETTINGS,
  getApprovedWatermarkFontKey,
  WATERMARK_FONT_REGISTRY,
  type WatermarkFontKey,
} from "./watermark-settings.ts";

export type ServerWatermarkFont = {
  key: WatermarkFontKey;
  label: string;
  family: string;
  filePath: string;
  browserStack: string;
};

const FONT_ASSET_ROOT = path.join(process.cwd(), "assets", "fonts");

const SERVER_WATERMARK_FONT_REGISTRY: Record<WatermarkFontKey, ServerWatermarkFont> = {
  inter: {
    key: "inter",
    label: WATERMARK_FONT_REGISTRY.inter.label,
    family: "Inter",
    filePath: path.join(FONT_ASSET_ROOT, "inter", "Inter-Variable.ttf"),
    browserStack: WATERMARK_FONT_REGISTRY.inter.browserStack,
  },
  libre_baskerville: {
    key: "libre_baskerville",
    label: WATERMARK_FONT_REGISTRY.libre_baskerville.label,
    family: "Libre Baskerville",
    filePath: path.join(
      FONT_ASSET_ROOT,
      "libre-baskerville",
      "LibreBaskerville-Variable.ttf",
    ),
    browserStack: WATERMARK_FONT_REGISTRY.libre_baskerville.browserStack,
  },
};

export function getServerWatermarkFont(
  input: string | null | undefined,
): ServerWatermarkFont {
  const key =
    getApprovedWatermarkFontKey(input) ??
    DEFAULT_WATERMARK_SETTINGS.watermark_font;

  return SERVER_WATERMARK_FONT_REGISTRY[key];
}

export function assertServerWatermarkFontExists(input: string | null | undefined) {
  const font = getServerWatermarkFont(input);

  if (!fs.existsSync(/* turbopackIgnore: true */ font.filePath)) {
    throw new Error(
      `Required bundled watermark font is missing for "${font.label}".`,
    );
  }

  return font;
}
