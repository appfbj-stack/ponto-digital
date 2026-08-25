/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  transpilePackages: ['@kairos/ui', '@kairos/types', '@kairos/utils', '@kairos/config'],
  output: 'standalone',
  experimental: {
    typedRoutes: true,
  },
};

module.exports = nextConfig;
