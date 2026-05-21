import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { db } from '@/lib/db'

export const dynamic = 'force-dynamic'

export async function GET() {
  const session = await auth()
  if (!session?.user || (session.user as any).role !== 'ADMIN') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const [
    totalUsers,
    totalActiveOffers,
    unreadNotifications,
    allLogs,
    operators,
  ] = await Promise.all([
    db.user.count(),
    db.offer.count({ where: { isActive: true } }),
    db.notification.count({ where: { isRead: false } }),
    db.scrapeLog.findMany({
      orderBy: { startedAt: 'desc' },
      include: { operator: true },
    }),
    db.operator.findMany({
      include: {
        _count: { select: { offers: { where: { isActive: true } } } },
      },
    }),
  ])

  // Group individual operator logs into scrape sessions. One run produces
  // exactly one log per operator (the 3 are scraped sequentially), so a session
  // ends as soon as an operator would repeat. This is duration-independent — a
  // slow run with retry/backoff still groups correctly — and guarantees a
  // session never contains the same operator twice (no breakdown duplication).
  const sessions: { startedAt: Date; logs: typeof allLogs }[] = []
  for (const log of [...allLogs].reverse()) { // oldest → newest
    const current = sessions[sessions.length - 1]
    if (current && !current.logs.some(l => l.operatorId === log.operatorId)) {
      current.logs.push(log)
    } else {
      sessions.push({ startedAt: log.startedAt, logs: [log] })
    }
  }
  // Sort sessions newest first
  sessions.sort((a, b) => new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime())

  const totalLogs = allLogs.length
  const successLogs = allLogs.filter(l => l.status === 'SUCCESS').length
  const successRate = totalLogs > 0 ? Math.round((successLogs / totalLogs) * 100) : 0

  // Last SUCCESS log per operator
  const lastScrapePerOperator = operators.map(op => {
    const last = allLogs.find(l => l.operatorId === op.id && l.status === 'SUCCESS')
    return {
      name: op.name,
      slug: op.slug,
      offerCount: op._count.offers,
      lastScrapedAt: last?.completedAt ?? null,
      lastOffersFound: last?.offersFound ?? 0,
    }
  })

  return NextResponse.json({
    totalUsers,
    totalActiveOffers,
    unreadNotifications,
    scrapeSessionCount: sessions.length,
    successRate,
    lastScrapePerOperator,
    sessions: sessions.slice(0, 20).map(s => ({
      startedAt: s.startedAt,
      logs: s.logs.map(l => ({
        id: l.id,
        operator: l.operator.name,
        status: l.status,
        offersFound: l.offersFound,
        offersAdded: l.offersAdded,
        offersUpdated: l.offersUpdated,
        offersDeactivated: l.offersDeactivated,
        duration: l.duration,
        startedAt: l.startedAt,
        errorMessage: l.errorMessage,
        details: l.details ?? null,
      })),
    })),
  })
}
