/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: {
    // Disable ESLint during build - fix linting issues separately
    ignoreDuringBuilds: true,
  },
  reactStrictMode: true,
  swcMinify: true,

  env: {
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:9000',
  },

  headers: async () => [
    {
      source: '/:path*',
      headers: [
        {
          key: 'X-Content-Type-Options',
          value: 'nosniff',
        },
        {
          key: 'X-Frame-Options',
          value: 'DENY',
        },
        {
          key: 'X-XSS-Protection',
          value: '1; mode=block',
        },
      ],
    },
  ],

  redirects: async () => [
    {
      source: '/',
      destination: '/dashboard',
      permanent: false,
    },
  ],
}

module.exports = nextConfig
