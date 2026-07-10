import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // @aegis/shared ships TypeScript source (internal-package pattern)
  transpilePackages: ["@aegis/shared"],
};

export default nextConfig;
