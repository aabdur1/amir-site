import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: 'd36t8s1mzbufg5.cloudfront.net' },
      { protocol: 'https', hostname: 'images.credly.com' },
    ],
  },
};

export default nextConfig;
