import { db } from '@/lib/db'

export async function rateLimit(key: string, max: number, windowMs: number): Promise<boolean> {
  const now = new Date()

  try {
    const record = await db.rateLimit.findUnique({ where: { key } })

    if (!record || record.resetAt < now) {
      await db.rateLimit.upsert({
        where: { key },
        update: { count: 1, resetAt: new Date(Date.now() + windowMs) },
        create: { key, count: 1, resetAt: new Date(Date.now() + windowMs) },
      })
      return true
    }

    if (record.count >= max) return false

    await db.rateLimit.update({ where: { key }, data: { count: { increment: 1 } } })
    return true
  } catch {
    // If DB is unavailable, fail open (allow the request)
    return true
  }
}

export function getRateLimitKey(req: Request, prefix: string): string {
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0].trim() ?? '127.0.0.1'
  return `${prefix}:${ip}`
}
