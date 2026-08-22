import "server-only";

import sharp from "sharp";

import {
  PRODUCT_IMAGE_PREVIEW_MAX_LONG_EDGE_PX,
  PRODUCT_IMAGE_PREVIEW_QUALITY,
} from "@/lib/product-images";
import {
  DEFAULT_WATERMARK_SETTINGS,
  getWatermarkFontStack,
  type WatermarkSettings,
} from "@/lib/watermark-settings";

type RgbColor = {
  red: number;
  green: number;
  blue: number;
};

type WatermarkContrastProfile = {
  brightness: number;
  lowerQuartileBrightness: number;
  medianBrightness: number;
  tone: "dark" | "light";
};

function escapeSvgText(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&apos;");
}

function clampChannelValue(value: number) {
  return Math.max(0, Math.min(255, Math.round(value)));
}

function hexToRgb(hexColor: string): RgbColor {
  const normalizedValue = hexColor.replace("#", "");

  return {
    red: Number.parseInt(normalizedValue.slice(0, 2), 16),
    green: Number.parseInt(normalizedValue.slice(2, 4), 16),
    blue: Number.parseInt(normalizedValue.slice(4, 6), 16),
  };
}

function formatWatermarkFill({
  color,
  opacity,
}: {
  color: RgbColor;
  opacity: number;
}) {
  return `rgba(${clampChannelValue(color.red)}, ${clampChannelValue(color.green)}, ${clampChannelValue(color.blue)}, ${opacity.toFixed(2)})`;
}

function getPercentileLuminance(values: number[], percentile: number) {
  if (!values.length) {
    return 1;
  }

  const sorted = [...values].sort((left, right) => left - right);
  const index = Math.min(
    sorted.length - 1,
    Math.max(0, Math.round(percentile * (sorted.length - 1))),
  );

  return sorted[index] ?? 1;
}

async function analyzePreviewBrightness(previewBuffer: Buffer) {
  const stats = await sharp(previewBuffer).stats();
  const [red = { mean: 255 }, green = { mean: 255 }, blue = { mean: 255 }] =
    stats.channels;
  const brightness =
    (0.2126 * red.mean + 0.7152 * green.mean + 0.0722 * blue.mean) / 255;

  const { data, info } = await sharp(previewBuffer)
    .removeAlpha()
    .resize({
      width: 64,
      height: 64,
      fit: "inside",
      withoutEnlargement: true,
    })
    .raw()
    .toBuffer({ resolveWithObject: true });

  const luminanceSamples: number[] = [];

  for (let index = 0; index < data.length; index += info.channels) {
    const sampleRed = data[index] ?? 255;
    const sampleGreen = data[index + 1] ?? 255;
    const sampleBlue = data[index + 2] ?? 255;
    luminanceSamples.push(
      (0.2126 * sampleRed + 0.7152 * sampleGreen + 0.0722 * sampleBlue) / 255,
    );
  }

  return {
    brightness,
    lowerQuartileBrightness: getPercentileLuminance(luminanceSamples, 0.25),
    medianBrightness: getPercentileLuminance(luminanceSamples, 0.5),
  };
}

function getWatermarkContrastProfile({
  brightness,
  lowerQuartileBrightness,
  medianBrightness,
}: {
  brightness: number;
  lowerQuartileBrightness: number;
  medianBrightness: number;
}): WatermarkContrastProfile {
  if (lowerQuartileBrightness <= 0.46 || medianBrightness <= 0.58) {
    return {
      brightness,
      lowerQuartileBrightness,
      medianBrightness,
      tone: "light",
    };
  }

  if (brightness >= 0.72) {
    return {
      brightness,
      lowerQuartileBrightness,
      medianBrightness,
      tone: "dark",
    };
  }

  if (brightness >= 0.55) {
    return {
      brightness,
      lowerQuartileBrightness,
      medianBrightness,
      tone: "dark",
    };
  }

  return {
    brightness,
    lowerQuartileBrightness,
    medianBrightness,
    tone: "light",
  };
}

function resolveWatermarkColor(
  settings: WatermarkSettings,
  contrastProfile: WatermarkContrastProfile,
) {
  if (settings.watermark_mode === "manual") {
    return {
      colorHex: settings.watermark_color,
      tone: "manual" as const,
    };
  }

  return {
    colorHex:
      contrastProfile.tone === "light"
        ? settings.watermark_light_color
        : settings.watermark_dark_color,
    tone: contrastProfile.tone,
  };
}

function createWatermarkSvg({
  width,
  height,
  settings,
  fill,
}: {
  width: number;
  height: number;
  settings: WatermarkSettings;
  fill: string;
}) {
  const escapedWatermarkText = escapeSvgText(settings.watermark_text);
  const letterSpacing = Math.max(
    3,
    Math.min(5, Math.round(Math.min(width, height) * 0.0034)),
  );
  const textWidthTarget =
    Math.max(110, Math.min(180, Math.round(Math.min(width, height) * 0.15))) *
    settings.watermark_font_scale;
  const estimatedCharacterWidth = 0.62;
  const estimatedTextLength = Math.max(escapedWatermarkText.length, 1);
  const estimatedLetterSpacingWidth =
    Math.max(estimatedTextLength - 1, 0) * letterSpacing;
  const computedFontSize = Math.round(
    (textWidthTarget - estimatedLetterSpacingWidth) /
      (estimatedTextLength * estimatedCharacterWidth),
  );
  const fontSize = Math.max(
    20,
    Math.min(72, Number.isFinite(computedFontSize) ? computedFontSize : 32),
  );
  const baseXStep = Math.max(190, Math.round(textWidthTarget * 1.75));
  const baseYStep = Math.max(130, Math.round(fontSize * 3.8));
  const xStep = Math.max(120, Math.round(baseXStep * (settings.watermark_spacing_x / 100)));
  const yStep = Math.max(100, Math.round(baseYStep * (settings.watermark_spacing_y / 100)));
  const rotation = settings.watermark_rotation;
  const fontFamily = escapeSvgText(getWatermarkFontStack(settings.watermark_font));

  if (!settings.watermark_repeat) {
    return `
      <svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" xmlns="http://www.w3.org/2000/svg">
        <g transform="translate(${Math.round(width / 2)} ${Math.round(height / 2)}) rotate(${rotation})">
          <text
            x="0"
            y="0"
            font-family="${fontFamily}"
            font-size="${fontSize}"
            font-weight="600"
            letter-spacing="${letterSpacing}"
            fill="${fill}"
            text-anchor="middle"
            dominant-baseline="middle"
          >${escapedWatermarkText}</text>
        </g>
      </svg>
    `;
  }

  const xStart = -Math.round(xStep * 0.75);
  const yStart = -Math.round(yStep * 0.9);
  const xEnd = width + Math.round(xStep * 0.75);
  const yEnd = height + Math.round(yStep * 0.9);
  const watermarkLines: string[] = [];

  for (let y = yStart; y <= yEnd; y += yStep) {
    for (let x = xStart; x <= xEnd; x += xStep) {
      watermarkLines.push(`
        <g transform="translate(${x} ${y}) rotate(${rotation})">
          <text
            x="0"
            y="0"
            font-family="${fontFamily}"
            font-size="${fontSize}"
            font-weight="600"
            letter-spacing="${letterSpacing}"
            fill="${fill}"
            text-anchor="middle"
            dominant-baseline="middle"
          >${escapedWatermarkText}</text>
        </g>
      `);
    }
  }

  return `
    <svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" xmlns="http://www.w3.org/2000/svg">
      ${watermarkLines.join("")}
    </svg>
  `;
}

function createAppearanceSampleSvg() {
  return `
    <svg width="900" height="1260" viewBox="0 0 900 1260" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="paper" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="#FFFDF9" />
          <stop offset="100%" stop-color="#F4EEE6" />
        </linearGradient>
      </defs>
      <rect width="900" height="1260" fill="#EEE6DE" />
      <rect x="84" y="72" width="732" height="1116" rx="28" fill="url(#paper)" />
      <rect x="118" y="106" width="664" height="1048" rx="20" fill="none" stroke="#D6C8BB" stroke-width="2" />
      <text x="450" y="220" text-anchor="middle" fill="#A27B74" font-family="Georgia, 'Times New Roman', serif" font-size="30" letter-spacing="12">CARD STUDIO</text>
      <text x="450" y="360" text-anchor="middle" fill="#2F2522" font-family="Georgia, 'Times New Roman', serif" font-size="76">AMELIA</text>
      <text x="450" y="434" text-anchor="middle" fill="#B76E79" font-family="Georgia, 'Times New Roman', serif" font-size="36">&amp;</text>
      <text x="450" y="520" text-anchor="middle" fill="#2F2522" font-family="Georgia, 'Times New Roman', serif" font-size="76">NOAH</text>
      <text x="450" y="626" text-anchor="middle" fill="#6B625C" font-family="Arial, Helvetica, sans-serif" font-size="28">Together with their families</text>
      <text x="450" y="676" text-anchor="middle" fill="#6B625C" font-family="Arial, Helvetica, sans-serif" font-size="28">invite you to celebrate their wedding</text>
      <text x="450" y="820" text-anchor="middle" fill="#2F2522" font-family="Georgia, 'Times New Roman', serif" font-size="40">October 18, 2027</text>
      <text x="450" y="878" text-anchor="middle" fill="#6B625C" font-family="Arial, Helvetica, sans-serif" font-size="26">Four o'clock in the afternoon</text>
      <text x="450" y="968" text-anchor="middle" fill="#2F2522" font-family="Georgia, 'Times New Roman', serif" font-size="34">The Garden Pavilion</text>
      <g opacity="0.82">
        <circle cx="190" cy="182" r="60" fill="#D8B7B0" />
        <circle cx="238" cy="134" r="34" fill="#E7CFC4" />
        <path d="M180 260 C160 230 144 214 122 198" stroke="#96A483" stroke-width="8" stroke-linecap="round" fill="none" />
        <path d="M720 244 C742 212 758 194 778 176" stroke="#96A483" stroke-width="8" stroke-linecap="round" fill="none" />
        <circle cx="714" cy="160" r="56" fill="#D8B7B0" />
        <circle cx="764" cy="118" r="30" fill="#E7CFC4" />
        <circle cx="194" cy="1048" r="48" fill="#E7CFC4" />
        <circle cx="246" cy="1090" r="34" fill="#D8B7B0" />
        <path d="M690 1040 C724 1010 748 988 770 954" stroke="#96A483" stroke-width="8" stroke-linecap="round" fill="none" />
      </g>
    </svg>
  `;
}

export function createAppearanceWatermarkSampleBuffer() {
  return Buffer.from(createAppearanceSampleSvg());
}

export async function createProtectedProductPreview({
  sourceBuffer,
  watermarkSettings = DEFAULT_WATERMARK_SETTINGS,
  maxLongEdgePx = PRODUCT_IMAGE_PREVIEW_MAX_LONG_EDGE_PX,
}: {
  sourceBuffer: Buffer;
  watermarkSettings?: WatermarkSettings;
  maxLongEdgePx?: number;
}) {
  const resized = await sharp(sourceBuffer)
    .rotate()
    .resize({
      width: maxLongEdgePx,
      height: maxLongEdgePx,
      fit: "inside",
      withoutEnlargement: true,
    })
    .toBuffer({ resolveWithObject: true });

  const width = resized.info.width;
  const height = resized.info.height;

  if (!width || !height) {
    throw new Error("Unable to determine preview dimensions.");
  }

  const resizedImage = sharp(resized.data);
  const brightnessAnalysis = await analyzePreviewBrightness(resized.data);
  const contrastProfile = getWatermarkContrastProfile(brightnessAnalysis);
  const colorSelection = resolveWatermarkColor(
    watermarkSettings,
    contrastProfile,
  );
  const fill = formatWatermarkFill({
    color: hexToRgb(colorSelection.colorHex),
    opacity: watermarkSettings.watermark_opacity,
  });

  const rendered = watermarkSettings.watermark_enabled
    ? resizedImage.composite([
        {
          input: Buffer.from(
            createWatermarkSvg({
              width,
              height,
              settings: watermarkSettings,
              fill,
            }),
          ),
        },
      ])
    : resizedImage;

  const watermarked = await rendered
    .webp({
      quality: PRODUCT_IMAGE_PREVIEW_QUALITY,
      effort: 6,
    })
    .toBuffer({ resolveWithObject: true });

  return {
    buffer: watermarked.data,
    width: watermarked.info.width,
    height: watermarked.info.height,
    size: watermarked.info.size,
    contentType: "image/webp",
    watermark: {
      brightness: contrastProfile.brightness,
      lowerQuartileBrightness: contrastProfile.lowerQuartileBrightness,
      medianBrightness: contrastProfile.medianBrightness,
      fill,
      opacity: watermarkSettings.watermark_opacity,
      tone: colorSelection.tone,
      enabled: watermarkSettings.watermark_enabled,
      text: watermarkSettings.watermark_text,
      font: watermarkSettings.watermark_font,
      rotation: watermarkSettings.watermark_rotation,
      repeat: watermarkSettings.watermark_repeat,
    },
  };
}
