import sharp from "sharp";

import {
  PRODUCT_IMAGE_PREVIEW_MAX_LONG_EDGE_PX,
  PRODUCT_IMAGE_PREVIEW_QUALITY,
} from "./product-images.ts";
import {
  assertServerWatermarkFontExists,
  getServerWatermarkFont,
} from "./server-watermark-fonts.ts";
import {
  DEFAULT_WATERMARK_SETTINGS,
  type WatermarkSettings,
} from "./watermark-settings.ts";

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

type SafeImageMetadata = {
  format: string | undefined;
  space: string | undefined;
  channels: number | undefined;
  depth: string | undefined;
  hasAlpha: boolean;
  width: number | undefined;
  height: number | undefined;
};

type RenderedTextLayer = {
  buffer: Buffer;
  width: number;
  height: number;
};

type ClippedCompositeInput = {
  input: Buffer;
  left: number;
  top: number;
};

type SampleTextLayer = {
  text: string;
  fontKey: string;
  top: number;
  maxWidth: number;
  fontSizePx: number;
  colorHex: string;
  opacity?: number;
};

function escapeXmlText(value: string) {
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

function normalizeMetadataSpace(space: string | undefined) {
  return space?.toLowerCase() ?? undefined;
}

function getSafeImageMetadata(
  metadata: Awaited<ReturnType<typeof sharp.prototype.metadata>>,
): SafeImageMetadata {
  return {
    format: metadata.format,
    space: metadata.space,
    channels: metadata.channels,
    depth: metadata.depth,
    hasAlpha: metadata.hasAlpha ?? false,
    width: metadata.width,
    height: metadata.height,
  };
}

function applyOptionalSrgbConversion(
  image: sharp.Sharp,
  metadata: SafeImageMetadata,
) {
  return normalizeMetadataSpace(metadata.space) &&
    normalizeMetadataSpace(metadata.space) !== "srgb"
    ? image.toColourspace("srgb")
    : image;
}

function createTransparentCanvas(width: number, height: number) {
  return sharp({
    create: {
      width,
      height,
      channels: 4,
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    },
  });
}

async function fitRenderedLayerWithinBounds(
  layer: RenderedTextLayer,
  maxWidth: number,
  maxHeight: number,
): Promise<RenderedTextLayer> {
  if (layer.width <= maxWidth && layer.height <= maxHeight) {
    return layer;
  }

  const resized = await sharp(layer.buffer)
    .resize({
      width: maxWidth,
      height: maxHeight,
      fit: "inside",
      withoutEnlargement: false,
    })
    .png()
    .toBuffer({ resolveWithObject: true });

  return {
    buffer: resized.data,
    width: resized.info.width,
    height: resized.info.height,
  };
}

async function createClippedCompositeInput({
  baseWidth,
  baseHeight,
  overlay,
  left,
  top,
}: {
  baseWidth: number;
  baseHeight: number;
  overlay: RenderedTextLayer;
  left: number;
  top: number;
}): Promise<ClippedCompositeInput | null> {
  const destinationLeft = Math.max(0, left);
  const destinationTop = Math.max(0, top);
  const sourceLeft = Math.max(0, -left);
  const sourceTop = Math.max(0, -top);
  const cropWidth = Math.min(
    overlay.width - sourceLeft,
    baseWidth - destinationLeft,
  );
  const cropHeight = Math.min(
    overlay.height - sourceTop,
    baseHeight - destinationTop,
  );

  if (cropWidth <= 0 || cropHeight <= 0) {
    return null;
  }

  const input =
    sourceLeft === 0 &&
    sourceTop === 0 &&
    cropWidth === overlay.width &&
    cropHeight === overlay.height
      ? overlay.buffer
      : await sharp(overlay.buffer)
          .extract({
            left: sourceLeft,
            top: sourceTop,
            width: cropWidth,
            height: cropHeight,
          })
          .png()
          .toBuffer();

  return {
    input,
    left: destinationLeft,
    top: destinationTop,
  };
}

async function analyzePreviewBrightness(previewBuffer: Buffer) {
  const previewImage = sharp(previewBuffer);
  const previewMetadata = getSafeImageMetadata(await previewImage.metadata());
  const normalizedPreview = applyOptionalSrgbConversion(
    sharp(previewBuffer),
    previewMetadata,
  );

  const stats = await normalizedPreview.clone().stats();
  const [red = { mean: 255 }, green = { mean: 255 }, blue = { mean: 255 }] =
    stats.channels;
  const brightness =
    (0.2126 * red.mean + 0.7152 * green.mean + 0.0722 * blue.mean) / 255;

  let luminanceSource = normalizedPreview.clone();

  if (previewMetadata.hasAlpha) {
    luminanceSource = luminanceSource.removeAlpha();
  }

  const { data, info } = await luminanceSource
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

function estimateWatermarkFontSize({
  width,
  height,
  text,
  fontScale,
}: {
  width: number;
  height: number;
  text: string;
  fontScale: number;
}) {
  const letterSpacing = Math.max(
    3,
    Math.min(5, Math.round(Math.min(width, height) * 0.0034)),
  );
  const textWidthTarget =
    Math.max(110, Math.min(180, Math.round(Math.min(width, height) * 0.15))) *
    fontScale;
  const estimatedCharacterWidth = 0.62;
  const estimatedTextLength = Math.max(text.length, 1);
  const estimatedLetterSpacingWidth =
    Math.max(estimatedTextLength - 1, 0) * letterSpacing;
  const computedFontSize = Math.round(
    (textWidthTarget - estimatedLetterSpacingWidth) /
      (estimatedTextLength * estimatedCharacterWidth),
  );

  return Math.max(
    20,
    Math.min(72, Number.isFinite(computedFontSize) ? computedFontSize : 32),
  );
}

function buildPangoMarkup({
  text,
  colorHex,
  opacity,
}: {
  text: string;
  colorHex: string;
  opacity: number;
}) {
  const alphaPercent = Math.max(0, Math.min(100, Math.round(opacity * 100)));

  return `<span foreground="${colorHex}" alpha="${alphaPercent}%">${escapeXmlText(text)}</span>`;
}

async function renderTextLayer({
  text,
  fontKey,
  fontSizePx,
  colorHex,
  opacity = 1,
  maxWidth,
}: {
  text: string;
  fontKey: string;
  fontSizePx: number;
  colorHex: string;
  opacity?: number;
  maxWidth?: number;
}): Promise<RenderedTextLayer> {
  const font = assertServerWatermarkFontExists(fontKey);
  const rendered = await sharp({
    text: {
      text: buildPangoMarkup({ text, colorHex, opacity }),
      font: font.family,
      fontfile: font.filePath,
      width: maxWidth,
      dpi: 144,
      rgba: true,
      align: "center",
    },
  })
    .png()
    .toBuffer({ resolveWithObject: true });

  const baseHeight = Math.max(1, rendered.info.height);
  const scaledWidth = Math.max(
    1,
    Math.round((rendered.info.width / baseHeight) * fontSizePx),
  );
  const scaledHeight = Math.max(1, Math.round(fontSizePx));
  const scaled = await sharp(rendered.data)
    .resize({
      width: scaledWidth,
      height: scaledHeight,
      fit: "fill",
      withoutEnlargement: false,
    })
    .png()
    .toBuffer({ resolveWithObject: true });

  const constrained = maxWidth && scaled.info.width > maxWidth
    ? await sharp(scaled.data)
        .resize({
          width: maxWidth,
          fit: "inside",
          withoutEnlargement: false,
        })
        .png()
        .toBuffer({ resolveWithObject: true })
    : scaled;

  return {
    buffer: constrained.data,
    width: constrained.info.width,
    height: constrained.info.height,
  };
}

async function createRotatedTextBuffer({
  text,
  fontKey,
  fontSizePx,
  colorHex,
  opacity,
  rotation,
}: {
  text: string;
  fontKey: string;
  fontSizePx: number;
  colorHex: string;
  opacity: number;
  rotation: number;
}) {
  const baseTextLayer = await renderTextLayer({
    text,
    fontKey,
    fontSizePx,
    colorHex,
    opacity,
  });

  const rotated = await sharp(baseTextLayer.buffer)
    .rotate(rotation, {
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    })
    .png()
    .toBuffer({ resolveWithObject: true });

  return {
    buffer: rotated.data,
    width: rotated.info.width,
    height: rotated.info.height,
  };
}

async function createWatermarkOverlay({
  width,
  height,
  settings,
  colorHex,
}: {
  width: number;
  height: number;
  settings: WatermarkSettings;
  colorHex: string;
}) {
  const fontSize = estimateWatermarkFontSize({
    width,
    height,
    text: settings.watermark_text,
    fontScale: settings.watermark_font_scale,
  });
  const textWidthTarget =
    Math.max(110, Math.min(180, Math.round(Math.min(width, height) * 0.15))) *
    settings.watermark_font_scale;
  const baseXStep = Math.max(190, Math.round(textWidthTarget * 1.75));
  const baseYStep = Math.max(130, Math.round(fontSize * 3.8));
  const xStep = Math.max(
    120,
    Math.round(baseXStep * (settings.watermark_spacing_x / 100)),
  );
  const yStep = Math.max(
    100,
    Math.round(baseYStep * (settings.watermark_spacing_y / 100)),
  );

  const rotatedText = await createRotatedTextBuffer({
    text: settings.watermark_text,
    fontKey: settings.watermark_font,
    fontSizePx: fontSize,
    colorHex,
    opacity: settings.watermark_opacity,
    rotation: settings.watermark_rotation,
  });
  const boundedText = await fitRenderedLayerWithinBounds(
    rotatedText,
    width,
    height,
  );

  if (!settings.watermark_repeat) {
    const centeredOverlay = await createClippedCompositeInput({
      baseWidth: width,
      baseHeight: height,
      overlay: boundedText,
      left: Math.floor((width - boundedText.width) / 2),
      top: Math.floor((height - boundedText.height) / 2),
    });

    return createTransparentCanvas(width, height)
      .composite(centeredOverlay ? [centeredOverlay] : [])
      .png()
      .toBuffer();
  }

  const composites: ClippedCompositeInput[] = [];
  const xStart = -Math.round(xStep / 2);
  const yStart = -Math.round(yStep / 2);
  const xEnd = width + Math.round(xStep / 2);
  const yEnd = height + Math.round(yStep / 2);

  for (let centerY = yStart; centerY <= yEnd; centerY += yStep) {
    for (let centerX = xStart; centerX <= xEnd; centerX += xStep) {
      const clippedOverlay = await createClippedCompositeInput({
        baseWidth: width,
        baseHeight: height,
        overlay: boundedText,
        left: Math.floor(centerX - boundedText.width / 2),
        top: Math.floor(centerY - boundedText.height / 2),
      });

      if (clippedOverlay) {
        composites.push(clippedOverlay);
      }
    }
  }

  return createTransparentCanvas(width, height)
    .composite(composites)
    .png()
    .toBuffer();
}

function createAppearanceSampleBaseSvg() {
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

async function createAppearanceSampleTextOverlay() {
  const canvasWidth = 900;
  const canvasHeight = 1260;
  const layers: SampleTextLayer[] = [
    {
      text: "CARD STUDIO",
      fontKey: "inter",
      top: 186,
      maxWidth: 520,
      fontSizePx: 26,
      colorHex: "#A27B74",
    },
    {
      text: "AMELIA",
      fontKey: "libre_baskerville",
      top: 308,
      maxWidth: 520,
      fontSizePx: 76,
      colorHex: "#2F2522",
    },
    {
      text: "&",
      fontKey: "libre_baskerville",
      top: 407,
      maxWidth: 80,
      fontSizePx: 36,
      colorHex: "#B76E79",
    },
    {
      text: "NOAH",
      fontKey: "libre_baskerville",
      top: 466,
      maxWidth: 520,
      fontSizePx: 76,
      colorHex: "#2F2522",
    },
    {
      text: "Together with their families",
      fontKey: "inter",
      top: 602,
      maxWidth: 560,
      fontSizePx: 28,
      colorHex: "#6B625C",
    },
    {
      text: "invite you to celebrate their wedding",
      fontKey: "inter",
      top: 650,
      maxWidth: 620,
      fontSizePx: 28,
      colorHex: "#6B625C",
    },
    {
      text: "October 18, 2027",
      fontKey: "libre_baskerville",
      top: 790,
      maxWidth: 420,
      fontSizePx: 40,
      colorHex: "#2F2522",
    },
    {
      text: "Four o'clock in the afternoon",
      fontKey: "inter",
      top: 854,
      maxWidth: 500,
      fontSizePx: 26,
      colorHex: "#6B625C",
    },
    {
      text: "The Garden Pavilion",
      fontKey: "libre_baskerville",
      top: 940,
      maxWidth: 420,
      fontSizePx: 34,
      colorHex: "#2F2522",
    },
    {
      text: "FORMAL ATTIRE REQUESTED",
      fontKey: "inter",
      top: 1102,
      maxWidth: 540,
      fontSizePx: 24,
      colorHex: "#6B625C",
      opacity: 0.95,
    },
  ];

  const composites = await Promise.all(
    layers.map(async (layer) => {
      const textLayer = await renderTextLayer({
        text: layer.text,
        fontKey: layer.fontKey,
        fontSizePx: layer.fontSizePx,
        colorHex: layer.colorHex,
        opacity: layer.opacity ?? 1,
        maxWidth: layer.maxWidth,
      });

      return createClippedCompositeInput({
        baseWidth: canvasWidth,
        baseHeight: canvasHeight,
        overlay: textLayer,
        left: Math.round((canvasWidth - textLayer.width) / 2),
        top: layer.top,
      });
    }),
  );

  return createTransparentCanvas(canvasWidth, canvasHeight)
    .composite(composites.filter((value) => value !== null))
    .png()
    .toBuffer();
}

export async function createAppearanceWatermarkSampleBuffer() {
  const baseBuffer = Buffer.from(createAppearanceSampleBaseSvg());
  const textOverlay = await createAppearanceSampleTextOverlay();

  return sharp(baseBuffer)
    .composite([{ input: textOverlay }])
    .png()
    .toBuffer();
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
  const sourceImage = sharp(sourceBuffer);
  const sourceMetadata = getSafeImageMetadata(await sourceImage.metadata());
  const resizedPipeline = sharp(sourceBuffer)
    .rotate()
    .resize({
      width: maxLongEdgePx,
      height: maxLongEdgePx,
      fit: "inside",
      withoutEnlargement: true,
    });

  const resized = await (
    sourceMetadata.hasAlpha
      ? applyOptionalSrgbConversion(resizedPipeline.ensureAlpha(), sourceMetadata)
      : applyOptionalSrgbConversion(resizedPipeline, sourceMetadata)
  ).toBuffer({ resolveWithObject: true });

  const width = resized.info.width;
  const height = resized.info.height;

  if (!width || !height) {
    throw new Error("Unable to determine preview dimensions.");
  }

  const resizedMetadata = getSafeImageMetadata(
    await sharp(resized.data).metadata(),
  );
  const resizedImage = resizedMetadata.hasAlpha
    ? sharp(resized.data)
    : sharp(resized.data).ensureAlpha();
  const brightnessAnalysis = await analyzePreviewBrightness(resized.data);
  const contrastProfile = getWatermarkContrastProfile(brightnessAnalysis);
  const colorSelection = resolveWatermarkColor(
    watermarkSettings,
    contrastProfile,
  );
  const resolvedWatermarkFont = getServerWatermarkFont(
    watermarkSettings.watermark_font,
  );
  const fill = formatWatermarkFill({
    color: hexToRgb(colorSelection.colorHex),
    opacity: watermarkSettings.watermark_opacity,
  });

  const rendered = watermarkSettings.watermark_enabled
    ? resizedImage.composite([
        {
          input: await createWatermarkOverlay({
            width,
            height,
            settings: watermarkSettings,
            colorHex: colorSelection.colorHex,
          }),
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
      font: resolvedWatermarkFont.key,
      rotation: watermarkSettings.watermark_rotation,
      repeat: watermarkSettings.watermark_repeat,
    },
  };
}
