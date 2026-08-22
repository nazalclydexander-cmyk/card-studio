import type { NextConfig } from "next";
import path from "node:path";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const siteUrl = process.env.NEXT_PUBLIC_SITE_URL
  || process.env.VERCEL_PROJECT_PRODUCTION_URL
  || process.env.VERCEL_URL;

function normalizeOrigin(url: string | undefined) {
  if (!url) {
    return null;
  }

  const withProtocol = url.startsWith("http") ? url : `https://${url}`;

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

const siteOrigin = normalizeOrigin(siteUrl);
const supabaseOrigin = normalizeOrigin(supabaseUrl);
const remotePattern = supabaseUrl
  ? (() => {
      const url = new URL(supabaseUrl);

      return {
        protocol: url.protocol.replace(":", "") as "http" | "https",
        hostname: url.hostname,
        port: url.port || undefined,
        pathname: "/storage/v1/object/public/**",
      };
    })()
  : null;

function buildContentSecurityPolicyReportOnly() {
  const connectSources = ["'self'"];
  const imageSources = ["'self'", "data:", "blob:"];

  if (supabaseOrigin) {
    connectSources.push(supabaseOrigin);
    imageSources.push(supabaseOrigin);
  }

  connectSources.push("https://challenges.cloudflare.com");

  return [
    "default-src 'self'",
    "base-uri 'self'",
    "object-src 'none'",
    "frame-ancestors 'none'",
    "form-action 'self'",
    "script-src 'self' 'unsafe-inline' https://challenges.cloudflare.com",
    "script-src-elem 'self' https://challenges.cloudflare.com",
    "style-src 'self' 'unsafe-inline'",
    `img-src ${imageSources.join(" ")}`,
    "font-src 'self' data:",
    `connect-src ${connectSources.join(" ")}`,
    "frame-src https://challenges.cloudflare.com",
    "worker-src 'self' blob:",
  ].join("; ");
}

const contentSecurityPolicyReportOnly = buildContentSecurityPolicyReportOnly();
const hstsValue = siteOrigin?.startsWith("https://") && process.env.NODE_ENV === "production"
  ? "max-age=31536000; includeSubDomains; preload"
  : null;

const nextConfig: NextConfig = {
  cacheComponents: true,
  poweredByHeader: false,
  experimental: {
    serverActions: {
      allowedOrigins: [
        "localhost:3000",
        "127.0.0.1:3000",
        ...(siteOrigin ? [new URL(siteOrigin).host] : []),
      ],
      bodySizeLimit: "256kb",
    },
  },
  turbopack: {
    root: path.resolve(__dirname),
  },
  images: {
    remotePatterns: remotePattern ? [remotePattern] : [],
  },
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          {
            key: "Content-Security-Policy-Report-Only",
            value: contentSecurityPolicyReportOnly,
          },
          {
            key: "Permissions-Policy",
            value: "camera=(), geolocation=(), microphone=()",
          },
          {
            key: "Referrer-Policy",
            value: "strict-origin-when-cross-origin",
          },
          {
            key: "X-Content-Type-Options",
            value: "nosniff",
          },
          {
            key: "X-Frame-Options",
            value: "DENY",
          },
          ...(hstsValue
            ? [
                {
                  key: "Strict-Transport-Security",
                  value: hstsValue,
                },
              ]
            : []),
        ],
      },
    ];
  },
};

export default nextConfig;
