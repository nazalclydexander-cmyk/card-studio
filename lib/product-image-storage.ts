import "server-only";

import type { createClient as createServerClient } from "@/lib/supabase/server";
import { getSiteSettings } from "@/lib/site-settings";
import {
  PRODUCT_IMAGES_BUCKET,
  PRODUCT_IMAGE_ALLOWED_MIME_TYPES,
  PRODUCT_IMAGE_MAX_FILE_SIZE_BYTES,
  PRODUCT_IMAGE_ORIGINALS_BUCKET,
  PRODUCT_IMAGE_PREVIEWS_BUCKET,
  buildProductOriginalImagePath,
  buildProductPreviewImagePath,
  createProductImageAssetBaseName,
  getProductImageMimeTypeFromPath,
  getProductImagePublicUrl,
  isValidProductImagePath,
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

export type ProductImageBackfillRow = {
  id: string;
  product_id: string;
  storage_path: string;
  preview_path: string | null;
  original_storage_path?: string | null;
  product_name?: string | null;
  alt_text: string | null;
  sort_order: number;
  is_primary: boolean;
};

export type ProductImageBackfillInspection = {
  imageId: string;
  productId: string;
  productName: string | null;
  legacyStoragePath: string;
  previewPath: string | null;
  originalStoragePath: string | null;
  legacyObjectExists: boolean;
  previewPathExistsInDatabase: boolean;
  previewObjectExists: boolean;
  originalRecordExists: boolean;
  originalObjectExists: boolean;
  migrationNeeded: boolean;
};

export type ProductImageBackfillResult = {
  success: boolean;
  changed: boolean;
  reused: boolean;
  skipped: boolean;
  repaired: Array<"original" | "preview" | "database">;
  originalCreated: boolean;
  originalReused: boolean;
  previewCreated: boolean;
  previewReused: boolean;
  legacyDeleted: boolean;
  message: string;
  inspection: ProductImageBackfillInspection;
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

async function storageObjectExists({
  supabase,
  bucket,
  path,
}: {
  supabase: ProductImageStorageClient;
  bucket: string;
  path: string | null | undefined;
}) {
  const normalizedPath = path?.trim();

  if (!normalizedPath) {
    return false;
  }

  const segments = normalizedPath.split("/");
  const fileName = segments.pop();
  const folder = segments.join("/");

  if (!fileName) {
    return false;
  }

  const { data, error } = await supabase.storage.from(bucket).list(folder, {
    limit: 100,
    search: fileName,
  });

  if (error) {
    console.error("Failed to inspect storage object existence", {
      bucket,
      path: normalizedPath,
      message: error.message,
    });
  } else if ((data ?? []).some((entry) => entry.name === fileName)) {
    return true;
  }

  if (
    bucket === PRODUCT_IMAGES_BUCKET ||
    bucket === PRODUCT_IMAGE_PREVIEWS_BUCKET
  ) {
    const publicUrl = getProductImagePublicUrl(normalizedPath, bucket);

    if (!publicUrl) {
      return false;
    }

    try {
      const response = await fetch(publicUrl, {
        method: "HEAD",
        cache: "no-store",
      });

      if (response.ok) {
        return true;
      }
    } catch {
      // Fall through to GET check.
    }

    try {
      const response = await fetch(publicUrl, {
        method: "GET",
        cache: "no-store",
      });

      return response.ok;
    } catch {
      return false;
    }
  }

  return false;
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
    // Fall through to GET check below.
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
    const { error } = await supabase.storage
      .from(PRODUCT_IMAGES_BUCKET)
      .remove([normalizedStoragePath]);

    if (error) {
      return {
        success: false as const,
        message: error.message,
      };
    }
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

  return {
    success: true,
    originalPath,
    previewPath,
  };
}

export async function inspectProductImageBackfill({
  supabase,
  image,
}: {
  supabase: ProductImageStorageClient;
  image: ProductImageBackfillRow;
}): Promise<ProductImageBackfillInspection> {
  const previewPath = image.preview_path?.trim() || null;
  const originalStoragePath = image.original_storage_path?.trim() || null;
  const legacyStoragePath = image.storage_path.trim();
  const previewPathExistsInDatabase = Boolean(previewPath);
  const originalRecordExists = Boolean(originalStoragePath);

  const [legacyObjectExists, previewObjectExists, originalObjectExists] =
    await Promise.all([
      storageObjectExists({
        supabase,
        bucket: PRODUCT_IMAGES_BUCKET,
        path: legacyStoragePath,
      }),
      storageObjectExists({
        supabase,
        bucket: PRODUCT_IMAGE_PREVIEWS_BUCKET,
        path: previewPath,
      }),
      storageObjectExists({
        supabase,
        bucket: PRODUCT_IMAGE_ORIGINALS_BUCKET,
        path: originalStoragePath,
      }),
    ]);

  return {
    imageId: image.id,
    productId: image.product_id,
    productName: image.product_name ?? null,
    legacyStoragePath,
    previewPath,
    originalStoragePath,
    legacyObjectExists,
    previewPathExistsInDatabase,
    previewObjectExists,
    originalRecordExists,
    originalObjectExists,
    migrationNeeded:
      !previewPathExistsInDatabase ||
      !previewObjectExists ||
      !originalRecordExists ||
      !originalObjectExists,
  };
}

export async function backfillLegacyProductImage({
  supabase,
  image,
}: {
  supabase: ProductImageStorageClient;
  image: ProductImageBackfillRow;
}): Promise<ProductImageBackfillResult> {
  const initialInspection = await inspectProductImageBackfill({
    supabase,
    image,
  });

  if (!initialInspection.migrationNeeded) {
    return {
      success: true,
      changed: false,
      reused: true,
      skipped: true,
      repaired: [],
      originalCreated: false,
      originalReused: true,
      previewCreated: false,
      previewReused: true,
      legacyDeleted: !initialInspection.legacyObjectExists,
      message: "Already protected. No migration needed.",
      inspection: initialInspection,
    };
  }

  if (!isValidProductImagePath(image.storage_path)) {
    return {
      success: false,
      changed: false,
      reused: false,
      skipped: true,
      repaired: [],
      originalCreated: false,
      originalReused: false,
      previewCreated: false,
      previewReused: false,
      legacyDeleted: false,
      message: "Legacy image path is invalid.",
      inspection: initialInspection,
    };
  }

  const legacyMimeType = getProductImageMimeTypeFromPath(image.storage_path);

  if (!legacyMimeType) {
    return {
      success: false,
      changed: false,
      reused: false,
      skipped: true,
      repaired: [],
      originalCreated: false,
      originalReused: false,
      previewCreated: false,
      previewReused: false,
      legacyDeleted: false,
      message: "Legacy image type is unsupported.",
      inspection: initialInspection,
    };
  }

  let sourceBuffer: Buffer | null = null;
  let sourceMimeType = legacyMimeType;
  let originalPathToUse = initialInspection.originalStoragePath;
  let previewPathToUse = initialInspection.previewPath;
  const repaired: Array<"original" | "preview" | "database"> = [];

  if (initialInspection.originalRecordExists && initialInspection.originalObjectExists) {
    const { data: originalBlob, error: originalDownloadError } = await supabase.storage
      .from(PRODUCT_IMAGE_ORIGINALS_BUCKET)
      .download(initialInspection.originalStoragePath!);

    if (!originalDownloadError && originalBlob) {
      sourceBuffer = Buffer.from(await originalBlob.arrayBuffer());
      sourceMimeType =
        getProductImageMimeTypeFromPath(initialInspection.originalStoragePath!) ??
        legacyMimeType;
    }
  }

  if (!sourceBuffer && initialInspection.legacyObjectExists) {
    const { data: sourceBlob, error: sourceError } = await supabase.storage
      .from(PRODUCT_IMAGES_BUCKET)
      .download(image.storage_path);

    if (sourceError || !sourceBlob) {
      console.error("Failed to download legacy product image", {
        imageId: image.id,
        storagePath: image.storage_path,
        message: sourceError?.message ?? "Missing source blob",
      });
    } else {
      sourceBuffer = Buffer.from(await sourceBlob.arrayBuffer());
    }
  }

  if (!sourceBuffer) {
    return {
      success: false,
      changed: false,
      reused: false,
      skipped: false,
      repaired: [],
      originalCreated: false,
      originalReused: initialInspection.originalObjectExists,
      previewCreated: false,
      previewReused: initialInspection.previewObjectExists,
      legacyDeleted: false,
      message:
        "A clean source image was not available for repair. The legacy source or private original is required.",
      inspection: initialInspection,
    };
  }

  const uploadResult = await uploadProtectedProductImageAssets({
    supabase,
    productId: image.product_id,
    sourceBuffer,
    sourceMimeType,
    originalPath: originalPathToUse,
    previewPath: previewPathToUse,
    upsert: true,
  });

  if (!uploadResult.success) {
    return {
      success: false,
      changed: false,
      reused: false,
      skipped: false,
      repaired,
      originalCreated: false,
      originalReused: initialInspection.originalObjectExists,
      previewCreated: false,
      previewReused: initialInspection.previewObjectExists,
      legacyDeleted: false,
      message: uploadResult.message,
      inspection: initialInspection,
    };
  }

  originalPathToUse = uploadResult.originalPath;
  previewPathToUse = uploadResult.previewPath;

  const { error: originalInsertError } = await supabase
    .from("product_image_originals")
    .upsert({
      product_image_id: image.id,
      storage_path: uploadResult.originalPath,
    });

  if (originalInsertError) {
    console.error("Failed to save private original path during backfill", {
      imageId: image.id,
      code: originalInsertError.code,
      message: originalInsertError.message,
      details: originalInsertError.details,
      hint: originalInsertError.hint,
    });

    await removeProductImageAssets({
      supabase,
      originalStoragePath: uploadResult.originalPath,
      previewPath: uploadResult.previewPath,
    });

    return {
      success: false,
      changed: false,
      reused: false,
      skipped: false,
      repaired,
      originalCreated: false,
      originalReused: false,
      previewCreated: false,
      previewReused: false,
      legacyDeleted: false,
      message: "Private original metadata could not be saved.",
      inspection: initialInspection,
    };
  }

  if (
    !initialInspection.originalRecordExists ||
    !initialInspection.originalObjectExists
  ) {
    repaired.push("original");
  }

  const { error: updateError } = await supabase
    .from("product_images")
    .update({
      storage_path: uploadResult.previewPath,
      preview_path: uploadResult.previewPath,
    })
    .eq("id", image.id)
    .eq("product_id", image.product_id);

  if (updateError) {
    console.error("Failed to update backfilled product image row", {
      imageId: image.id,
      message: updateError.message,
      code: updateError.code,
      details: updateError.details,
      hint: updateError.hint,
    });

    await removeProductImageAssets({
      supabase,
      originalStoragePath: uploadResult.originalPath,
      previewPath: uploadResult.previewPath,
    });
    await supabase
      .from("product_image_originals")
      .delete()
      .eq("product_image_id", image.id);

    return {
      success: false,
      changed: false,
      reused: false,
      skipped: false,
      repaired,
      originalCreated: false,
      originalReused: false,
      previewCreated: false,
      previewReused: false,
      legacyDeleted: false,
      message: "Image metadata could not be updated after backfill.",
      inspection: initialInspection,
    };
  }

  if (
    !initialInspection.previewPathExistsInDatabase ||
    !initialInspection.previewObjectExists
  ) {
    repaired.push("preview");
  }

  if (
    initialInspection.previewPath !== previewPathToUse ||
    !initialInspection.previewPathExistsInDatabase
  ) {
    repaired.push("database");
  }

  const previewReachable = await verifyPublicPreviewReachable(previewPathToUse);

  if (!previewReachable) {
    return {
      success: true,
      changed: true,
      reused: false,
      skipped: false,
      repaired,
      originalCreated:
        !initialInspection.originalRecordExists || !initialInspection.originalObjectExists,
      originalReused:
        initialInspection.originalRecordExists && initialInspection.originalObjectExists,
      previewCreated:
        !initialInspection.previewPathExistsInDatabase || !initialInspection.previewObjectExists,
      previewReused:
        initialInspection.previewPathExistsInDatabase && initialInspection.previewObjectExists,
      legacyDeleted: false,
      message:
        "Protected assets were saved, but the public preview could not be verified yet. Legacy cleanup was skipped safely.",
      inspection: await inspectProductImageBackfill({
        supabase,
        image: {
          ...image,
          preview_path: previewPathToUse,
          original_storage_path: originalPathToUse,
        },
      }),
    };
  }

  let legacyDeleted = !initialInspection.legacyObjectExists;

  if (initialInspection.legacyObjectExists) {
    const cleanupResult = await removeProductImageAssets({
      supabase,
      storagePath: image.storage_path,
    });

    if (!cleanupResult.success) {
      console.error("Failed to remove legacy public product image", {
        imageId: image.id,
        storagePath: image.storage_path,
        message: cleanupResult.message,
      });

      return {
        success: true,
        changed: true,
        reused: false,
        skipped: false,
        repaired,
        originalCreated:
          !initialInspection.originalRecordExists || !initialInspection.originalObjectExists,
        originalReused:
          initialInspection.originalRecordExists && initialInspection.originalObjectExists,
        previewCreated:
          !initialInspection.previewPathExistsInDatabase || !initialInspection.previewObjectExists,
        previewReused:
          initialInspection.previewPathExistsInDatabase && initialInspection.previewObjectExists,
        legacyDeleted: false,
        message:
          "Protected migration succeeded, but legacy cleanup failed and needs manual follow-up.",
        inspection: await inspectProductImageBackfill({
          supabase,
          image: {
            ...image,
            preview_path: previewPathToUse,
            original_storage_path: originalPathToUse,
          },
        }),
      };
    }

    legacyDeleted = true;
  }

  return {
    success: true,
    changed: true,
    reused: false,
    skipped: false,
    repaired,
    originalCreated:
      !initialInspection.originalRecordExists || !initialInspection.originalObjectExists,
    originalReused:
      initialInspection.originalRecordExists && initialInspection.originalObjectExists,
    previewCreated:
      !initialInspection.previewPathExistsInDatabase || !initialInspection.previewObjectExists,
    previewReused:
      initialInspection.previewPathExistsInDatabase && initialInspection.previewObjectExists,
    legacyDeleted,
    message: legacyDeleted
      ? "Backfilled successfully."
      : "Backfilled successfully, but legacy cleanup was not needed or not completed.",
    inspection: await inspectProductImageBackfill({
      supabase,
      image: {
        ...image,
        preview_path: previewPathToUse,
        original_storage_path: originalPathToUse,
      },
    }),
  };
}
