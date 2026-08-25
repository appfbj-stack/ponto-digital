/** @type {import('next').NextConfig} */
module.exports = {
  reactStrictMode: true,
  transpilePackages: ['@kairos/ui', '@kairos/types', '@kairos/utils', '@kairos/config'],
  output: 'standalone',
};
