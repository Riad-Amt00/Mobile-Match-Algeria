/**
 * Daily scrape cron job — runs at 03:00 every day
 * Usage: node --loader ts-node/esm src/lib/cron.ts
 * Or call runAllScrapers() from an API route/Vercel cron
 */
import cron from 'node-cron'
import { runAllScrapers } from './scraper'

console.log('⏰ Cron job scheduler started')

// Run every day at 03:00 AM Algeria time (UTC+1)
cron.schedule('0 2 * * *', async () => {
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
  timezone: 'Africa/Algiers'
})

// Keep process alive
process.on('SIGTERM', () => { console.log('Cron shutting down'); process.exit(0) })
