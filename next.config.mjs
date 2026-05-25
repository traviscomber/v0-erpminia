/** @type {import('next').NextConfig} */
const nextConfig = {
  typescript: {
    ignoreBuildErrors: true, // TODO: Fix TypeScript errors in alerts/overdue and other files
  },
  images: {
    unoptimized: true,
  },
}

export default nextConfig
