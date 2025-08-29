import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Enable standalone for Docker/ECS deployment
  output: 'standalone',
  
  // Skip linting and type checking during builds
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  
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
