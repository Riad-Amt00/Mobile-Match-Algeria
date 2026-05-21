// Regenerate /help page screenshots in ENGLISH + LIGHT theme — each capture is
// set up to MATCH the step text in src/lib/i18n.ts.
// Re-run after UI changes:  node take-help-screenshots.mjs

import { chromium } from 'playwright'
import fs from 'fs/promises'

const OUT = 'public/help'
await fs.mkdir(OUT, { recursive: true })

const browser = await chromium.launch({ headless: true })
const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } })
// Force English + light theme for all captured pages
await ctx.addInitScript(() => {
  localStorage.setItem('lang', 'en')
  localStorage.setItem('theme', 'light')
})
const page = await ctx.newPage()
const shot = async (name, clip) => {
  await page.screenshot({ path: `${OUT}/${name}.png`, ...(clip ? { clip } : {}) })
  console.log('✓', name)
}

try {
  await page.goto('http://localhost:3000/login')
  await page.fill('input[type=email]', 'admin@mobilematch.dz')
  await page.fill('input[type=password]', 'admin123456')
  await page.click('button[type=submit]')
  await page.waitForTimeout(3500)

  // 1) SEARCH — type a query (so PARSED CHIPS are visible) AND click the Help button
  // (so the help popover is open). Clip TALLER to fit the popover.
  await page.goto('http://localhost:3000/offers')
  await page.waitForTimeout(5000)
  await page.locator('input[type=search]').fill('5 GB Djezzy unlimited')
  await page.waitForTimeout(900)
  await page.locator('button:has-text("Help")').first().click()
  await page.waitForTimeout(500)
  await page.evaluate(() => window.scrollTo(0, 0))
  await shot('search', { x: 0, y: 80, width: 1280, height: 480 })

  // 2a) RECOMMEND-1 — settings card with priorities + sliders + filters + button
  await page.goto('http://localhost:3000/recommend')
  await page.waitForTimeout(4000)
  const recSel = await page.$$('select')
  if (recSel.length >= 2) {
    await recSel[0].selectOption('price')
    await page.waitForTimeout(150)
    await recSel[1].selectOption('data')
    await page.waitForTimeout(400)
  }
  await page.evaluate(() => window.scrollTo(0, 0))
  await shot('recommend-1', { x: 0, y: 60, width: 1280, height: 760 })

  // 2b) RECOMMEND-2 — click the button → results, scroll to show top 3 ranked
  await page.locator('button:has-text("Get my recommendations")').click()
  await page.waitForTimeout(3500)
  await page.evaluate(() => {
    const el = document.querySelector('[class*="section-title"], h2')
    if (el) el.scrollIntoView({ block: 'start', behavior: 'instant' })
    window.scrollBy(0, 200)  // a bit past the results header
  })
  await page.waitForTimeout(500)
  // Try to scroll right to the first result card (rank badge)
  await page.evaluate(() => {
    const cards = document.querySelectorAll('div')
    for (const c of cards) {
      if (c.textContent && /🥇/.test(c.textContent.trim().slice(0, 4))) {
        c.scrollIntoView({ block: 'start', behavior: 'instant' })
        window.scrollBy(0, -100)
        break
      }
    }
  })
  await page.waitForTimeout(500)
  await shot('recommend-2')

  // 2c) RECOMMEND-3 — comparison output from /compare, scrolled to show the SPEC
  // TABLE (Operator / Type / Price / Data / Calls / SMS / Validity / Network rows)
  try {
    const res = await fetch('http://localhost:3000/api/offers?limit=3')
    const data = await res.json()
    const ids = (data.offers || []).slice(0, 3).map(o => o.id).join(',')
    await page.goto(`http://localhost:3000/compare?ids=${ids}&from=recommend`)
    await page.waitForTimeout(3500)
    await page.evaluate(() => window.scrollTo(0, 760))
    await page.waitForTimeout(500)
    await shot('recommend-3')
  } catch {}

  // 2d) RECOMMEND-4 — /profile page settings, showing the auto-save profile flow
  await page.goto('http://localhost:3000/profile')
  await page.waitForTimeout(3500)
  await page.evaluate(() => window.scrollTo(0, 0))
  await shot('recommend-4', { x: 0, y: 60, width: 1280, height: 760 })

  // 3) COMPARE — populate with 3 offers, scroll to charts
  try {
    const res = await fetch('http://localhost:3000/api/offers?limit=3')
    const data = await res.json()
    const ids = (data.offers || []).slice(0, 3).map(o => o.id).join(',')
    await page.goto(`http://localhost:3000/compare${ids ? `?ids=${ids}` : ''}`)
  } catch { await page.goto('http://localhost:3000/compare') }
  await page.waitForTimeout(3500)
  await page.evaluate(() => window.scrollTo(0, 380))
  await page.waitForTimeout(500)
  await shot('compare')

  // 4) FILTERS — click Djezzy + click "Filters" toggle to expand the panel. Clip
  // tight to the filter rows + expanded panel, no half-cards at the bottom.
  await page.goto('http://localhost:3000/offers')
  await page.waitForTimeout(5000)
  try { await page.locator('button.filter-pill', { hasText: 'Djezzy' }).first().click() } catch {}
  await page.waitForTimeout(400)
  await page.locator('button.filter-pill:has-text("Filters")').first().click().catch(() => {})
  await page.waitForTimeout(900)
  await page.evaluate(() => window.scrollTo(0, 0))
  await shot('filters', { x: 0, y: 60, width: 1280, height: 400 })

  // 5) SAVED — bookmark a few offers first, then capture the saved page
  try {
    const res = await fetch('http://localhost:3000/api/offers?limit=2')
    const data = await res.json()
    for (const o of (data.offers || []).slice(0, 2)) {
      await fetch('http://localhost:3000/api/saved', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', cookie: (await ctx.cookies()).map(c => `${c.name}=${c.value}`).join('; ') },
        body: JSON.stringify({ offerId: o.id }),
      }).catch(() => {})
    }
  } catch {}
  await page.goto('http://localhost:3000/saved')
  await page.waitForTimeout(3000)
  await shot('saved', { x: 0, y: 60, width: 1280, height: 540 })
} catch (e) {
  console.log('FATAL:', e.message.split('\n')[0])
}
await browser.close()
