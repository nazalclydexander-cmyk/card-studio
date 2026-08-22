import "server-only";

import { createHmac } from "node:crypto";
import net from "node:net";

import { getOptionalSiteOrigin } from "@/lib/site-url";

type HeaderBag = Headers;

function normalizeCandidateIp(candidate: string) {
  const trimmedCandidate = candidate.trim();

  if (!trimmedCandidate) {
    return null;
  }

  const withoutPort = trimmedCandidate.startsWith("[")
    ? trimmedCandidate.replace(/^\[([^\]]+)\](?::\d+)?$/, "$1")
    : trimmedCandidate.replace(/:\d+$/, "");
  const normalizedCandidate = withoutPort.startsWith("::ffff:")
    ? withoutPort.slice(7)
    : withoutPort;

  return net.isIP(normalizedCandidate) ? normalizedCandidate : null;
}

export function getTrustedClientIp(
  headers: HeaderBag,
  { allowDevelopmentFallback = false }: { allowDevelopmentFallback?: boolean } = {},
) {
  const headerCandidates = [
    headers.get("x-forwarded-for"),
    headers.get("x-vercel-forwarded-for"),
    headers.get("x-real-ip"),
  ];

  for (const headerValue of headerCandidates) {
    if (!headerValue) {
      continue;
    }

    const parts = headerValue.split(",");

    for (const part of parts) {
      const normalizedIp = normalizeCandidateIp(part);

      if (normalizedIp) {
        return normalizedIp;
      }
    }
  }

  if (allowDevelopmentFallback && process.env.NODE_ENV !== "production") {
    return "127.0.0.1";
  }

  return null;
}

export function createIdentifierHash(value: string, secret: string) {
  return createHmac("sha256", secret).update(value).digest("hex");
}

function getRequestOriginFromHeaders(headers: HeaderBag) {
  const forwardedProtocol = headers.get("x-forwarded-proto");
  const forwardedHost = headers.get("x-forwarded-host");
  const host = forwardedHost || headers.get("host");
  const protocol = forwardedProtocol || (host?.startsWith("localhost") ? "http" : "https");

  if (!host) {
    return null;
  }

  return `${protocol}://${host}`;
}

export function isTrustedMutationOrigin(headers: HeaderBag) {
  const origin = headers.get("origin");

  if (!origin) {
    return false;
  }

  const requestOrigin = getRequestOriginFromHeaders(headers);
  const configuredOrigin = getOptionalSiteOrigin();

  return origin === requestOrigin || origin === configuredOrigin;
}
