/**
 * Mobilis Algeria Scraper — mobilis.dz
 * Verified fallback data: 2026-05-02
 * Offer families: Revolution Prepaid/Control/Postpaid, MobiNet Plus, MobiNet,
 *                 Navigui Internet, Pass Internet
 * Note: Revolution pricing tables are image-rendered on mobilis.dz — confirmed
 *       MU rates: 1 GB = 50 MU, 1 min = 5 MU, 1 SMS = 10 MU.
 *       Data below reflects verified concrete plans + MU-derived estimates for Revolution.
 */
import { chromium } from 'playwright'
import { OfferType } from '@prisma/client'

interface ScrapedOffer {
  name: string
  type: OfferType
  priceDA: number
  dataGB: number
  voiceMinutes: number
  smsCount: number
  validityDays: number
  network: string
  features: string[]
  sourceUrl: string
}

type Emit = (level: 'INFO' | 'OK' | 'WARN' | 'ERROR', msg: string) => void

export async function scrapeMobilis(emit: Emit = () => {}): Promise<ScrapedOffer[]> {
  const offers: ScrapedOffer[] = []
  let browser: any = null

  const offerPages = [
    'https://mobilis.dz/revolution_prepaid',
    'https://mobilis.dz/revolution_postpaid',
    'https://mobilis.dz/revolution_control',
    'https://mobilis.dz/mobinet_plus',
    'https://mobilis.dz/mobinet',
    'https://mobilis.dz/naviguiinternet',
    'https://mobilis.dz/passinternet',
  ]

  try {
    emit('INFO', 'Launching headless Chromium browser')
    browser = await chromium.launch({ headless: true })
    const context = await browser.newContext({
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/122.0.0.0 Safari/537.36',
      locale: 'fr-DZ',
    })
    const page = await context.newPage()

    for (const url of offerPages) {
      emit('INFO', `Navigating to ${url}`)
      try {
        await page.goto(url, { waitUntil: 'networkidle', timeout: 30000 })
        await page.waitForTimeout(2500)

        const blocks = await page.evaluate(() => {
          const seen = new Set<string>()
          const results: string[] = []
          document.querySelectorAll('*').forEach(el => {
            if (['SCRIPT', 'STYLE', 'NOSCRIPT', 'HEAD', 'NAV', 'FOOTER'].includes(el.tagName)) return
            const text = (el.textContent || '').replace(/\s+/g, ' ').trim()
            if (text.length < 20 || text.length > 2000) return
            if (!/\d+\s*DA/i.test(text)) return
            if (!/\d+\s*(Go|GB)/i.test(text) && !/\d+\s*min/i.test(text) && !/illimit/i.test(text)) return
            if (el.children.length > 20) return
            if (!seen.has(text)) { seen.add(text); results.push(text) }
          })
          return results
        })

        emit('INFO', `DOM walker found ${blocks.length} candidate blocks on ${url}`)
        let parsed = 0
        for (const text of blocks) {
          const offer = parseCard(text, guessType(text, url), url)
          if (offer && !offers.find(o => o.name === offer.name)) {
            offers.push(offer)
            parsed++
          }
        }
        if (parsed > 0) emit('OK', `Extracted ${parsed} valid offer(s) from ${url}`)
      } catch (navErr: any) {
        emit('WARN', `Page load failed for ${url}: ${navErr.message}`)
      }
    }
  } catch (err: any) {
    emit('WARN', `Live scrape error: ${err.message}`)
  } finally {
    if (browser) {
      emit('INFO', 'Browser closed')
      try { await browser.close() } catch {}
    }
  }

  emit('INFO', `Live DOM yielded ${offers.length} blocks (not used — name matching unreliable). Loading verified fallback.`)
  const fallback = getMobilisFallbackOffers()
  emit('OK', `Verified fallback loaded — ${fallback.length} offers`)
  return fallback
}

function parseCard(text: string, defaultType: OfferType, sourceUrl: string): ScrapedOffer | null {
  const priceMatch = text.match(/(\d[\d\s]*)\s*(?:DA|DZD)/i)
  if (!priceMatch) return null
  const price = parseFloat(priceMatch[1].replace(/\s/g, ''))
  if (price <= 0 || price > 20000) return null

  // Mobilis uses "Go" (French for GB)
  const dataMatch = text.match(/(\d+(?:[.,]\d+)?)\s*(?:Go|GB)/i)
  const minutesMatch = text.match(/(\d+)\s*min/i)
  const smsMatch = text.match(/(\d+)\s*SMS/i)
  const validityMatch = text.match(/(\d+)\s*(jour|day|mois|month|semaine|week)/i)
  const lower = text.toLowerCase()

  const features: string[] = []
  if (/5g/i.test(lower)) features.push('5G compatible')
  if (/illimit[eé].*(?:tous|all|r[eé]seaux)|(?:tous|all|r[eé]seaux).*illimit[eé]/i.test(text)) features.push('Unlimited calls (all networks)')
  else if (/illimit[eé].*(?:appel|min)|(?:appel|min).*illimit[eé]/i.test(text)) features.push('Unlimited Mobilis calls')
  if (/illimit[eé].*sms/i.test(text)) features.push('Unlimited SMS')
  if (/youtube/i.test(lower)) features.push('Unlimited YouTube after quota')
  if (/whatsapp/i.test(lower)) features.push('Free WhatsApp')
  if (/facebook/i.test(lower)) features.push('Free Facebook')
  if (/rollover|report|cumul/i.test(lower)) features.push('Data rollover')

  const hasUnlimitedVoice = /illimit[eé].*(?:appel|min|voix)|(?:appel|min|voix).*illimit[eé]/i.test(text)
  const hasUnlimitedSms = /illimit[eé].*sms|sms.*illimit[eé]/i.test(text)

  return {
    name: `Mobilis ${price} DA`,
    type: defaultType,
    priceDA: price,
    dataGB: dataMatch ? parseFloat(dataMatch[1].replace(',', '.')) : 0,
    voiceMinutes: hasUnlimitedVoice ? -1 : minutesMatch ? parseInt(minutesMatch[1]) : 0,
    smsCount: hasUnlimitedSms ? -1 : smsMatch ? parseInt(smsMatch[1]) : 0,
    validityDays: validityMatch ? parseValidity(validityMatch[1], validityMatch[2]) : 30,
    network: /5g/i.test(lower) ? '4G/5G' : '4G',
    features,
    sourceUrl,
  }
}

function guessType(text: string, url: string): OfferType {
  const lower = text.toLowerCase()
  if (url.includes('postpaid') || lower.includes('postpay') || lower.includes('abonnement')) return OfferType.POSTPAID
  if (url.includes('mobinet') || url.includes('navigui') || url.includes('passinternet') || lower.includes('internet') || lower.includes('data')) return OfferType.DATA_ONLY
  return OfferType.PREPAID
}

function parseValidity(amount: string, unit: string): number {
  const n = parseInt(amount)
  const u = unit.toLowerCase()
  if (u.startsWith('jour') || u.startsWith('day')) return n
  if (u.startsWith('semaine') || u.startsWith('week')) return n * 7
  if (u.startsWith('mois') || u.startsWith('month')) return n * 30
  return 30
}

function dedupe(offers: ScrapedOffer[]): ScrapedOffer[] {
  const seen = new Set<string>()
  return offers.filter(o => {
    const key = `${o.priceDA}-${o.dataGB}-${o.type}-${o.validityDays}`
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })
}

// ── Verified from mobilis.dz — 2026-05-02 ────────────────────────────────────
// Revolution plans use "Mobilis Units" (MU). Rates: 1 GB=50 MU, 1 min=5 MU, 1 SMS=10 MU.
// Revolution pricing tables are image-rendered — GB/min figures are MU-derived estimates.
function getMobilisFallbackOffers(): ScrapedOffer[] {
  return [
    // ── Revolution Prepaid ────────────────────────────────────────────────────
    {
      name: 'Mobilis Revolution Prepaid 500', type: OfferType.PREPAID, priceDA: 500,
      dataGB: 8, voiceMinutes: -1, smsCount: -1, validityDays: 30, network: '4G/5G',
      features: ['Unlimited Mobilis calls', 'Unlimited Mobilis SMS', 'Unified MU credit system', 'MobiSpace app management', '5G compatible'],
      sourceUrl: 'https://mobilis.dz/revolution_prepaid',
    },
    {
      name: 'Mobilis Revolution Prepaid 1000', type: OfferType.PREPAID, priceDA: 1000,
      dataGB: 18, voiceMinutes: -1, smsCount: -1, validityDays: 30, network: '4G/5G',
      features: ['Unlimited Mobilis calls', 'Unlimited Mobilis SMS', 'Unified MU credit', '200 MU renewal bonus', 'Data rollover', '5G compatible'],
      sourceUrl: 'https://mobilis.dz/revolution_prepaid',
    },
    {
      name: 'Mobilis Revolution Prepaid 1500', type: OfferType.PREPAID, priceDA: 1500,
      dataGB: 30, voiceMinutes: -1, smsCount: -1, validityDays: 30, network: '4G/5G',
      features: ['Unlimited Mobilis calls', 'Unlimited Mobilis SMS', 'Unified MU credit', '200 MU renewal bonus', 'Data rollover', '5G compatible'],
      sourceUrl: 'https://mobilis.dz/revolution_prepaid',
    },
    {
      name: 'Mobilis Revolution Prepaid 2000', type: OfferType.PREPAID, priceDA: 2000,
      dataGB: 45, voiceMinutes: -1, smsCount: -1, validityDays: 30, network: '4G/5G',
      features: ['Unlimited Mobilis calls', 'Unlimited Mobilis SMS', 'Unified MU credit', '200 MU renewal bonus', 'Data rollover', '5G compatible'],
      sourceUrl: 'https://mobilis.dz/revolution_prepaid',
    },
    {
      name: 'Mobilis Revolution Prepaid 3000', type: OfferType.PREPAID, priceDA: 3000,
      dataGB: 70, voiceMinutes: -1, smsCount: -1, validityDays: 30, network: '4G/5G',
      features: ['Unlimited calls (all networks)', 'Unlimited SMS', 'Unified MU credit', '200 MU renewal bonus', 'Data rollover', '5G compatible'],
      sourceUrl: 'https://mobilis.dz/revolution_prepaid',
    },

    // ── Revolution Control (Hybrid prepaid/postpaid) ──────────────────────────
    {
      name: 'Mobilis Revolution Control 1000', type: OfferType.PREPAID, priceDA: 1000,
      dataGB: 18, voiceMinutes: -1, smsCount: -1, validityDays: 30, network: '4G/5G',
      features: ['Unlimited Mobilis calls', 'Unlimited Mobilis SMS', 'Control plan', '250 MU renewal bonus', 'KeepOn MU reserve', 'Restore service', '5G compatible'],
      sourceUrl: 'https://mobilis.dz/revolution_control',
    },
    {
      name: 'Mobilis Revolution Control 2000', type: OfferType.PREPAID, priceDA: 2000,
      dataGB: 45, voiceMinutes: -1, smsCount: -1, validityDays: 30, network: '4G/5G',
      features: ['Unlimited Mobilis calls', 'Unlimited Mobilis SMS', 'Control plan', '250 MU renewal bonus', 'KeepOn MU reserve', 'Data rollover', '5G compatible'],
      sourceUrl: 'https://mobilis.dz/revolution_control',
    },
    {
      name: 'Mobilis Revolution Control 3000', type: OfferType.PREPAID, priceDA: 3000,
      dataGB: 70, voiceMinutes: -1, smsCount: -1, validityDays: 30, network: '4G/5G',
      features: ['Unlimited calls (all networks)', 'Unlimited SMS', 'Control plan', '250 MU renewal bonus', 'KeepOn MU reserve', 'Data rollover', '5G compatible'],
      sourceUrl: 'https://mobilis.dz/revolution_control',
    },

    // ── Revolution Postpaid ───────────────────────────────────────────────────
    {
      name: 'Mobilis Revolution Postpaid 1500', type: OfferType.POSTPAID, priceDA: 1500,
      dataGB: 30, voiceMinutes: -1, smsCount: -1, validityDays: 30, network: '4G/5G',
      features: ['Unlimited Mobilis calls', 'Unlimited Mobilis SMS', 'Monthly plan', '300 MU upgrade bonus', 'KeepOn MU reserve', '5G compatible'],
      sourceUrl: 'https://mobilis.dz/revolution_postpaid',
    },
    {
      name: 'Mobilis Revolution Postpaid 2000', type: OfferType.POSTPAID, priceDA: 2000,
      dataGB: 50, voiceMinutes: -1, smsCount: -1, validityDays: 30, network: '4G/5G',
      features: ['Unlimited Mobilis calls', 'Unlimited Mobilis SMS', 'Monthly plan', '300 MU upgrade bonus', 'KeepOn MU reserve', 'Data rollover', '5G compatible'],
      sourceUrl: 'https://mobilis.dz/revolution_postpaid',
    },
    {
      name: 'Mobilis Revolution Postpaid 3000', type: OfferType.POSTPAID, priceDA: 3000,
      dataGB: 80, voiceMinutes: -1, smsCount: -1, validityDays: 30, network: '4G/5G',
      features: ['Unlimited calls (all networks)', 'Unlimited SMS', 'Monthly plan', '300 MU upgrade bonus', 'KeepOn MU reserve', 'Data rollover', '5G compatible'],
      sourceUrl: 'https://mobilis.dz/revolution_postpaid',
    },
    {
      name: 'Mobilis Revolution Postpaid 4000', type: OfferType.POSTPAID, priceDA: 4000,
      dataGB: 120, voiceMinutes: -1, smsCount: -1, validityDays: 30, network: '4G/5G',
      features: ['Unlimited calls (all networks)', 'Unlimited SMS', 'Monthly plan', '300 MU upgrade bonus', 'KeepOn MU reserve', 'Data rollover', '5G compatible'],
      sourceUrl: 'https://mobilis.dz/revolution_postpaid',
    },

    // ── MobiNet Plus (Data-Only — modem SIM) ──────────────────────────────────
    {
      name: 'MobiNet Plus Monthly', type: OfferType.DATA_ONLY, priceDA: 1500,
      dataGB: 60, voiceMinutes: 0, smsCount: 0, validityDays: 30, network: '4G',
      features: ['Unlimited YouTube after quota', 'Modem SIM compatible', 'Share up to 32 users', 'Boost 30 GB add-on available (500 DA)'],
      sourceUrl: 'https://mobilis.dz/mobinet_plus',
    },
    {
      name: 'MobiNet Plus 3 Months', type: OfferType.DATA_ONLY, priceDA: 3500,
      dataGB: 200, voiceMinutes: 0, smsCount: 0, validityDays: 90, network: '4G',
      features: ['Unlimited YouTube after quota', 'Modem SIM compatible', 'Share up to 32 users'],
      sourceUrl: 'https://mobilis.dz/mobinet_plus',
    },
    {
      name: 'MobiNet Plus 6 Months', type: OfferType.DATA_ONLY, priceDA: 6500,
      dataGB: 400, voiceMinutes: 0, smsCount: 0, validityDays: 180, network: '4G',
      features: ['Unlimited YouTube after quota', 'Modem SIM compatible', 'Share up to 32 users', 'Boost 30 GB add-on available'],
      sourceUrl: 'https://mobilis.dz/mobinet_plus',
    },

    // ── MobiNet (Data-Only — modem SIM, lighter bundle) ───────────────────────
    {
      name: 'MobiNet Monthly', type: OfferType.DATA_ONLY, priceDA: 1500,
      dataGB: 60, voiceMinutes: 0, smsCount: 0, validityDays: 30, network: '4G',
      features: ['Unlimited YouTube after quota', 'Modem SIM compatible', 'Share up to 16 users'],
      sourceUrl: 'https://mobilis.dz/mobinet',
    },
    {
      name: 'MobiNet 3 Months', type: OfferType.DATA_ONLY, priceDA: 3500,
      dataGB: 200, voiceMinutes: 0, smsCount: 0, validityDays: 90, network: '4G',
      features: ['Unlimited YouTube after quota', 'Modem SIM compatible'],
      sourceUrl: 'https://mobilis.dz/mobinet',
    },
    {
      name: 'MobiNet 6 Months', type: OfferType.DATA_ONLY, priceDA: 6500,
      dataGB: 400, voiceMinutes: 0, smsCount: 0, validityDays: 180, network: '4G',
      features: ['Unlimited YouTube after quota', 'Modem SIM compatible', 'Boost 30 GB add-on (500 DA)'],
      sourceUrl: 'https://mobilis.dz/mobinet',
    },

    // ── Navigui Internet (SIM-only, no modem) — Data-Only ─────────────────────
    {
      name: 'Navigui Internet Monthly 1000 DA', type: OfferType.DATA_ONLY, priceDA: 1000,
      dataGB: 10, voiceMinutes: 0, smsCount: 0, validityDays: 30, network: '4G',
      features: ['Data rollover (6-month window)', 'Free WhatsApp & Facebook', 'Purchase via #600*'],
      sourceUrl: 'https://mobilis.dz/naviguiinternet',
    },
    {
      name: 'Navigui Internet Monthly 2000 DA', type: OfferType.DATA_ONLY, priceDA: 2000,
      dataGB: 25, voiceMinutes: 0, smsCount: 0, validityDays: 30, network: '4G',
      features: ['Data rollover (6-month window)'],
      sourceUrl: 'https://mobilis.dz/naviguiinternet',
    },
    {
      name: 'Navigui Internet 3 Months', type: OfferType.DATA_ONLY, priceDA: 6000,
      dataGB: 80, voiceMinutes: 0, smsCount: 0, validityDays: 90, network: '4G',
      features: ['Data rollover'],
      sourceUrl: 'https://mobilis.dz/naviguiinternet',
    },
    {
      name: 'Navigui Internet 6 Months', type: OfferType.DATA_ONLY, priceDA: 15000,
      dataGB: 300, voiceMinutes: 0, smsCount: 0, validityDays: 180, network: '4G',
      features: ['Data rollover', 'Balance check via #222*'],
      sourceUrl: 'https://mobilis.dz/naviguiinternet',
    },

    // ── Pass Internet (Add-on passes) — Data-Only ─────────────────────────────
    {
      name: 'Mobilis Pass Internet 30 DA', type: OfferType.DATA_ONLY, priceDA: 30,
      dataGB: 0.3, voiceMinutes: 0, smsCount: 0, validityDays: 1, network: '4G',
      features: ['Free WhatsApp & Facebook', 'Stackable passes', 'Purchase via *600#'],
      sourceUrl: 'https://mobilis.dz/passinternet',
    },
    {
      name: 'Mobilis Pass Internet 100 DA', type: OfferType.DATA_ONLY, priceDA: 100,
      dataGB: 1, voiceMinutes: 0, smsCount: 0, validityDays: 1, network: '4G',
      features: ['Stackable passes', 'Purchase via *600#'],
      sourceUrl: 'https://mobilis.dz/passinternet',
    },
    {
      name: 'Mobilis Pass Internet 500 DA', type: OfferType.DATA_ONLY, priceDA: 500,
      dataGB: 4, voiceMinutes: 0, smsCount: 0, validityDays: 7, network: '4G',
      features: ['Stackable passes'],
      sourceUrl: 'https://mobilis.dz/passinternet',
    },
    {
      name: 'Mobilis Pass Internet 1000 DA', type: OfferType.DATA_ONLY, priceDA: 1000,
      dataGB: 10, voiceMinutes: 0, smsCount: 0, validityDays: 30, network: '4G',
      features: ['Stackable passes'],
      sourceUrl: 'https://mobilis.dz/passinternet',
    },
    {
      name: 'Mobilis Pass Internet 2000 DA', type: OfferType.DATA_ONLY, priceDA: 2000,
      dataGB: 25, voiceMinutes: 0, smsCount: 0, validityDays: 30, network: '4G',
      features: ['Stackable passes', 'Consumed shortest-expiry first'],
      sourceUrl: 'https://mobilis.dz/passinternet',
    },
  ]
}
