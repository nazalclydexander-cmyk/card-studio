export const SITE_ASSETS_BUCKET = "site-assets";

export const SITE_LOGO_MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024;

export const SITE_LOGO_ALLOWED_MIME_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
] as const;

const siteLogoExtensions: Record<
  (typeof SITE_LOGO_ALLOWED_MIME_TYPES)[number],
  string
> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};

const siteLogoPathPattern =
  /^branding\/logo\/[a-z0-9-]+\.(jpg|png|webp)$/i;

export function getSiteLogoExtension(mimeType: string) {
  if (mimeType in siteLogoExtensions) {
    return siteLogoExtensions[mimeType as keyof typeof siteLogoExtensions];
  }

  return null;
}

export function createSiteLogoFilename(mimeType: string) {
  const extension = getSiteLogoExtension(mimeType);

  if (!extension) {
    return null;
  }

  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  const uniqueSegment =
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID()
      : Math.random().toString(36).slice(2, 10);

  return `site-logo-${timestamp}-${uniqueSegment}.${extension}`;
}

export function buildSiteLogoPath(filename: string) {
  return `branding/logo/${filename}`;
}

export function isValidSiteLogoPath(storagePath: string) {
  return siteLogoPathPattern.test(storagePath);
}

export function getSiteAssetPublicUrl(storagePath: string | null) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;

  if (!supabaseUrl || !storagePath) {
    return null;
  }

  const normalizedBaseUrl = supabaseUrl.replace(/\/+$/, "");
  const encodedPath = storagePath
    .split("/")
    .map((segment) => encodeURIComponent(segment))
    .join("/");

  return `${normalizedBaseUrl}/storage/v1/object/public/${SITE_ASSETS_BUCKET}/${encodedPath}`;
}
