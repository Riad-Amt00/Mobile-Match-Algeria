/**
 * Next.js Instrumentation — runs once at server startup.
 * Starts the node-cron daily scraping job automatically when the server
 * boots, so there's no need for a separate process.
 *
 * @see https://nextjs.org/docs/app/guides/instrumentation
 */
export async function register() {
  // Only run on the Node.js server runtime (not edge, not client build)
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    const cron = (await import('node-cron')).default
    const { runAllScrapers } = await import('./lib/scraper')
    const { rebuildOfferFtsIndex } = await import('./lib/search-fts')

    console.log('⏰ [Instrumentation] Cron scheduler registered — daily scrape at 03:00 Africa/Algiers')

    // Rebuild the FTS5 search index from the current Offer table. Cheap
    // (~100 rows) and ensures the index is fresh even if the DB was modified
    // outside the scraper (e.g. seed run, manual edits in Prisma Studio).
    try {
      await rebuildOfferFtsIndex()
      console.log('🔎 [Instrumentation] FTS5 search index rebuilt on boot')
    } catch (err) {
      console.error('❌ [Instrumentation] FTS5 boot rebuild failed:', err)
    }

    // Run every day at 03:00 AM Algeria time (UTC+1)
    cron.schedule('0 3 * * *', async () => {
      console.log(`[${new Date().toISOString()}] 🕐 Daily scrape triggered by cron`)
      try {
        const results = await runAllScrapers()
        results.forEach(r => {
          const deactPart = r.offersDeactivated > 0 ? `, ${r.offersDeactivated} deactivated` : ''
          console.log(`  ${r.operator}: ${r.status} — ${r.offersFound} found, ${r.offersAdded} added, ${r.offersUpdated} updated${deactPart}`)
        })
        console.log('✅ Daily scrape complete')
      } catch (err) {
        console.error('❌ Daily scrape failed:', err)
      }
    }, {
      timezone: 'Africa/Algiers',
    })

    // Weekly cleanup: delete ScrapeLog entries older than 7 days (every Sunday at 04:00)
    cron.schedule('0 4 * * 0', async () => {
      try {
        const { db } = await import('./lib/db')
        const cutoff = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
        const deleted = await db.scrapeLog.deleteMany({ where: { startedAt: { lt: cutoff } } })
        console.log(`🧹 [Instrumentation] Log cleanup: removed ${deleted.count} entries older than 7 days`)
      } catch (err) {
        console.error('❌ Log cleanup failed:', err)
      }
    }, { timezone: 'Africa/Algiers' })

    // Run a scrape on startup if the DB is empty OR the last scrape was more than 23 hours ago
    setTimeout(async () => {
      try {
        const { db } = await import('./lib/db')
        const count = await db.offer.count()
        const lastLog = await db.scrapeLog.findFirst({
          where: { status: 'SUCCESS' },
          orderBy: { completedAt: 'desc' },
        })
        const hoursSinceLast = lastLog?.completedAt
          ? (Date.now() - new Date(lastLog.completedAt).getTime()) / 3_600_000
          : Infinity

        if (count === 0 || hoursSinceLast > 23) {
          console.log(`🔄 [Instrumentation] ${count === 0 ? 'No offers in DB' : `Last scrape was ${Math.round(hoursSinceLast)}h ago`} — running scrape now...`)
          const results = await runAllScrapers()
          results.forEach(r => {
            const deactPart = r.offersDeactivated > 0 ? `, ${r.offersDeactivated} deactivated` : ''
          console.log(`  ${r.operator}: ${r.status} — ${r.offersFound} found, ${r.offersAdded} added, ${r.offersUpdated} updated${deactPart}`)
          })
          console.log('✅ Startup scrape complete')
        } else {
          console.log(`📊 [Instrumentation] Last scrape was ${Math.round(hoursSinceLast)}h ago — skipping startup scrape`)
        }
      } catch (err) {
        console.error('❌ Startup scrape check failed:', err)
      }
    }, 30_000)
  }
}
