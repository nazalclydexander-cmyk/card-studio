export const TURNSTILE_RESPONSE_FIELD_NAME = "cf-turnstile-response";
export const TURNSTILE_TEST_SITE_KEY = "1x00000000000000000000AA";
export const TURNSTILE_DUMMY_TOKEN = "XXXX.DUMMY.TOKEN.XXXX";

export function isLocalHostname(hostname: string | null | undefined) {
  return hostname === "localhost" || hostname === "127.0.0.1";
}

export function getClientTurnstileSiteKey() {
  return process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY || "";
}
