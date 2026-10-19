import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  // The heating dashboard is served by the camera server; keep it on this domain for tenants.
  async rewrites() {
    return [
      { source: "/heating", destination: "https://cameras.andrewmcgrath.info/heating" },
      { source: "/heating/:path*", destination: "https://cameras.andrewmcgrath.info/heating/:path*" },
    ];
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
};

export default nextConfig;
