/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    // Enabling additional features may help with Tailwind compatibility
    optimizeCss: true,
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
  },
};
export default nextConfig;

