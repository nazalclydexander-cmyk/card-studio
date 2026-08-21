const LOCALHOST_HOSTNAMES = new Set(["localhost", "127.0.0.1"]);

function normalizeOrigin(url: string) {
  return new URL(url).origin.toLowerCase();
}

function getProductionCandidates() {
  const envCandidates = [
    process.env.NEXT_PUBLIC_SITE_URL,
    process.env.VERCEL_PROJECT_PRODUCTION_URL
      ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
      : null,
    process.env.PLAYWRIGHT_PRODUCTION_URL,
  ];

  return envCandidates
    .filter((value): value is string => Boolean(value?.trim()))
    .map((value) => {
      try {
        return normalizeOrigin(value);
      } catch {
        return null;
      }
    })
    .filter((value): value is string => Boolean(value));
}

export function getPlaywrightBaseUrl() {
  return process.env.PLAYWRIGHT_BASE_URL?.trim() || "http://localhost:3000";
}

export function shouldStartLocalWebServer(baseUrl: string) {
  return !process.env.PLAYWRIGHT_BASE_URL && isLocalhostUrl(baseUrl);
}

export function isLocalhostUrl(url: string) {
  try {
    const parsed = new URL(url);
    return LOCALHOST_HOSTNAMES.has(parsed.hostname.toLowerCase());
  } catch {
    return false;
  }
}

export function isProductionLikeBaseUrl(url: string) {
  const parsed = new URL(url);
  const hostname = parsed.hostname.toLowerCase();

  if (LOCALHOST_HOSTNAMES.has(hostname)) {
    return false;
  }

  const normalizedBaseOrigin = normalizeOrigin(url);
  const productionCandidates = getProductionCandidates();

  return productionCandidates.includes(normalizedBaseOrigin);
}

export function assertSafePlaywrightBaseUrl(url: string) {
  if (isProductionLikeBaseUrl(url)) {
    throw new Error(
      `Refusing to run Playwright against a production-like base URL: ${url}. Configure PLAYWRIGHT_BASE_URL for localhost or a Vercel preview deployment instead.`,
    );
  }
}

export function getAdminCredentials() {
  const email = process.env.E2E_ADMIN_EMAIL?.trim() || "";
  const password = process.env.E2E_ADMIN_PASSWORD?.trim() || "";

  return {
    email,
    password,
    configured: Boolean(email && password),
  };
}
