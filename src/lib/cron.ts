/**
 * STANDALONE cron runner (optional fallback).
 *
 * Since we now use `src/instrumentation.ts`, the cron job starts
 * automatically with `next dev` / `next start`. This file is only
 * needed if you want to run the scraper as a **separate** process:
 *
 *   npx ts-node --compiler-options '{"module":"CommonJS"}' src/lib/cron.ts
 *
 * In production, prefer the instrumentation approach or the API route
 * (`POST /api/cron?secret=...`) triggered by an external scheduler.
 */
import cron from 'node-cron'
import { runAllScrapers } from './scraper'

console.log('⏰ Standalone cron scheduler started')

// Run every day at 03:00 AM Algeria time (UTC+1)
cron.schedule('0 3 * * *', async () => {
  console.log(`[${new Date().toISOString()}] 🕐 Daily scrape triggered`)
  try {
    const results = await runAllScrapers()
    results.forEach(r => {
      console.log(`  ${r.operator}: ${r.status} — ${r.offersFound} found, ${r.offersAdded} added, ${r.offersUpdated} updated`)
    })
    console.log('✅ Daily scrape complete')
  } catch (err) {
    console.error('❌ Daily scrape failed:', err)
  }
}, {
  timezone: 'Africa/Algiers',
})

// Keep process alive
process.on('SIGTERM', () => { console.log('Cron shutting down'); process.exit(0) })
