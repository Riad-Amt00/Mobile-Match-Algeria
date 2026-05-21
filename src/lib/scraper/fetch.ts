/**
 * Browser-backed fetcher for the operator scrapers.
 *
 * All three operators are scraped through a real headless browser (Microsoft
 * Edge via Playwright). Operator anti-bot layers (Cloudflare etc.) reject plain
 * HTTP requests but serve the real page to a genuine browser — so a single,
 * uniform browser fetch path is both the most robust and the most consistent
 * approach. Each page is tried up to 3 times with spaced delays (~25s span) to
 * ride out the intermittent connection resets of flaky operator servers, and a
 * per-operator circuit breaker lets a fully unreachable operator fall back to
 * the verified dataset fast instead of hanging.
 */
import { chromium, type Browser, type BrowserContext } from 'playwright'

type Emit = (level: 'INFO' | 'OK' | 'WARN' | 'ERROR', msg: string) => void

const USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36'

/**
 * Builds a browser fetcher scoped to a single scrape run (one operator).
 * Call once at the start of each `scrapeXxx` function; reuse the returned
 * `fetchPage` for every URL, and call `close()` in a finally block.
 *
 * One browser is launched lazily on first use and reused for every URL of the run.
 */
export function createBrowserFetcher(emit: Emit) {
  let browser: Browser | null = null
  let context: BrowserContext | null = null
  let failures = 0
  let circuitOpen = false

  async function ensure() {
    if (context) return
    const args = ['--disable-blink-features=AutomationControlled', '--no-sandbox']
    try {
      // Real Microsoft Edge (installed on Windows) — least detectable
      browser = await chromium.launch({ channel: 'msedge', headless: true, args })
    } catch {
      // Fallback to Playwright's bundled Chromium if Edge is unavailable
      browser = await chromium.launch({ headless: true, args })
    }
    context = await browser.newContext({
      userAgent: USER_AGENT,
      locale: 'fr-FR',
      timezoneId: 'Africa/Algiers',
      viewport: { width: 1366, height: 768 },
    })
    // Strip the most obvious automation tell
    await context.addInitScript(() => {
      Object.defineProperty(navigator, 'webdriver', { get: () => undefined })
    })
  }

  async function fetchPage(url: string): Promise<string | null> {
    if (circuitOpen) {
      emit('WARN', `${url} → skipped (operator site unreachable — circuit open)`)
      return null
    }
    // Spaced retries — operator servers (notably djezzy.dz) intermittently reset
    // connections; spreading 3 attempts across ~25s catches a good moment far
    // more often than retrying within a few seconds. A healthy page succeeds on
    // attempt 1 and pays no delay.
    const delays = [0, 7000, 18000]
    for (let attempt = 0; attempt < delays.length; attempt++) {
      if (delays[attempt] > 0) await new Promise(r => setTimeout(r, delays[attempt]))
      let page = null
      try {
        await ensure()
        page = await context!.newPage()
        await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 })
        await page.waitForTimeout(2000) // let any late-rendered content settle
        const html = await page.content()
        if (!html || html.length < 800) {
          emit('WARN', `${url} → suspiciously small response (attempt ${attempt + 1}/3)`)
          continue
        }
        failures = 0
        return html
      } catch (e: any) {
        emit('WARN', `${url} → ${(e?.message || String(e)).split('\n')[0]} (attempt ${attempt + 1}/3)`)
      } finally {
        if (page) await page.close().catch(() => {})
      }
    }
    // All attempts failed
    failures++
    if (failures >= 2 && !circuitOpen) {
      circuitOpen = true
      emit('WARN', 'Operator site unreachable via browser — using fallback dataset')
    }
    return null
  }

  async function close() {
    if (browser) {
      await browser.close().catch(() => {})
      browser = null
      context = null
    }
  }

  return { fetchPage, close }
}
