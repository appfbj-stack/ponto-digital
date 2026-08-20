/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  transpilePackages: ['@kairos/ui', '@kairos/types', '@kairos/utils', '@kairos/config', '@kairos/face'],
};

module.exports = nextConfig;
