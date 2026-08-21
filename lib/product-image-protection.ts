import "server-only";

import sharp from "sharp";

import {
  PRODUCT_IMAGE_PREVIEW_MAX_LONG_EDGE_PX,
  PRODUCT_IMAGE_PREVIEW_QUALITY,
} from "@/lib/product-images";

const DEFAULT_WATERMARK_TEXT = "SAMPLE DESIGN";

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

  if (!normalizedSiteName) {
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
  const primaryFontSize = Math.max(28, Math.round(Math.min(width, height) * 0.055));
  const secondaryFontSize = Math.max(18, Math.round(primaryFontSize * 0.42));
  const xStep = Math.max(220, Math.round(width * 0.34));
  const yStep = Math.max(160, Math.round(height * 0.25));
  const xStart = -Math.round(width * 0.18);
  const yStart = -Math.round(height * 0.18);
  const xEnd = width + Math.round(width * 0.25);
  const yEnd = height + Math.round(height * 0.25);
  const watermarkLines: string[] = [];

  for (let y = yStart; y <= yEnd; y += yStep) {
    for (let x = xStart; x <= xEnd; x += xStep) {
      watermarkLines.push(`
        <g transform="translate(${x} ${y}) rotate(-28)">
          <text
            x="0"
            y="0"
            font-family="Arial, Helvetica, sans-serif"
            font-size="${primaryFontSize}"
            font-weight="700"
            letter-spacing="3"
            fill="rgba(255,255,255,0.19)"
            stroke="rgba(15,23,42,0.12)"
            stroke-width="0.9"
            paint-order="stroke"
            text-anchor="middle"
          >${escapedWatermarkText}</text>
          <text
            x="0"
            y="${secondaryFontSize + 10}"
            font-family="Arial, Helvetica, sans-serif"
            font-size="${secondaryFontSize}"
            font-weight="600"
            letter-spacing="4"
            fill="rgba(15,23,42,0.1)"
            text-anchor="middle"
          >PREVIEW ONLY</text>
        </g>
      `);
    }
  }

  return `
    <svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" xmlns="http://www.w3.org/2000/svg">
      <rect width="${width}" height="${height}" fill="transparent" />
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
