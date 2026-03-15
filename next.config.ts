import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          {
            key: 'Content-Security-Policy',
            value: "default-src 'self' https: data: 'unsafe-inline' 'unsafe-eval'; frame-src 'self' https://player.mediadelivery.net https://iframe.mediadelivery.net; media-src 'self' blob: https://*.mediadelivery.net https://*.bunnycdn.com; img-src 'self' data: blob: https://*.bunnycdn.com;",
          },
          {
            key: 'X-Frame-Options',
            value: 'SAMEORIGIN',
          },
        ],
      },
    ];
  },
};

export default nextConfig;
