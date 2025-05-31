/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  trailingSlash: true,
  // Set base path for Vercel deployment
  basePath: process.env.NODE_ENV === 'production' ? '' : '',
  // Set asset prefix for static files
  assetPrefix: process.env.NODE_ENV === 'production' ? '' : '',
  images: {
    unoptimized: true,
  },
  // API routes configuration
  async rewrites() {
    if (process.env.NODE_ENV === 'production') {
      return [
        {
          source: '/api/:path*',
          destination: '/api/:path*',
        },
      ];
    }
    // For development, proxy API requests to localhost
    return [
      {
        source: '/api/:path*',
        destination: 'http://localhost:3000/api/:path*',
      },
    ];
  },
  // Ensure static exports work correctly
  experimental: {
    outputFileTracingRoot: process.env.NODE_ENV === 'production' ? __dirname : undefined,
  },
};

module.exports = nextConfig;
