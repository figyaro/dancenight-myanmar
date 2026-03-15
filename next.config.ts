import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          {
            key: 'Content-Security-Policy',
            value: "default-src 'self' https: data: 'unsafe-inline' 'unsafe-eval'; frame-src 'self' https://player.mediadelivery.net https://iframe.mediadelivery.net https://*.bunnyinfra.net https://*.b-cdn.net; media-src 'self' blob: https://*.mediadelivery.net https://*.bunnycdn.com https://*.bunnyinfra.net https://*.bunny.net https://*.b-cdn.net; img-src 'self' data: blob: https://*.bunnycdn.com https://*.bunnyinfra.net https://*.bunny.net https://*.mediadelivery.net https://*.b-cdn.net; connect-src 'self' https://*.bunnyinfra.net https://*.bunny.net https://*.supabase.co;",
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
