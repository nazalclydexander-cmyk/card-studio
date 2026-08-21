import "server-only";

import type { createClient as createServerClient } from "@/lib/supabase/server";
import { getSiteSettings } from "@/lib/site-settings";
import {
  PRODUCT_IMAGE_ALLOWED_MIME_TYPES,
  PRODUCT_IMAGE_MAX_FILE_SIZE_BYTES,
  PRODUCT_IMAGE_ORIGINALS_BUCKET,
  PRODUCT_IMAGE_PREVIEWS_BUCKET,
  buildProductOriginalImagePath,
  buildProductPreviewImagePath,
  createProductImageAssetBaseName,
  getProductImagePublicUrl,
} from "@/lib/product-images";
import {
  createProtectedProductPreview,
  getProductPreviewWatermarkText,
} from "@/lib/product-image-protection";

export type ProductImageStorageClient = Awaited<
  ReturnType<typeof createServerClient>
>;

export type ProductImageUploadResult =
  | {
      success: true;
      originalPath: string;
      previewPath: string;
    }
  | {
      success: false;
      message: string;
    };

function isAllowedMimeType(mimeType: string) {
  return PRODUCT_IMAGE_ALLOWED_MIME_TYPES.includes(mimeType as never);
}

export function validateProductImageFile(file: File) {
  if (!isAllowedMimeType(file.type)) {
    return {
      success: false as const,
      message: "Use JPG, PNG, or WebP images only.",
    };
  }

  if (file.size > PRODUCT_IMAGE_MAX_FILE_SIZE_BYTES) {
    return {
      success: false as const,
      message: "Each image must be 8 MB or smaller.",
    };
  }

  return {
    success: true as const,
  };
}

async function uploadStorageObject({
  supabase,
  bucket,
  path,
  body,
  contentType,
  cacheControl,
  upsert = false,
}: {
  supabase: ProductImageStorageClient;
  bucket: string;
  path: string;
  body: ArrayBuffer | Buffer;
  contentType: string;
  cacheControl: string;
  upsert?: boolean;
}) {
  const { error } = await supabase.storage.from(bucket).upload(path, body, {
    upsert,
    contentType,
    cacheControl,
  });

  return error;
}

async function verifyPublicPreviewReachable(previewPath: string | null) {
  const previewUrl = getProductImagePublicUrl(
    previewPath,
    PRODUCT_IMAGE_PREVIEWS_BUCKET,
  );

  if (!previewUrl) {
    return false;
  }

  try {
    const response = await fetch(previewUrl, {
      method: "HEAD",
      cache: "no-store",
    });

    if (response.ok) {
      return true;
    }
  } catch {
    // Fall through to GET.
  }

  try {
    const response = await fetch(previewUrl, {
      method: "GET",
      cache: "no-store",
    });

    return response.ok;
  } catch {
    return false;
  }
}

export async function removeProductImageAssets({
  supabase,
  storagePath,
  previewPath,
  originalStoragePath,
}: {
  supabase: ProductImageStorageClient;
  storagePath?: string | null;
  previewPath?: string | null;
  originalStoragePath?: string | null;
}) {
  const normalizedPreviewPath = previewPath?.trim() || null;
  const normalizedOriginalPath = originalStoragePath?.trim() || null;
  const normalizedStoragePath = storagePath?.trim() || null;

  if (normalizedOriginalPath) {
    const { error } = await supabase.storage
      .from(PRODUCT_IMAGE_ORIGINALS_BUCKET)
      .remove([normalizedOriginalPath]);

    if (error) {
      return {
        success: false as const,
        message: error.message,
      };
    }
  }

  if (normalizedPreviewPath) {
    const { error } = await supabase.storage
      .from(PRODUCT_IMAGE_PREVIEWS_BUCKET)
      .remove([normalizedPreviewPath]);

    if (error) {
      return {
        success: false as const,
        message: error.message,
      };
    }
  }

  if (
    normalizedStoragePath &&
    normalizedStoragePath !== normalizedPreviewPath &&
    normalizedStoragePath !== normalizedOriginalPath
  ) {
    return {
      success: false as const,
      message:
        "This image still references retired legacy storage. Restore a protected preview before deleting it.",
    };
  }

  return {
    success: true as const,
  };
}

export async function uploadProtectedProductImageAssets({
  supabase,
  productId,
  sourceBuffer,
  sourceMimeType,
  originalPath: explicitOriginalPath,
  previewPath: explicitPreviewPath,
  upsert = false,
}: {
  supabase: ProductImageStorageClient;
  productId: string;
  sourceBuffer: Buffer;
  sourceMimeType: string;
  originalPath?: string | null;
  previewPath?: string | null;
  upsert?: boolean;
}): Promise<ProductImageUploadResult> {
  const assetBaseName = createProductImageAssetBaseName();
  const originalPath =
    explicitOriginalPath?.trim() ||
    buildProductOriginalImagePath(productId, assetBaseName, sourceMimeType);

  if (!originalPath) {
    return {
      success: false,
      message: "Unsupported source image type.",
    };
  }

  const previewPath =
    explicitPreviewPath?.trim() ||
    buildProductPreviewImagePath(productId, assetBaseName);
  const siteSettings = await getSiteSettings();
  const previewBuffer = await createProtectedProductPreview({
    sourceBuffer,
    watermarkText: getProductPreviewWatermarkText(siteSettings.site_name),
  });

  const originalUploadError = await uploadStorageObject({
    supabase,
    bucket: PRODUCT_IMAGE_ORIGINALS_BUCKET,
    path: originalPath,
    body: sourceBuffer,
    contentType: sourceMimeType,
    cacheControl: "31536000",
    upsert,
  });

  if (originalUploadError) {
    console.error("Failed to upload product original image", {
      bucket: PRODUCT_IMAGE_ORIGINALS_BUCKET,
      path: originalPath,
      message: originalUploadError.message,
    });

    return {
      success: false,
      message: "The original image could not be stored.",
    };
  }

  const previewUploadError = await uploadStorageObject({
    supabase,
    bucket: PRODUCT_IMAGE_PREVIEWS_BUCKET,
    path: previewPath,
    body: previewBuffer.buffer,
    contentType: previewBuffer.contentType,
    cacheControl: "31536000",
    upsert,
  });

  if (previewUploadError) {
    console.error("Failed to upload product preview image", {
      bucket: PRODUCT_IMAGE_PREVIEWS_BUCKET,
      path: previewPath,
      message: previewUploadError.message,
    });

    await removeProductImageAssets({
      supabase,
      originalStoragePath: originalPath,
      previewPath,
    });

    return {
      success: false,
      message: "The protected preview could not be stored.",
    };
  }

  const previewReachable = await verifyPublicPreviewReachable(previewPath);

  if (!previewReachable) {
    await removeProductImageAssets({
      supabase,
      originalStoragePath: originalPath,
      previewPath,
    });

    return {
      success: false,
      message: "The protected preview could not be verified after upload.",
    };
  }

  return {
    success: true,
    originalPath,
    previewPath,
  };
}
