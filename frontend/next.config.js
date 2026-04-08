/** @type {import('next').NextConfig} */
const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:8080';

const nextConfig = {
  async rewrites() {
    return [
      {
        // Proxy all /api/* requests to Spring Boot — browser never makes a
        // cross-origin request so no CORS headers are needed.
        source: '/api/:path*',
        destination: `${BACKEND_URL}/api/:path*`,
      },
    ];
  },
};

module.exports = nextConfig;
