import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  skipTrailingSlashRedirect: true,
  // The heating dashboard is served by the camera server; keep it on this domain for tenants.
  async redirects() {
    return [{ source: "/heating", destination: "/heating/", permanent: true }];
  },
  async rewrites() {
    return [
      { source: "/heating/", destination: "https://cameras.andrewmcgrath.info/heating/" },
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
