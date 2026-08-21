import "server-only";

import sharp from "sharp";

import {
  PRODUCT_IMAGE_PREVIEW_MAX_LONG_EDGE_PX,
  PRODUCT_IMAGE_PREVIEW_QUALITY,
} from "@/lib/product-images";

const DEFAULT_WATERMARK_TEXT = "PREVIEW";

function escapeSvgText(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&apos;");
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
}: {
  width: number;
  height: number;
  watermarkText: string;
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
            fill="rgba(79, 67, 60, 0.16)"
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

  const watermarked = await sharp(resized.data)
    .composite([
      {
        input: Buffer.from(
          createWatermarkSvg({
            width,
            height,
            watermarkText,
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
  };
}
