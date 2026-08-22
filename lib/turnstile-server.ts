import "server-only";

import { getTurnstileConfig } from "@/lib/security-config";
import { isLocalHostname, TURNSTILE_DUMMY_TOKEN } from "@/lib/turnstile";

type TurnstileVerificationResult =
  | { success: true }
  | { success: false; reason: "missing-token" | "verification-failed" | "misconfigured" };

export async function verifyTurnstileToken({
  token,
  ip,
  hostname,
}: {
  token: string | null;
  ip: string | null;
  hostname: string | null;
}): Promise<TurnstileVerificationResult> {
  if (isLocalHostname(hostname)) {
    if (token === TURNSTILE_DUMMY_TOKEN) {
      return { success: true };
    }

    return { success: false, reason: token ? "verification-failed" : "missing-token" };
  }

  const config = getTurnstileConfig({
    allowLocalTestKeys: true,
    hostname,
  });

  if (!config.siteKey || !config.secretKey) {
    return { success: false, reason: "misconfigured" };
  }

  if (!token) {
    return { success: false, reason: "missing-token" };
  }

  const verificationPayload = new URLSearchParams({
    secret: config.secretKey,
    response: token,
  });

  if (ip) {
    verificationPayload.set("remoteip", ip);
  }

  try {
    const response = await fetch(
      "https://challenges.cloudflare.com/turnstile/v0/siteverify",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: verificationPayload,
        cache: "no-store",
      },
    );

    if (!response.ok) {
      return { success: false, reason: "verification-failed" };
    }

    const data = (await response.json()) as {
      success?: boolean;
    };

    if (!data.success) {
      return { success: false, reason: "verification-failed" };
    }

    return { success: true };
  } catch {
    return { success: false, reason: "verification-failed" };
  }
}
