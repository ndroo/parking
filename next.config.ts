import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  // The heating dashboard is served by the camera server; keep it on this domain for tenants.
  async redirects() {
    return [{ source: "/heating/legend.html", destination: "/heating/legend", permanent: true }];
  },
  async rewrites() {
    return [
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
