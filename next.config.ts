import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  transpilePackages: ["@canopy/ui"],
  experimental: {
    externalDir: true,
  },
  serverActions: {
    bodySizeLimit: "25mb",
  },
};

export default nextConfig;
