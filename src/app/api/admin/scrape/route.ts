import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { runAllScrapers } from '@/lib/scraper/index'

export const dynamic = 'force-dynamic'
export const maxDuration = 300

export async function POST() {
  const session = await auth()
  if (!session?.user || (session.user as any).role !== 'ADMIN') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  try {
    const results = await runAllScrapers()
    const totalFound = results.reduce((a, r) => a + r.offersFound, 0)
    const totalAdded = results.reduce((a, r) => a + r.offersAdded, 0)
    const totalUpdated = results.reduce((a, r) => a + r.offersUpdated, 0)
    const totalDeactivated = results.reduce((a, r) => a + r.offersDeactivated, 0)
    const failed = results.filter(r => r.status === 'FAILED')

    return NextResponse.json({
      success: true,
      results,
      totalFound,
      totalAdded,
      totalUpdated,
      totalDeactivated,
      failedCount: failed.length,
    })
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Scrape failed' }, { status: 500 })
  }
}
