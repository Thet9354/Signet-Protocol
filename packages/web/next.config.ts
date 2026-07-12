import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // @aegis/shared ships TypeScript source (internal-package pattern)
  transpilePackages: ["@aegis/shared"],
  // Hide the dev-only overlay badge (cleaner for demos/screenshots).
  devIndicators: false,
};

export default nextConfig;
