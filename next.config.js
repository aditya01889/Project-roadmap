/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  async rewrites() {
    return [
      {
        source: '/api/roadmap',
        destination: '/api/roadmap',
      },
    ];
  },
};

module.exports = nextConfig;
