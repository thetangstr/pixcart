/** @type {import('next').NextConfig} */
const nextConfig = {
  // Removed static export to support API routes and authentication
  images: {
    unoptimized: true,
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'images.unsplash.com',
      },
    ],
  },
  // Firebase hosting configuration
  trailingSlash: true,
  typescript: {
    // Temporarily ignore TypeScript errors during production build
    ignoreBuildErrors: true,
  },
  eslint: {
    // Temporarily ignore ESLint errors during production build
    ignoreDuringBuilds: true,
  },
}

module.exports = nextConfig