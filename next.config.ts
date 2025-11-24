import type { NextConfig } from "next";

// Bundle Analyzer - Run with ANALYZE=true npm run build
// Only load if available (it's a devDependency, not installed in production)
let withBundleAnalyzer = (config: NextConfig) => config;
try {
  if (process.env.ANALYZE === 'true') {
    withBundleAnalyzer = require('@next/bundle-analyzer')({
      enabled: true,
    });
  }
} catch (e) {
  // Bundle analyzer not available in production, which is fine
}

const nextConfig: NextConfig = {
  // REMOVED FOR RENDER: output: 'standalone'
  // Standalone mode is only needed for Docker deployments (AWS ECS)
  // Render uses native Node.js environment, so we don't need it

  // Skip linting and type checking during builds
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },

  // Externalize server-only packages
  serverExternalPackages: ['pg', 'pg-pool', 'pg-connection-string'],

  // Experimental settings - Enable caching for better performance
  experimental: {
    staleTimes: {
      dynamic: 30, // Cache dynamic pages for 30 seconds
      static: 180, // Cache static pages for 3 minutes
    },
  },

  // Optimize Material UI imports for better tree-shaking
  modularizeImports: {
    '@mui/material': {
      transform: '@mui/material/{{member}}',
    },
    '@mui/icons-material': {
      transform: '@mui/icons-material/{{member}}',
    },
  },

  // Webpack configuration for server-only modules
  webpack: (config, { isServer }) => {
    if (!isServer) {
      // Don't bundle server-only packages in client bundles
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        net: false,
        tls: false,
        dns: false,
        'pg-native': false,
      }
    }
    return config
  },

  // Optimized caching headers for maximum performance
  headers: async () => {
    return [
      // Static assets (JS, CSS, fonts, etc.) - Aggressive caching
      {
        source: '/_next/static/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable',
          },
        ],
      },
      // Images - Cache for 1 year
      {
        source: '/:all*(svg|jpg|jpeg|png|gif|ico|webp)',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, must-revalidate',
          },
        ],
      },
      // API routes - No caching (real-time data)
      {
        source: '/api/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'no-store, no-cache, must-revalidate',
          },
        ],
      },
      // Login page - No caching (security)
      {
        source: '/login',
        headers: [
          {
            key: 'Cache-Control',
            value: 'no-store, no-cache, must-revalidate',
          },
        ],
      },
      // All other pages - Short-term caching (5 minutes)
      {
        source: '/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=300, must-revalidate',
          },
        ],
      },
    ];
  },
};

export default withBundleAnalyzer(nextConfig);
