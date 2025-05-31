/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  trailingSlash: true,
  assetPrefix: './', // For static exports
  // Ensure we're using the correct output mode for Vercel
  output: 'standalone',
  // Disable static optimization to ensure we're not exporting static HTML
  output: 'export',
  images: {
    unoptimized: true,
  },
  // Ensure API routes work in production
  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: `${process.env.NODE_ENV === 'production' ? '/api' : 'http://localhost:3000/api'}/:path*`,
      },
    ];
  },
};

module.exports = nextConfig;
