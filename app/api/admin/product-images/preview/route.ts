import { NextResponse } from "next/server";

import { getAdminAccess } from "@/lib/admin";
import {
  PRODUCT_IMAGE_ALLOWED_MIME_TYPES,
  PRODUCT_IMAGE_MAX_FILE_SIZE_BYTES,
  PRODUCT_IMAGE_TEMP_PREVIEW_MAX_LONG_EDGE_PX,
} from "@/lib/product-images";
import {
  createAppearanceWatermarkSampleBuffer,
  createProtectedProductPreview,
} from "@/lib/product-image-protection";
import { getSiteSettings } from "@/lib/site-settings";
import {
  coerceWatermarkSettingsInput,
  pickWatermarkSettings,
  validateWatermarkSettings,
  type WatermarkSettingsInput,
} from "@/lib/watermark-settings";

function isAllowedMimeType(mimeType: string) {
  return PRODUCT_IMAGE_ALLOWED_MIME_TYPES.includes(mimeType as never);
}

function badRequest(message: string) {
  return NextResponse.json({ message }, { status: 400 });
}

export async function POST(request: Request) {
  const access = await getAdminAccess();

  if (!access.userId) {
    return NextResponse.json({ message: "Authentication required." }, { status: 401 });
  }

  if (!access.isAdmin) {
    return NextResponse.json({ message: "Administrator access required." }, { status: 403 });
  }

  const formData = await request.formData();
  const file = formData.get("image");
  const watermarkSettingsJson = formData.get("watermark_settings");

  let watermarkSettings = pickWatermarkSettings(await getSiteSettings());

  if (typeof watermarkSettingsJson === "string" && watermarkSettingsJson.trim()) {
    let parsedPayload: WatermarkSettingsInput | null = null;

    try {
      parsedPayload = JSON.parse(watermarkSettingsJson) as WatermarkSettingsInput;
    } catch {
      return badRequest("Watermark settings preview payload is not valid JSON.");
    }

    const validation = validateWatermarkSettings(
      coerceWatermarkSettingsInput(parsedPayload),
    );

    if (!validation.success) {
      return NextResponse.json(
        {
          message: "Please fix the watermark settings before previewing.",
          fieldErrors: validation.fieldErrors,
        },
        { status: 400 },
      );
    }

    watermarkSettings = validation.data;
  }

  let sourceBuffer = createAppearanceWatermarkSampleBuffer();

  if (file instanceof File && file.size > 0) {
    if (!isAllowedMimeType(file.type)) {
      return badRequest("Use JPG, PNG, or WebP images only.");
    }

    if (file.size > PRODUCT_IMAGE_MAX_FILE_SIZE_BYTES) {
      return badRequest("Each image must be 8 MB or smaller.");
    }

    sourceBuffer = Buffer.from(await file.arrayBuffer());
  } else if (file !== null) {
    return badRequest("Preview image upload is invalid.");
  }

  const preview = await createProtectedProductPreview({
    sourceBuffer,
    watermarkSettings,
    maxLongEdgePx: PRODUCT_IMAGE_TEMP_PREVIEW_MAX_LONG_EDGE_PX,
  });

  return new NextResponse(new Uint8Array(preview.buffer), {
    status: 200,
    headers: {
      "Content-Type": preview.contentType,
      "Cache-Control": "no-store, no-cache, must-revalidate, max-age=0",
      Pragma: "no-cache",
      Expires: "0",
      Vary: "Cookie",
      "X-Watermark-Brightness": preview.watermark.brightness.toFixed(4),
      "X-Watermark-Lower-Quartile":
        preview.watermark.lowerQuartileBrightness.toFixed(4),
      "X-Watermark-Median": preview.watermark.medianBrightness.toFixed(4),
      "X-Watermark-Tone": preview.watermark.tone,
      "X-Watermark-Fill": preview.watermark.fill,
      "X-Watermark-Opacity": preview.watermark.opacity.toFixed(2),
      "X-Watermark-Text": encodeURIComponent(preview.watermark.text),
      "X-Watermark-Font": preview.watermark.font,
      "X-Watermark-Rotation": String(preview.watermark.rotation),
      "X-Watermark-Repeat": preview.watermark.repeat ? "true" : "false",
      "X-Watermark-Enabled": preview.watermark.enabled ? "true" : "false",
    },
  });
}
