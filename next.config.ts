import type { NextConfig } from 'next';
import bundleAnalyzer from '@next/bundle-analyzer';

const withBundleAnalyzer = bundleAnalyzer({
  enabled: process.env.ANALYZE === 'true',
});

const isDevelopment = process.env.NODE_ENV === 'development';
const configuredR2AccountId = process.env.R2_ACCOUNT_ID;
const r2AccountId = configuredR2AccountId
  ? configuredR2AccountId.trim()
  : undefined;
const r2BucketNames = [
  process.env.R2_PUBLIC_BUCKET ?? process.env.R2_BUCKET,
  process.env.R2_PRIVATE_BUCKET ?? process.env.R2_BUCKET,
];
const isR2AccountId = /^[a-f\d]{32}$/i.test(r2AccountId ?? '');
const isBucketName = (value: string) =>
  /^[a-z\d](?:[a-z\d-]{1,61}[a-z\d])$/i.test(value);
const r2ConnectSources = isR2AccountId
  ? [...new Set(r2BucketNames.filter((value): value is string => !!value))]
      .filter((bucket) => isBucketName(bucket))
      .map(
        (bucket) => `https://${bucket}.${r2AccountId}.r2.cloudflarestorage.com`,
      )
  : [];
const connectSources = ["'self'", ...r2ConnectSources].join(' ');
const contentSecurityPolicy = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline'${isDevelopment ? " 'unsafe-eval'" : ''}`,
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob: https:",
  "font-src 'self' data:",
  `connect-src ${connectSources}`,
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
  ...(isDevelopment ? [] : ['upgrade-insecure-requests']),
].join('; ');

const nextConfig: NextConfig = {
  // Optimize images
  images: {
    formats: ['image/avif', 'image/webp'],
    remotePatterns: [
      {
        protocol: 'http',
        hostname: 'localhost',
        port: '8081',
        pathname: '/products/**',
      },
      {
        protocol: 'http',
        hostname: 'localhost',
        port: '3000',
        pathname: '/api/uploads/**',
      },
      {
        protocol: 'https',
        hostname: '**',
      },
    ],
  },

  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'Content-Security-Policy',
            value: contentSecurityPolicy,
          },
          {
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin',
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
        ],
      },
    ];
  },
};

export default withBundleAnalyzer(nextConfig);
