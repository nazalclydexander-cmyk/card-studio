const LOCALHOST_FALLBACK = "http://localhost:3000";

function normalizeBaseUrl(url: string) {
  const trimmedUrl = url.trim();

  if (!trimmedUrl) {
    return null;
  }

  const withProtocol = trimmedUrl.startsWith("http")
    ? trimmedUrl
    : `https://${trimmedUrl}`;

  try {
    const normalized = new URL(withProtocol);
    normalized.pathname = "/";
    normalized.search = "";
    normalized.hash = "";
    return normalized.toString().replace(/\/$/, "");
  } catch {
    return null;
  }
}

export function getOptionalSiteOrigin() {
  const envCandidates = [
    process.env.NEXT_PUBLIC_SITE_URL,
    process.env.VERCEL_PROJECT_PRODUCTION_URL,
    process.env.VERCEL_URL,
  ];

  for (const candidate of envCandidates) {
    const normalized = candidate ? normalizeBaseUrl(candidate) : null;

    if (normalized) {
      return normalized;
    }
  }

  return null;
}

export function getSiteOrigin() {
  return getOptionalSiteOrigin() ?? LOCALHOST_FALLBACK;
}

export function getClientSiteOrigin() {
  if (typeof window !== "undefined" && window.location.origin) {
    return window.location.origin;
  }

  return getSiteOrigin();
}

export function buildSiteUrl(path = "/") {
  return new URL(path, `${getSiteOrigin()}/`).toString();
}

export function buildClientSiteUrl(path = "/") {
  return new URL(path, `${getClientSiteOrigin()}/`).toString();
}

export function sanitizeNextPath(
  nextPath: string | null | undefined,
  fallback = "/",
) {
  if (!nextPath || !nextPath.startsWith("/") || nextPath.startsWith("//")) {
    return fallback;
  }

  return nextPath;
}
