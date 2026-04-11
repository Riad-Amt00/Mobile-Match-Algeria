// prisma.config.ts — Prisma 7 configuration
import 'dotenv/config'
import { defineConfig } from 'prisma/config'

export default defineConfig({
  schema: 'prisma/schema.prisma',
  migrations: {
    path: 'prisma/migrations',
    seed: 'npx tsx prisma/seed.ts',
  },
  datasource: {
    // For Prisma Migrate, provide the url directly
    url: process.env['DATABASE_URL'] ?? 'file:./prisma/dev.db',
  },
})
