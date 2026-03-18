import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          {
            key: 'Content-Security-Policy',
            value: "default-src 'self' https: data: 'unsafe-inline' 'unsafe-eval'; frame-src 'self' https://player.mediadelivery.net https://iframe.mediadelivery.net https://*.bunnyinfra.net https://*.b-cdn.net https://*.google.com https://*.google.co.jp; media-src 'self' blob: https://*.mediadelivery.net https://*.bunnycdn.com https://*.bunnyinfra.net https://*.bunny.net https://*.b-cdn.net https://*.supabase.co; img-src 'self' data: blob: https://*.bunnycdn.com https://*.bunnyinfra.net https://*.bunny.net https://*.mediadelivery.net https://*.b-cdn.net https://*.supabase.co; connect-src 'self' https://*.mediadelivery.net https://*.bunnyinfra.net https://*.bunny.net https://*.b-cdn.net https://*.supabase.co wss://*.supabase.co;",
          },
          {
            key: 'X-Frame-Options',
            value: 'SAMEORIGIN',
          },
          {
            key: 'Cross-Origin-Opener-Policy',
            value: 'same-origin',
          },
          {
            key: 'Cross-Origin-Embedder-Policy',
            value: 'require-corp',
          },
        ],
      },
    ];
  },
};

export default nextConfig;
