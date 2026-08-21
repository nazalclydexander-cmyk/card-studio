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

type ProductImageStorageQueryRow = {
  id: string;
  product_id: string;
  storage_path: string;
  preview_path: string | null;
  product:
    | {
        name: string | null;
      }
    | {
        name: string | null;
      }[]
    | null;
  original:
    | {
        storage_path: string;
      }
    | {
        storage_path: string;
      }[]
    | null;
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

export type LegacyProductImageCleanupInspection = {
  legacyPath: string;
  productId: string | null;
  productName: string | null;
  previewPath: string | null;
  originalStoragePath: string | null;
  previewExists: boolean;
  originalExists: boolean;
  safeToDelete: boolean;
  blockedReason: string | null;
};

export type LegacyProductImageCleanupDryRunResult = {
  legacyFound: number;
  safeToDelete: number;
  blocked: number;
  objects: LegacyProductImageCleanupInspection[];
};

export type LegacyProductImageCleanupResult = {
  success: boolean;
  processed: number;
  legacyDeleted: number;
  blocked: number;
  failures: Array<{
    legacyPath: string;
    productId: string | null;
    productName: string | null;
    message: string;
  }>;
  objects: LegacyProductImageCleanupInspection[];
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

export async function storageObjectExists({
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

async function listBucketEntries({
  supabase,
  bucket,
  folder,
}: {
  supabase: ProductImageStorageClient;
  bucket: string;
  folder?: string;
}) {
  const entries: Array<{
    name: string;
    id?: string | null;
    metadata?: Record<string, unknown> | null;
  }> = [];
  const pageSize = 100;
  let offset = 0;

  while (true) {
    const { data, error } = await supabase.storage.from(bucket).list(folder ?? "", {
      limit: pageSize,
      offset,
      sortBy: { column: "name", order: "asc" },
    });

    if (error) {
      throw new Error(error.message);
    }

    const batch = (data ?? []).map((entry) => ({
      name: entry.name,
      id: entry.id ?? null,
      metadata:
        typeof entry.metadata === "object" && entry.metadata !== null
          ? (entry.metadata as Record<string, unknown>)
          : null,
    }));

    entries.push(...batch);

    if (batch.length < pageSize) {
      break;
    }

    offset += pageSize;
  }

  return entries;
}

async function listPublicBucketEntriesViaRest({
  bucket,
  folder,
}: {
  bucket: string;
  folder?: string;
}) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.replace(/\/+$/, "");
  const publishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY?.trim();

  if (!supabaseUrl || !publishableKey) {
    return null;
  }

  const entries: Array<{
    name: string;
    id?: string | null;
    metadata?: Record<string, unknown> | null;
  }> = [];
  const pageSize = 100;
  let offset = 0;

  while (true) {
    const response = await fetch(
      `${supabaseUrl}/storage/v1/object/list/${encodeURIComponent(bucket)}`,
      {
        method: "POST",
        headers: {
          apikey: publishableKey,
          Authorization: `Bearer ${publishableKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          prefix: folder ?? "",
          limit: pageSize,
          offset,
          sortBy: { column: "name", order: "asc" },
        }),
        cache: "no-store",
      },
    );

    if (!response.ok) {
      return null;
    }

    const data = (await response.json()) as Array<{
      name: string;
      id?: string | null;
      metadata?: Record<string, unknown> | null;
    }>;
    const batch = (data ?? []).map((entry) => ({
      name: entry.name,
      id: entry.id ?? null,
      metadata:
        typeof entry.metadata === "object" && entry.metadata !== null
          ? entry.metadata
          : null,
    }));

    entries.push(...batch);

    if (batch.length < pageSize) {
      break;
    }

    offset += pageSize;
  }

  return entries;
}

async function listBucketEntriesViaStorageRest({
  supabase,
  bucket,
  folder,
}: {
  supabase: ProductImageStorageClient;
  bucket: string;
  folder?: string;
}) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.replace(/\/+$/, "");
  const publishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY?.trim();
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!supabaseUrl || !publishableKey || !session?.access_token) {
    throw new Error("An authenticated storage metadata request could not be prepared.");
  }

  const normalizedFolder = folder?.trim();
  const namePrefix = normalizedFolder ? `${normalizedFolder}/%` : "%";

  const url = new URL(`${supabaseUrl}/rest/v1/objects`);
  url.searchParams.set("select", "name,id");
  url.searchParams.set("bucket_id", `eq.${bucket}`);
  url.searchParams.set("name", `like.${namePrefix}`);
  url.searchParams.set("order", "name.asc");

  const response = await fetch(url.toString(), {
    method: "GET",
    headers: {
      apikey: publishableKey,
      Authorization: `Bearer ${session.access_token}`,
      "Accept-Profile": "storage",
    },
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error(`Storage metadata request failed with status ${response.status}.`);
  }

  const data = (await response.json()) as Array<{
    name: string;
    id: string;
  }>;

  return (data ?? []).map((entry) => ({
    name: normalizedFolder ? entry.name.replace(`${normalizedFolder}/`, "") : entry.name,
    id: entry.id,
    metadata: null,
  }));
}

function getLegacyProductIdFromPath(path: string) {
  const match = path.match(
    /^products\/([0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12})\/[^/]+$/i,
  );

  return match?.[1] ?? null;
}

async function listLegacyProductImagePaths({
  supabase,
  productIds,
}: {
  supabase: ProductImageStorageClient;
  productIds: string[];
}) {
  const paths: string[] = [];

  for (const productId of productIds) {
    let fileEntries = await listBucketEntries({
      supabase,
      bucket: PRODUCT_IMAGES_BUCKET,
      folder: `products/${productId}`,
    });

    if (fileEntries.length === 0) {
      fileEntries =
        (await listPublicBucketEntriesViaRest({
          bucket: PRODUCT_IMAGES_BUCKET,
          folder: `products/${productId}`,
        })) ?? [];
    }

    if (fileEntries.length === 0) {
      fileEntries = await listBucketEntriesViaStorageRest({
        supabase,
        bucket: PRODUCT_IMAGES_BUCKET,
        folder: `products/${productId}`,
      });
    }

    for (const entry of fileEntries) {
      if (!entry.id) {
        continue;
      }

      paths.push(`products/${productId}/${entry.name}`);
    }
  }

  return paths.sort((left, right) => left.localeCompare(right));
}

async function inspectLegacyProductImageCleanup({
  supabase,
}: {
  supabase: ProductImageStorageClient;
}): Promise<LegacyProductImageCleanupDryRunResult> {
  const { data, error } = await supabase
    .from("product_images")
    .select(
      `
        id,
        product_id,
        storage_path,
        preview_path,
        product:products!product_images_product_id_fkey (
          name
        ),
        original:product_image_originals (
          storage_path
        )
      `,
    )
    .order("created_at", { ascending: true });

  if (error) {
    throw new Error("Protected product image rows could not be loaded.");
  }

  const protectedRows = ((data ?? []) as ProductImageStorageQueryRow[]).map((row) => ({
    imageId: row.id,
    productId: row.product_id,
    productName: Array.isArray(row.product)
      ? row.product[0]?.name ?? null
      : row.product?.name ?? null,
    previewPath: row.preview_path?.trim() || null,
    originalStoragePath: Array.isArray(row.original)
      ? row.original[0]?.storage_path?.trim() || null
      : row.original?.storage_path?.trim() || null,
    }));

  const productIds = Array.from(
    new Set(protectedRows.map((row) => row.productId).filter(Boolean)),
  );
  const legacyPaths = await listLegacyProductImagePaths({
    supabase,
    productIds,
  });

  const previewExistence = new Map<string, boolean>();
  const originalExistence = new Map<string, boolean>();

  for (const row of protectedRows) {
    if (row.previewPath && !previewExistence.has(row.previewPath)) {
      previewExistence.set(
        row.previewPath,
        await storageObjectExists({
          supabase,
          bucket: PRODUCT_IMAGE_PREVIEWS_BUCKET,
          path: row.previewPath,
        }),
      );
    }

    if (
      row.originalStoragePath &&
      !originalExistence.has(row.originalStoragePath)
    ) {
      originalExistence.set(
        row.originalStoragePath,
        await storageObjectExists({
          supabase,
          bucket: PRODUCT_IMAGE_ORIGINALS_BUCKET,
          path: row.originalStoragePath,
        }),
      );
    }
  }

  const legacyPathsByProduct = new Map<string, string[]>();

  for (const legacyPath of legacyPaths) {
    const productId = getLegacyProductIdFromPath(legacyPath);

    if (!productId) {
      continue;
    }

    const existing = legacyPathsByProduct.get(productId) ?? [];
    existing.push(legacyPath);
    legacyPathsByProduct.set(productId, existing);
  }

  const protectedRowsByProduct = new Map<
    string,
    Array<{
      imageId: string;
      productId: string;
      productName: string | null;
      previewPath: string | null;
      originalStoragePath: string | null;
    }>
  >();

  for (const row of protectedRows) {
    const existing = protectedRowsByProduct.get(row.productId) ?? [];
    existing.push(row);
    protectedRowsByProduct.set(row.productId, existing);
  }

  const objects: LegacyProductImageCleanupInspection[] = [];

  for (const legacyPath of legacyPaths) {
    const productId = getLegacyProductIdFromPath(legacyPath);

    if (!productId) {
      objects.push({
        legacyPath,
        productId: null,
        productName: null,
        previewPath: null,
        originalStoragePath: null,
        previewExists: false,
        originalExists: false,
        safeToDelete: false,
        blockedReason: "Legacy path does not match the expected products/<uuid>/<file> structure.",
      });
      continue;
    }

    const productRows = protectedRowsByProduct.get(productId) ?? [];
    const productName = productRows[0]?.productName ?? null;
    const legacyPathsForProduct = legacyPathsByProduct.get(productId) ?? [];
    const protectedRowsCount = productRows.length;

    if (protectedRowsCount === 0) {
      objects.push({
        legacyPath,
        productId,
        productName,
        previewPath: null,
        originalStoragePath: null,
        previewExists: false,
        originalExists: false,
        safeToDelete: false,
        blockedReason:
          "No product_images rows were found for this product UUID, so cleanup cannot be proven safe.",
      });
      continue;
    }

    if (legacyPathsForProduct.length !== protectedRowsCount) {
      objects.push({
        legacyPath,
        productId,
        productName,
        previewPath: null,
        originalStoragePath: null,
        previewExists: false,
        originalExists: false,
        safeToDelete: false,
        blockedReason:
          "Legacy object count for this product does not match its protected image row count, so one-to-one cleanup cannot be proven safely.",
      });
      continue;
    }

    const unprotectedRow = productRows.find((row) => {
      const previewExists = row.previewPath
        ? (previewExistence.get(row.previewPath) ?? false)
        : false;
      const originalExists = row.originalStoragePath
        ? (originalExistence.get(row.originalStoragePath) ?? false)
        : false;

      return !row.previewPath || !row.originalStoragePath || !previewExists || !originalExists;
    });

    if (unprotectedRow) {
      const previewExists = unprotectedRow.previewPath
        ? (previewExistence.get(unprotectedRow.previewPath) ?? false)
        : false;
      const originalExists = unprotectedRow.originalStoragePath
        ? (originalExistence.get(unprotectedRow.originalStoragePath) ?? false)
        : false;

      objects.push({
        legacyPath,
        productId,
        productName,
        previewPath: unprotectedRow.previewPath,
        originalStoragePath: unprotectedRow.originalStoragePath,
        previewExists,
        originalExists,
        safeToDelete: false,
        blockedReason:
          "At least one image for this product is not fully protected yet, so legacy cleanup is blocked.",
      });
      continue;
    }

    const representativeRow = productRows[0];

    objects.push({
      legacyPath,
      productId,
      productName,
      previewPath: representativeRow.previewPath,
      originalStoragePath: representativeRow.originalStoragePath,
      previewExists: representativeRow.previewPath
        ? (previewExistence.get(representativeRow.previewPath) ?? false)
        : false,
      originalExists: representativeRow.originalStoragePath
        ? (originalExistence.get(representativeRow.originalStoragePath) ?? false)
        : false,
      safeToDelete: true,
      blockedReason: null,
    });
  }

  return {
    legacyFound: objects.length,
    safeToDelete: objects.filter((object) => object.safeToDelete).length,
    blocked: objects.filter((object) => !object.safeToDelete).length,
    objects,
  };
}

export async function cleanupLegacyProductImages({
  supabase,
}: {
  supabase: ProductImageStorageClient;
}): Promise<LegacyProductImageCleanupResult> {
  const inspection = await inspectLegacyProductImageCleanup({ supabase });
  const safeObjects = inspection.objects.filter((object) => object.safeToDelete);
  const failures: LegacyProductImageCleanupResult["failures"] = [];
  const deletedPaths = new Set<string>();
  const batchSize = 25;

  for (let index = 0; index < safeObjects.length; index += batchSize) {
    const batch = safeObjects.slice(index, index + batchSize);
    const paths = batch.map((object) => object.legacyPath);
    const { error } = await supabase.storage
      .from(PRODUCT_IMAGES_BUCKET)
      .remove(paths);

    if (error) {
      for (const object of batch) {
        failures.push({
          legacyPath: object.legacyPath,
          productId: object.productId,
          productName: object.productName,
          message: error.message,
        });
      }

      continue;
    }

    for (const object of batch) {
      const stillExists = await storageObjectExists({
        supabase,
        bucket: PRODUCT_IMAGES_BUCKET,
        path: object.legacyPath,
      });

      if (stillExists) {
        failures.push({
          legacyPath: object.legacyPath,
          productId: object.productId,
          productName: object.productName,
          message: "Legacy object still exists after removal and was not counted as deleted.",
        });
        continue;
      }

      deletedPaths.add(object.legacyPath);
    }
  }

  return {
    success: failures.length === 0,
    processed: inspection.legacyFound,
    legacyDeleted: deletedPaths.size,
    blocked: inspection.blocked,
    failures,
    objects: inspection.objects,
  };
}

export async function dryRunLegacyProductImageCleanup({
  supabase,
}: {
  supabase: ProductImageStorageClient;
}) {
  return inspectLegacyProductImageCleanup({ supabase });
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
