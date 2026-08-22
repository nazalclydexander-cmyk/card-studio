import "server-only";

import { getOptionalSiteOrigin } from "@/lib/site-url";
import { isLocalHostname, TURNSTILE_TEST_SITE_KEY } from "@/lib/turnstile";

const TURNSTILE_TEST_SECRET_KEY = "1x0000000000000000000000000000000AA";
const LOCAL_RATE_LIMIT_HASH_SECRET = "card-studio-local-rate-limit-secret";

function readPositiveIntegerEnv(name: string, fallback: number) {
  const rawValue = process.env[name]?.trim();

  if (!rawValue) {
    return fallback;
  }

  const parsedValue = Number(rawValue);

  if (!Number.isInteger(parsedValue) || parsedValue <= 0) {
    return fallback;
  }

  return parsedValue;
}

function readAllowedOriginHosts() {
  const origins = new Set<string>();
  const siteOrigin = getOptionalSiteOrigin();
  const localOrigins = ["http://localhost:3000", "http://127.0.0.1:3000"];

  for (const origin of [siteOrigin, ...localOrigins]) {
    if (!origin) {
      continue;
    }

    try {
      origins.add(new URL(origin).host);
    } catch {
      // Ignore invalid URLs so a bad env value cannot crash config loading.
    }
  }

  return Array.from(origins);
}

export function getInquirySecurityConfig() {
  return {
    maxRequestBodyBytes: readPositiveIntegerEnv(
      "CUSTOMER_INQUIRY_MAX_BODY_BYTES",
      65_536,
    ),
    rateLimit: {
      ipShortWindowSeconds: readPositiveIntegerEnv(
        "CUSTOMER_INQUIRY_IP_WINDOW_SECONDS",
        600,
      ),
      ipShortLimit: readPositiveIntegerEnv(
        "CUSTOMER_INQUIRY_IP_LIMIT",
        3,
      ),
      ipLongWindowSeconds: readPositiveIntegerEnv(
        "CUSTOMER_INQUIRY_IP_DAILY_WINDOW_SECONDS",
        86_400,
      ),
      ipLongLimit: readPositiveIntegerEnv(
        "CUSTOMER_INQUIRY_IP_DAILY_LIMIT",
        10,
      ),
      emailWindowSeconds: readPositiveIntegerEnv(
        "CUSTOMER_INQUIRY_EMAIL_WINDOW_SECONDS",
        3_600,
      ),
      emailLimit: readPositiveIntegerEnv(
        "CUSTOMER_INQUIRY_EMAIL_LIMIT",
        3,
      ),
      duplicateWindowSeconds: readPositiveIntegerEnv(
        "CUSTOMER_INQUIRY_DUPLICATE_WINDOW_SECONDS",
        600,
      ),
    },
    turnstile: getTurnstileConfig(),
    allowedServerActionOrigins: readAllowedOriginHosts(),
  };
}

export function getRateLimitHashSecret(options: { allowLocalFallback?: boolean; hostname?: string | null } = {}) {
  const configuredSecret = process.env.RATE_LIMIT_HASH_SECRET?.trim();

  if (configuredSecret) {
    return configuredSecret;
  }

  if (
    process.env.NODE_ENV !== "production"
    || (options.allowLocalFallback && isLocalHostname(options.hostname ?? null))
  ) {
    return LOCAL_RATE_LIMIT_HASH_SECRET;
  }

  throw new Error(
    "RATE_LIMIT_HASH_SECRET must be configured in production.",
  );
}

export function getTurnstileConfig(
  options: { allowLocalTestKeys?: boolean; hostname?: string | null } = {},
) {
  const configuredSiteKey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY?.trim();
  const configuredSecretKey = process.env.TURNSTILE_SECRET_KEY?.trim();
  const hostname = options.hostname ?? null;

  if (configuredSiteKey && configuredSecretKey) {
    return {
      mode: "configured" as const,
      siteKey: configuredSiteKey,
      secretKey: configuredSecretKey,
      enforceVerification: true,
    };
  }

  if (
    process.env.NODE_ENV !== "production"
    || (options.allowLocalTestKeys && isLocalHostname(hostname))
  ) {
    return {
      mode: "test" as const,
      siteKey: TURNSTILE_TEST_SITE_KEY,
      secretKey: TURNSTILE_TEST_SECRET_KEY,
      enforceVerification: true,
    };
  }

  return {
    mode: "misconfigured" as const,
    siteKey: configuredSiteKey || "",
    secretKey: configuredSecretKey || "",
    enforceVerification: true,
  };
}

export function getPublicTurnstileSiteKey() {
  return getTurnstileConfig().siteKey;
}
