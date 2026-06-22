import type { NextConfig } from 'next';
import bundleAnalyzer from '@next/bundle-analyzer';

const withBundleAnalyzer = bundleAnalyzer({
  enabled: process.env.ANALYZE === 'true',
});

const nextConfig: NextConfig = {
  // Enable gzip compression for static assets
  compress: true,

  // Optimize images
  images: {
    formats: ['image/avif', 'image/webp'],
  },

  // Enable React strict mode
  reactStrictMode: true,

  // Optimize bundle size
  experimental: {
    optimizePackageImports: ['lucide-react'],
  },
};

export default withBundleAnalyzer(nextConfig);
