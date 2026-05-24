// Regenerate the screenshots embedded in the thesis (memoire/images/).
// Each capture matches the figure description in chapters/ch3_implementation.tex.
// Re-run after UI changes:  node take-thesis-screenshots.mjs
//
// Requires the dev or production server running on http://localhost:3000.

import { chromium } from 'playwright'
import fs from 'fs/promises'

const OUT = 'memoire/images'
await fs.mkdir(OUT, { recursive: true })

const browser = await chromium.launch({ headless: true })
const ctx = await browser.newContext({
  viewport: { width: 1440, height: 900 },
  deviceScaleFactor: 2, // higher DPI for printed PDF
})
// Force English + light theme so figures match the English-language thesis body
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
  // ── 1) screenshot_home — landing page (unauthenticated, language + tiles)
  await page.goto('http://localhost:3000/')
  await page.waitForTimeout(3000)
  await page.evaluate(() => window.scrollTo(0, 0))
  await shot('screenshot_home')

  // ── 2) screenshot_login — auth screen, before submission
  await page.goto('http://localhost:3000/login')
  await page.waitForTimeout(2500)
  await page.evaluate(() => window.scrollTo(0, 0))
  await shot('screenshot_login', { x: 0, y: 0, width: 1440, height: 720 })

  // Sign in as admin for the remaining captures
  await page.fill('input[type=email]', 'admin@mobilematch.dz')
  await page.fill('input[type=password]', 'admin123456')
  await page.click('button[type=submit]')
  await page.waitForTimeout(3500)

  // ── 3) screenshot_offers — offers page with structured search visible
  await page.goto('http://localhost:3000/offers')
  await page.waitForTimeout(4500)
  // Type a sample query so parsed-token chips render visibly
  await page.locator('input[type=search]').first().fill('5 GB Djezzy unlimited')
  await page.waitForTimeout(900)
  await page.evaluate(() => window.scrollTo(0, 0))
  await shot('screenshot_offers')

  // ── 4) compare_bar — sticky bottom bar shown when offers are selected
  // Open offers fresh (clear the search), then click 2 offer card checkboxes
  await page.locator('input[type=search]').first().fill('')
  await page.waitForTimeout(500)
  // Click the first two compare checkboxes / select buttons
  const compareButtons = page.locator('button:has-text("Compare"), button[aria-label*="compare" i], input[type=checkbox]')
  const count = await compareButtons.count()
  if (count >= 2) {
    await compareButtons.nth(0).click().catch(() => {})
    await page.waitForTimeout(300)
    await compareButtons.nth(1).click().catch(() => {})
    await page.waitForTimeout(600)
  }
  // Scroll to the bottom so the sticky bar is visible at its natural position
  await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight))
  await page.waitForTimeout(500)
  await shot('compare_bar', { x: 0, y: 720, width: 1440, height: 180 })

  // ── 5) screenshot_compare — comparison page with charts + table
  // Use the first 2-3 offers via the API to construct a deterministic compare URL
  try {
    const res = await fetch('http://localhost:3000/api/offers?limit=3')
    const data = await res.json()
    const ids = (data.offers || []).slice(0, 3).map(o => o.id).join(',')
    await page.goto(`http://localhost:3000/compare?ids=${ids}`)
  } catch {
    await page.goto('http://localhost:3000/compare')
  }
  await page.waitForTimeout(4000)
  await page.evaluate(() => window.scrollTo(0, 200))
  await page.waitForTimeout(500)
  await shot('screenshot_compare')

  // ── 6) screenshot_recommend — recommend page with ranked results
  await page.goto('http://localhost:3000/recommend')
  await page.waitForTimeout(4000)
  // Select two priorities if the dropdowns are present (price, data)
  const priorSelects = await page.$$('select')
  if (priorSelects.length >= 2) {
    await priorSelects[0].selectOption('price').catch(() => {})
    await page.waitForTimeout(200)
    await priorSelects[1].selectOption('data').catch(() => {})
    await page.waitForTimeout(400)
  }
  // Click the "Get my recommendations" CTA to materialise the ranked results
  await page.locator('button:has-text("Get my recommendations"), button:has-text("Get recommendations")').first().click().catch(() => {})
  await page.waitForTimeout(3500)
  // Scroll to show the settings + the top results
  await page.evaluate(() => window.scrollTo(0, 320))
  await page.waitForTimeout(500)
  await shot('screenshot_recommend')

  // ── 7) screenshot_admin — admin dashboard
  await page.goto('http://localhost:3000/admin')
  await page.waitForTimeout(4500)
  await page.evaluate(() => window.scrollTo(0, 0))
  await shot('screenshot_admin')

  // ── 8) screenshot_help — guided help / tutorial page
  await page.goto('http://localhost:3000/help')
  await page.waitForTimeout(3500)
  await page.evaluate(() => window.scrollTo(0, 0))
  await shot('screenshot_help', { x: 0, y: 0, width: 1440, height: 900 })

  // ── 9) screenshot_saved — saved-plans page (requires bookmarked plans)
  // Bookmark up to 3 offers via the API for the admin account, then visit /saved
  try {
    const cookies = await ctx.cookies()
    const cookieHeader = cookies.map(c => `${c.name}=${c.value}`).join('; ')
    const res = await fetch('http://localhost:3000/api/offers?limit=3', {
      headers: { cookie: cookieHeader },
    })
    const data = await res.json()
    for (const o of (data.offers || []).slice(0, 3)) {
      await fetch('http://localhost:3000/api/saved-offers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', cookie: cookieHeader },
        body: JSON.stringify({ offerId: o.id }),
      }).catch(() => {})
    }
  } catch {}
  await page.goto('http://localhost:3000/saved')
  await page.waitForTimeout(3500)
  await page.evaluate(() => window.scrollTo(0, 0))
  await shot('screenshot_saved')

  // ── 11) screenshot_profile — user profile / preferences page
  await page.goto('http://localhost:3000/profile')
  await page.waitForTimeout(3500)
  await page.evaluate(() => window.scrollTo(0, 0))
  await shot('screenshot_profile')
} catch (e) {
  console.error('FATAL:', e.message.split('\n')[0])
}
await browser.close()
console.log('Done — images saved to', OUT)
