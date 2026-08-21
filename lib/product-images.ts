export const PRODUCT_IMAGE_ORIGINALS_BUCKET = "product-originals";
export const PRODUCT_IMAGE_PREVIEWS_BUCKET = "product-previews";

export const PRODUCT_IMAGE_MAX_FILE_SIZE_BYTES = 8 * 1024 * 1024;
export const PRODUCT_IMAGE_PREVIEW_MAX_FILE_SIZE_BYTES = 4 * 1024 * 1024;
export const PRODUCT_IMAGE_PREVIEW_MAX_LONG_EDGE_PX = 1200;
export const PRODUCT_IMAGE_PREVIEW_FORMAT = "webp";
export const PRODUCT_IMAGE_PREVIEW_QUALITY = 72;

export const PRODUCT_IMAGE_ALLOWED_MIME_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
] as const;

const productImageExtensions: Record<
  (typeof PRODUCT_IMAGE_ALLOWED_MIME_TYPES)[number],
  string
> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};

const productImagePathPattern =
  /^products\/[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}\/[a-z0-9-]+\.(jpg|png|webp)$/i;

export type ProductImageRecord = {
  id: string;
  product_id: string;
  storage_path: string;
  preview_path: string | null;
  alt_text: string | null;
  sort_order: number;
  is_primary: boolean;
  created_at: string;
};

export function getProductImageExtension(mimeType: string) {
  if (mimeType in productImageExtensions) {
    return productImageExtensions[
      mimeType as keyof typeof productImageExtensions
    ];
  }

  return null;
}

export function getProductImageMimeTypeFromPath(storagePath: string) {
  const extension = storagePath.split(".").pop()?.toLowerCase();

  switch (extension) {
    case "jpg":
    case "jpeg":
      return "image/jpeg";
    case "png":
      return "image/png";
    case "webp":
      return "image/webp";
    default:
      return null;
  }
}

export function createProductImageFilename(mimeType: string) {
  const extension = getProductImageExtension(mimeType);

  if (!extension) {
    return null;
  }

  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  const uniqueSegment =
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID()
      : Math.random().toString(36).slice(2, 10);

  return `product-image-${timestamp}-${uniqueSegment}.${extension}`;
}

export function createProductImageAssetBaseName() {
  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  const uniqueSegment =
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID()
      : Math.random().toString(36).slice(2, 10);

  return `product-image-${timestamp}-${uniqueSegment}`;
}

export function buildProductImagePath(productId: string, filename: string) {
  return `products/${productId}/${filename}`;
}

export function buildProductOriginalImagePath(
  productId: string,
  assetBaseName: string,
  mimeType: string,
) {
  const extension = getProductImageExtension(mimeType);

  if (!extension) {
    return null;
  }

  return buildProductImagePath(
    productId,
    `${assetBaseName}-original.${extension}`,
  );
}

export function buildProductPreviewImagePath(
  productId: string,
  assetBaseName: string,
) {
  return buildProductImagePath(
    productId,
    `${assetBaseName}-preview.${PRODUCT_IMAGE_PREVIEW_FORMAT}`,
  );
}

export function isValidProductImagePath(storagePath: string) {
  return productImagePathPattern.test(storagePath);
}

export function getProductImagePublicUrl(
  storagePath: string | null,
  bucket: string,
) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;

  if (!supabaseUrl || !storagePath) {
    return null;
  }

  const normalizedBaseUrl = supabaseUrl.replace(/\/+$/, "");
  const encodedPath = storagePath
    .split("/")
    .map((segment) => encodeURIComponent(segment))
    .join("/");

  return `${normalizedBaseUrl}/storage/v1/object/public/${bucket}/${encodedPath}`;
}

export function getProductPreviewPublicUrl(image: {
  preview_path?: string | null;
}) {
  if (image.preview_path) {
    return getProductImagePublicUrl(
      image.preview_path,
      PRODUCT_IMAGE_PREVIEWS_BUCKET,
    );
  }

  return null;
}
