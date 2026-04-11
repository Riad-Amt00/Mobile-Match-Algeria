import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { runAllScrapers } from '@/lib/scraper'
import { db } from '@/lib/db'

// This endpoint triggers the full scrape – Admin only
export async function POST(req: NextRequest) {
  const session = await auth()

  if (!session?.user || (session.user as any).role !== 'ADMIN') {
    return NextResponse.json({ error: 'Accès refusé' }, { status: 403 })
  }

  try {
    const results = await runAllScrapers()
    return NextResponse.json({ success: true, results })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

// Get scrape logs – Admin only
export async function GET(req: NextRequest) {
  const session = await auth()

  if (!session?.user || (session.user as any).role !== 'ADMIN') {
    return NextResponse.json({ error: 'Accès refusé' }, { status: 403 })
  }

  const logs = await db.scrapeLog.findMany({
    include: { operator: true },
    orderBy: { startedAt: 'desc' },
    take: 50,
  })

  return NextResponse.json({ logs })
}
