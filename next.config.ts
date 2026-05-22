import type { NextConfig } from 'next';

const isProd = process.env.NODE_ENV === 'production';
const basePath = process.env.NEXT_PUBLIC_BASE_PATH || '';

const nextConfig: NextConfig = {
  output: 'export',
  trailingSlash: true,
  images: {
    unoptimized: true,
  },
  basePath: isProd ? basePath : '',
  assetPrefix: isProd ? basePath : '',
  typescript: {
    ignoreBuildErrors: true,
  },
};

export default nextConfig;
