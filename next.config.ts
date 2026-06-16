import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  typescript: {
    ignoreBuildErrors: true,
  },
  reactStrictMode: false,
  allowedDevOrigins: ['http://21.0.22.3:81', 'http://21.0.22.3:3000'],
};

export default nextConfig;