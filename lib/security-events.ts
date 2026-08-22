import "server-only";

type SecurityEventName =
  | "customer_inquiry_rate_limited"
  | "customer_inquiry_duplicate"
  | "customer_inquiry_honeypot_triggered"
  | "customer_inquiry_turnstile_failed"
  | "customer_inquiry_origin_rejected"
  | "customer_inquiry_ip_unavailable"
  | "admin_origin_rejected";

export function logSecurityEvent(
  event: SecurityEventName,
  metadata: Record<string, string | number | boolean | null | undefined> = {},
) {
  console.warn("[security-event]", {
    event,
    ...metadata,
  });
}
