import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Disable aggressive caching that's causing navigation issues
  experimental: {
    staleTimes: {
      dynamic: 0,
      static: 0,
    },
  },
  
  // Force no caching on all routes
  headers: async () => {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'Cache-Control',
            value: 'no-cache, no-store, must-revalidate',
          },
          {
            key: 'Pragma',
            value: 'no-cache',
          },
          {
            key: 'Expires',
            value: '0',
          },
        ],
      },
    ];
  },
};

export default nextConfig;
