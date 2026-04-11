import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  // @prisma/client, playwright, argon2, node-cron are automatically
  // externalized by Next.js 15+ — no config needed.
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: 'www.djezzy5g.dz' },
      { protocol: 'https', hostname: 'www.ooredoo.dz' },
      { protocol: 'https', hostname: 'mobilis.dz' },
    ],
  },
}

export default nextConfig
