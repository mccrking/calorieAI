import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  typescript: {
    ignoreBuildErrors: true,
  },
  reactStrictMode: false,
  allowedDevOrigins: [
    'http://21.0.22.3:81',
    'http://21.0.22.3:3000',
    'http://21.0.13.2:81',
    'http://21.0.13.2:3000',
    'http://127.0.0.1:3000',
    'http://127.0.0.1',
    'http://localhost:3000',
    'https://preview-chat-3b0a247e-c682-48d6-8b60-11852c9ef93d.space-z.ai',
    'http://preview-chat-3b0a247e-c682-48d6-8b60-11852c9ef93d.space-z.ai',
  ],
};

export default nextConfig;