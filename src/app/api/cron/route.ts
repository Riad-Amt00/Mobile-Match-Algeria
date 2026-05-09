import { NextRequest, NextResponse } from 'next/server'
import { runAllScrapers } from '@/lib/scraper'

/**
 * POST /api/cron — External cron trigger for Vercel / hosted environments.
 * Protected by a simple shared secret in query params.
 * Usage: POST /api/cron?secret=YOUR_CRON_SECRET
 *
 * For local dev, the system uses node-cron (src/lib/cron.ts).
 */
export async function POST(req: NextRequest) {
  const secret = req.nextUrl.searchParams.get('secret')
  const expected = process.env.CRON_SECRET || 'mobilematch-cron-2024'

  if (secret !== expected) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const results = await runAllScrapers()
    return NextResponse.json({ success: true, results, timestamp: new Date().toISOString() })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

// GET for health check / monitoring
export async function GET(req: NextRequest) {
  return NextResponse.json({
    status: 'ok',
    service: 'Mobile Match Algeria — Cron',
    info: 'POST with ?secret= to trigger scraping',
  })
}
