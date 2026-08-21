import "server-only";

import sharp from "sharp";

import {
  PRODUCT_IMAGE_PREVIEW_MAX_LONG_EDGE_PX,
  PRODUCT_IMAGE_PREVIEW_QUALITY,
} from "@/lib/product-images";

const DEFAULT_WATERMARK_TEXT = "PREVIEW";

type WatermarkContrastProfile = {
  brightness: number;
  lowerQuartileBrightness: number;
  medianBrightness: number;
  color: {
    red: number;
    green: number;
    blue: number;
  };
  opacity: number;
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

function formatWatermarkFill({
  color,
  opacity,
}: Pick<WatermarkContrastProfile, "color" | "opacity">) {
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
      color: {
        red: 248,
        green: 244,
        blue: 238,
      },
      opacity: 0.22,
      tone: "light",
    };
  }

  if (brightness >= 0.72) {
    return {
      brightness,
      lowerQuartileBrightness,
      medianBrightness,
      color: {
        red: 96,
        green: 84,
        blue: 76,
      },
      opacity: 0.2,
      tone: "dark",
    };
  }

  if (brightness >= 0.55) {
    return {
      brightness,
      lowerQuartileBrightness,
      medianBrightness,
      color: {
        red: 89,
        green: 77,
        blue: 70,
      },
      opacity: 0.18,
      tone: "dark",
    };
  }

  return {
    brightness,
    lowerQuartileBrightness,
    medianBrightness,
    color: {
      red: 248,
      green: 244,
      blue: 238,
    },
    opacity: 0.22,
    tone: "light",
  };
}

export function getProductPreviewWatermarkText(siteName?: string | null) {
  const normalizedSiteName = (siteName ?? "")
    .trim()
    .replace(/\s+/g, " ")
    .slice(0, 40);

  if (!normalizedSiteName || normalizedSiteName.length > 8) {
    return DEFAULT_WATERMARK_TEXT;
  }

  return `${normalizedSiteName.toUpperCase()} PREVIEW`;
}

function createWatermarkSvg({
  width,
  height,
  watermarkText,
  fill,
}: {
  width: number;
  height: number;
  watermarkText: string;
  fill: string;
}) {
  const escapedWatermarkText = escapeSvgText(watermarkText);
  const letterSpacing = Math.max(3, Math.min(5, Math.round(Math.min(width, height) * 0.0034)));
  const textWidthTarget = Math.max(
    110,
    Math.min(180, Math.round(Math.min(width, height) * 0.15)),
  );
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
    Math.min(40, Number.isFinite(computedFontSize) ? computedFontSize : 32),
  );
  const xStep = Math.max(190, Math.round(textWidthTarget * 1.75));
  const yStep = Math.max(130, Math.round(fontSize * 3.8));
  const xStart = -Math.round(xStep * 0.75);
  const yStart = -Math.round(yStep * 0.9);
  const xEnd = width + Math.round(xStep * 0.75);
  const yEnd = height + Math.round(yStep * 0.9);
  const watermarkLines: string[] = [];

  for (let y = yStart; y <= yEnd; y += yStep) {
    for (let x = xStart; x <= xEnd; x += xStep) {
      watermarkLines.push(`
        <g transform="translate(${x} ${y}) rotate(-30)">
          <text
            x="0"
            y="0"
            font-family="Arial, Helvetica, sans-serif"
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

export async function createProtectedProductPreview({
  sourceBuffer,
  watermarkText,
}: {
  sourceBuffer: Buffer;
  watermarkText: string;
}) {
  const resized = await sharp(sourceBuffer)
    .rotate()
    .resize({
      width: PRODUCT_IMAGE_PREVIEW_MAX_LONG_EDGE_PX,
      height: PRODUCT_IMAGE_PREVIEW_MAX_LONG_EDGE_PX,
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
  const fill = formatWatermarkFill(contrastProfile);

  const watermarked = await resizedImage
    .composite([
      {
        input: Buffer.from(
          createWatermarkSvg({
            width,
            height,
            watermarkText,
            fill,
          }),
        ),
      },
    ])
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
      opacity: contrastProfile.opacity,
      tone: contrastProfile.tone,
    },
  };
}
