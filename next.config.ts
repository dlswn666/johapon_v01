import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'images.unsplash.com',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: '*.supabase.co',
        pathname: '/storage/**',
      },
    ],
    // Image format optimization (AVIF priority, WebP fallback)
    formats: ['image/avif', 'image/webp'],
    // Responsive image size optimization
    deviceSizes: [640, 750, 828, 1080, 1200, 1920],
    imageSizes: [16, 32, 48, 64, 96, 128, 256],
  },

  // Bundle optimization - CRITICAL
  experimental: {
    // Optimize imports from barrel files for these packages
    optimizePackageImports: [
      // Radix UI components
      '@radix-ui/react-alert-dialog',
      '@radix-ui/react-checkbox',
      '@radix-ui/react-dialog',
      '@radix-ui/react-select',
      '@radix-ui/react-popover',
      '@radix-ui/react-tabs',
      '@radix-ui/react-tooltip',
      '@radix-ui/react-navigation-menu',
      '@radix-ui/react-collapsible',
      '@radix-ui/react-radio-group',
      '@radix-ui/react-switch',
      '@radix-ui/react-separator',
      '@radix-ui/react-label',
      '@radix-ui/react-slot',

      // Icon library
      'lucide-react',

      // TanStack
      '@tanstack/react-query',

      // Date utilities
      'date-fns',

      // Form libraries
      'react-hook-form',
      '@hookform/resolvers',

      // Zustand
      'zustand',
    ],
  },

  // Enable compression
  compress: true,

  // Production source maps (disable for smaller bundles)
  productionBrowserSourceMaps: false,

  // Strict mode for catching issues
  reactStrictMode: true,

  // Webpack configuration for additional optimization
  webpack: (config, { isServer }) => {
    // Only apply to client-side bundles
    if (!isServer) {
      // Split chunks for better caching
      config.optimization = {
        ...config.optimization,
        splitChunks: {
          chunks: 'all',
          cacheGroups: {
            // Vendor chunk for node_modules
            vendor: {
              test: /[\\/]node_modules[\\/]/,
              name: 'vendors',
              chunks: 'all',
              priority: 10,
            },
            // Separate chunk for heavy libraries
            echarts: {
              test: /[\\/]node_modules[\\/]echarts[\\/]/,
              name: 'echarts',
              chunks: 'all',
              priority: 20,
            },
            tiptap: {
              test: /[\\/]node_modules[\\/]@tiptap[\\/]/,
              name: 'tiptap',
              chunks: 'all',
              priority: 20,
            },
            radix: {
              test: /[\\/]node_modules[\\/]@radix-ui[\\/]/,
              name: 'radix',
              chunks: 'all',
              priority: 15,
            },
          },
        },
      };
    }

    return config;
  },
};

export default nextConfig;
