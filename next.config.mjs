/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    // Enabling additional features may help with Tailwind compatibility
    optimizeCss: true,
  },
  webpack: (config) => {
    // Ensure generated files importing '.prisma/client' resolve at build time
    config.resolve = config.resolve || {}
    config.resolve.alias = {
      ...(config.resolve.alias || {}),
      '.prisma/client': '@prisma/client',
    }
    return config
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'firebasestorage.googleapis.com',
        port: '',
        pathname: '/v0/b/theaweshop.appspot.com/**',
      }
    ]
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  // Allow CORS origins for NextAuth and API routes
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          { key: 'Access-Control-Allow-Origin', value: process.env.ALLOWED_ORIGINS || '*' },
          { key: 'Access-Control-Allow-Methods', value: 'GET,POST,PUT,PATCH,DELETE,OPTIONS' },
          { key: 'Access-Control-Allow-Headers', value: 'Origin, X-Requested-With, Content-Type, Accept, Authorization' },
          { key: 'Vary', value: 'Origin' },
        ],
      },
    ];
  },
  env: {
    NEXTAUTH_URL: process.env.NEXTAUTH_URL || 'http://localhost:3000',
    ALLOWED_ORIGINS: process.env.ALLOWED_ORIGINS || '*',
    // Maintenance mode environment variables
    MAINTENANCE_MODE: process.env.MAINTENANCE_MODE || 'false',
    MAINTENANCE_MESSAGE: process.env.MAINTENANCE_MESSAGE,
    MAINTENANCE_END_TIME: process.env.MAINTENANCE_END_TIME,
    MAINTENANCE_ALLOW_ADMIN_BYPASS: process.env.MAINTENANCE_ALLOW_ADMIN_BYPASS || 'true',
  },
};
export default nextConfig;

