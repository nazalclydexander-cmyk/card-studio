import type { NextConfig } from "next";
import path from "node:path";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
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

const nextConfig: NextConfig = {
  cacheComponents: true,
  turbopack: {
    root: path.resolve(__dirname),
  },
  images: {
    remotePatterns: remotePattern ? [remotePattern] : [],
  },
};

export default nextConfig;
