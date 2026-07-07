import type { NextConfig } from "next";

// Security headers live here, not in netlify.toml: Netlify only applies toml
// [[headers]] to static-asset responses — page routes are served by the
// @netlify/plugin-nextjs function, which ignores them. headers() rides the
// function response and gets edge-cached with it.
// script-src uses 'unsafe-inline' (no hash): the App Router injects per-page
// inline RSC flight scripts that can't be hash-pinned, and a hash's presence
// would make browsers ignore 'unsafe-inline'. 'wasm-unsafe-eval' is required
// by sql.js on /learn/sql.
const CSP = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline' 'wasm-unsafe-eval'",
  "style-src 'self' 'unsafe-inline'",
  "font-src 'self' data:",
  "img-src 'self' data: https://d36t8s1mzbufg5.cloudfront.net https://images.credly.com",
  "connect-src 'self' https://www.credly.com",
  "frame-ancestors 'none'",
  "base-uri 'self'",
  "form-action 'self'",
].join('; ');

const nextConfig: NextConfig = {
  experimental: {
    viewTransition: true,
  },
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: 'd36t8s1mzbufg5.cloudfront.net' },
      { protocol: 'https', hostname: 'images.credly.com' },
    ],
  },
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          { key: 'Content-Security-Policy', value: CSP },
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
          { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains; preload' },
        ],
      },
    ];
  },
};

export default nextConfig;
