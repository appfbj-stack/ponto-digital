/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  transpilePackages: ['@kairos/ui', '@kairos/types', '@kairos/utils', '@kairos/config', '@kairos/face'],
  output: 'standalone',
};

module.exports = nextConfig;
