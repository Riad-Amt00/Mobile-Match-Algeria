/**
 * Djezzy Scraper — djezzy.dz
 * Verified fallback data: 2026-05-02
 * Offer families: LEGEND, IZZY!, ZID, CAMPUCE, LEGEND MAX, CONFORT PARTAGE, DjezzyNet, 3ayla
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

export async function scrapeDjezzy(emit: Emit = () => {}): Promise<ScrapedOffer[]> {
  const offers: ScrapedOffer[] = []
  let browser: any = null

  const offerPages = [
    'https://www.djezzy.dz/particuliers/offres/djezzy-legend/',
    'https://www.djezzy.dz/particuliers/offres/izzy-game-changer/',
    'https://www.djezzy.dz/particuliers/offres/djezzy-zid/',
    'https://www.djezzy.dz/particuliers/offres/legend-max/',
    'https://www.djezzy.dz/particuliers/offres/djezzy-confort-2/',
    'https://www.djezzy.dz/particuliers/offres/offres-internet/',
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
        await page.waitForTimeout(2000)

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
          const offer = parseCard(text, guessType(text), url)
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

  // Live DOM parsing produces inconsistent offer names that create DB duplicates.
  // Always use the verified dataset; update it manually when Djezzy changes their plans.
  emit('INFO', `Live DOM yielded ${offers.length} blocks (not used — name matching unreliable). Loading verified fallback.`)
  const fallback = getDjezzyFallbackOffers()
  emit('OK', `Verified fallback loaded — ${fallback.length} offers`)
  return fallback
}

function parseCard(text: string, defaultType: OfferType, sourceUrl: string): ScrapedOffer | null {
  const priceMatch = text.match(/(\d[\d\s]*)\s*(?:DA|DZD)/i)
  if (!priceMatch) return null
  const price = parseFloat(priceMatch[1].replace(/\s/g, ''))
  if (price <= 0 || price > 20000) return null

  const dataMatch = text.match(/(\d+(?:[.,]\d+)?)\s*(?:Go|GB)/i)
  const minutesMatch = text.match(/(\d+)\s*min/i)
  const smsMatch = text.match(/(\d+)\s*SMS/i)
  const validityMatch = text.match(/(\d+)\s*(jour|day|mois|month|semaine|week)/i)
  const lower = text.toLowerCase()

  const features: string[] = []
  if (/illimit[eé].*(?:tous|all|r[eé]seaux)|(?:tous|all|r[eé]seaux).*illimit[eé]/i.test(text)) features.push('Unlimited calls (all networks)')
  else if (/illimit[eé].*(?:appel|min)|(?:appel|min).*illimit[eé]/i.test(text)) features.push('Unlimited Djezzy calls')
  if (/illimit[eé].*sms/i.test(text)) features.push('Unlimited SMS')
  if (/social|facebook|instagram/i.test(lower)) features.push('Free social media')
  if (/youtube/i.test(lower)) features.push('Free YouTube')
  if (/5g/i.test(lower)) features.push('5G ready')
  if (/rollover|report|accumuler/i.test(lower)) features.push('Data rollover')

  const hasUnlimitedVoice = /illimit[eé].*(?:appel|min|voix)|(?:appel|min|voix).*illimit[eé]/i.test(text)
  const hasUnlimitedSms = /illimit[eé].*sms|sms.*illimit[eé]/i.test(text)

  return {
    name: `Djezzy ${price} DA`,
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

function guessType(text: string): OfferType {
  const lower = text.toLowerCase()
  if (lower.includes('postpay') || lower.includes('postpayé') || lower.includes('abonnement') || lower.includes('mensuel')) return OfferType.POSTPAID
  if (lower.includes('data only') || lower.includes('internet only') || lower.includes('sim internet') || lower.includes('3ayla')) return OfferType.DATA_ONLY
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

// ── Verified from djezzy.dz — 2026-05-02 ─────────────────────────────────────
function getDjezzyFallbackOffers(): ScrapedOffer[] {
  const BASE = 'https://www.djezzy.dz/particuliers/offres/'
  return [
    // ── LEGEND (Prepaid) ──────────────────────────────────────────────────────
    {
      name: 'Djezzy LEGEND 100', type: OfferType.PREPAID, priceDA: 100,
      dataGB: 1, voiceMinutes: -1, smsCount: -1, validityDays: 1, network: '4G',
      features: ['Unlimited Djezzy calls', 'Unlimited Djezzy SMS', 'Data rollover'],
      sourceUrl: `${BASE}djezzy-legend/`,
    },
    {
      name: 'Djezzy LEGEND 1000', type: OfferType.PREPAID, priceDA: 1000,
      dataGB: 15, voiceMinutes: -1, smsCount: -1, validityDays: 30, network: '4G',
      features: ['Unlimited Djezzy calls', 'Unlimited Djezzy SMS', 'Data rollover'],
      sourceUrl: `${BASE}djezzy-legend/`,
    },
    {
      name: 'Djezzy LEGEND 1500', type: OfferType.PREPAID, priceDA: 1500,
      dataGB: 45, voiceMinutes: -1, smsCount: -1, validityDays: 30, network: '4G',
      features: ['Unlimited Djezzy calls', 'Unlimited Djezzy SMS', 'Data rollover'],
      sourceUrl: `${BASE}djezzy-legend/`,
    },
    {
      name: 'Djezzy LEGEND 2000', type: OfferType.PREPAID, priceDA: 2000,
      dataGB: 70, voiceMinutes: -1, smsCount: -1, validityDays: 30, network: '4G',
      features: ['Unlimited calls (all networks)', 'Unlimited Djezzy SMS', 'Data rollover'],
      sourceUrl: `${BASE}djezzy-legend/`,
    },
    {
      name: 'Djezzy LEGEND 2000 Max', type: OfferType.PREPAID, priceDA: 2000,
      dataGB: 90, voiceMinutes: 350, smsCount: -1, validityDays: 30, network: '4G',
      features: ['Unlimited Djezzy calls', '350 min to other operators', 'Unlimited Djezzy SMS', 'Data rollover'],
      sourceUrl: `${BASE}djezzy-legend/`,
    },
    {
      name: 'Djezzy LEGEND 2500', type: OfferType.PREPAID, priceDA: 2500,
      dataGB: 120, voiceMinutes: -1, smsCount: -1, validityDays: 30, network: '4G',
      features: ['Unlimited calls (all networks)', 'Unlimited Djezzy SMS', 'Data rollover'],
      sourceUrl: `${BASE}djezzy-legend/`,
    },
    {
      name: 'Djezzy LEGEND 3000', type: OfferType.PREPAID, priceDA: 3000,
      dataGB: 145, voiceMinutes: -1, smsCount: -1, validityDays: 30, network: '4G',
      features: ['Unlimited calls (all networks)', 'Unlimited Djezzy SMS', 'Data rollover'],
      sourceUrl: `${BASE}djezzy-legend/`,
    },
    {
      name: 'Djezzy LEGEND 4000', type: OfferType.PREPAID, priceDA: 4000,
      dataGB: 200, voiceMinutes: -1, smsCount: -1, validityDays: 30, network: '4G',
      features: ['Unlimited calls (all networks)', 'Unlimited Djezzy SMS', 'Data rollover'],
      sourceUrl: `${BASE}djezzy-legend/`,
    },

    // ── IZZY! (Prepaid) ───────────────────────────────────────────────────────
    {
      name: 'IZZY! 50', type: OfferType.PREPAID, priceDA: 50,
      dataGB: 1, voiceMinutes: -1, smsCount: -1, validityDays: 1, network: '4G',
      features: ['Unlimited calls (all networks)', 'Unlimited SMS', 'Optional add-ons'],
      sourceUrl: `${BASE}izzy-game-changer/`,
    },
    {
      name: 'IZZY! 300', type: OfferType.PREPAID, priceDA: 300,
      dataGB: 3, voiceMinutes: -1, smsCount: -1, validityDays: 15, network: '4G',
      features: ['Unlimited calls (all networks)', 'Unlimited SMS', 'Optional add-ons (YouTube, social)'],
      sourceUrl: `${BASE}izzy-game-changer/`,
    },
    {
      name: 'IZZY! 500', type: OfferType.PREPAID, priceDA: 500,
      dataGB: 5, voiceMinutes: -1, smsCount: -1, validityDays: 30, network: '4G',
      features: ['Unlimited calls (all networks)', 'Unlimited SMS'],
      sourceUrl: `${BASE}izzy-game-changer/`,
    },
    {
      name: 'IZZY! 1200', type: OfferType.PREPAID, priceDA: 1200,
      dataGB: 10, voiceMinutes: -1, smsCount: -1, validityDays: 30, network: '4G',
      features: ['Unlimited calls (all networks)', 'Unlimited SMS', 'Free YouTube', '1000 DA credit'],
      sourceUrl: `${BASE}izzy-game-changer/`,
    },

    // ── ZID (Prepaid) ─────────────────────────────────────────────────────────
    {
      name: 'Djezzy ZID 50', type: OfferType.PREPAID, priceDA: 50,
      dataGB: 0.5, voiceMinutes: -1, smsCount: -1, validityDays: 1, network: '4G',
      features: ['Unlimited Djezzy calls', 'Unlimited Djezzy SMS'],
      sourceUrl: `${BASE}djezzy-zid/`,
    },
    {
      name: 'Djezzy ZID 100', type: OfferType.PREPAID, priceDA: 100,
      dataGB: 1, voiceMinutes: -1, smsCount: -1, validityDays: 1, network: '4G',
      features: ['Unlimited Djezzy calls', 'Unlimited Djezzy SMS'],
      sourceUrl: `${BASE}djezzy-zid/`,
    },
    {
      name: 'Djezzy ZID 200', type: OfferType.PREPAID, priceDA: 200,
      dataGB: 2, voiceMinutes: -1, smsCount: -1, validityDays: 7, network: '4G',
      features: ['Unlimited Djezzy calls', 'Unlimited Djezzy SMS'],
      sourceUrl: `${BASE}djezzy-zid/`,
    },
    {
      name: 'Djezzy ZID 500', type: OfferType.PREPAID, priceDA: 500,
      dataGB: 5, voiceMinutes: -1, smsCount: -1, validityDays: 30, network: '4G',
      features: ['Unlimited Djezzy calls', 'Unlimited Djezzy SMS'],
      sourceUrl: `${BASE}djezzy-zid/`,
    },
    {
      name: 'Djezzy ZID 1000', type: OfferType.PREPAID, priceDA: 1000,
      dataGB: 15, voiceMinutes: -1, smsCount: -1, validityDays: 30, network: '4G',
      features: ['Unlimited Djezzy calls', 'Unlimited Djezzy SMS'],
      sourceUrl: `${BASE}djezzy-zid/`,
    },
    {
      name: 'Djezzy ZID 1500', type: OfferType.PREPAID, priceDA: 1500,
      dataGB: 40, voiceMinutes: -1, smsCount: -1, validityDays: 30, network: '4G',
      features: ['Unlimited Djezzy calls', 'Unlimited Djezzy SMS'],
      sourceUrl: `${BASE}djezzy-zid/`,
    },

    // ── CAMPUCE Student (Prepaid) ─────────────────────────────────────────────
    {
      name: 'Djezzy CAMPUCE 100', type: OfferType.PREPAID, priceDA: 100,
      dataGB: 1, voiceMinutes: -1, smsCount: -1, validityDays: 1, network: '4G',
      features: ['Unlimited Djezzy calls', 'Unlimited Djezzy SMS', 'Student offer', 'Free SIM', '1 GB Friday bonus/week'],
      sourceUrl: `${BASE}offre-djezzy-campuce/`,
    },
    {
      name: 'Djezzy CAMPUCE 400', type: OfferType.PREPAID, priceDA: 400,
      dataGB: 5, voiceMinutes: -1, smsCount: -1, validityDays: 30, network: '4G',
      features: ['Unlimited Djezzy calls', 'Unlimited Djezzy SMS', 'Student offer', '20% discount', '1 GB Friday bonus/week'],
      sourceUrl: `${BASE}offre-djezzy-campuce/`,
    },
    {
      name: 'Djezzy CAMPUCE 800', type: OfferType.PREPAID, priceDA: 800,
      dataGB: 15, voiceMinutes: -1, smsCount: -1, validityDays: 30, network: '4G',
      features: ['Unlimited Djezzy calls', 'Unlimited Djezzy SMS', 'Student offer', '1 GB Friday bonus/week'],
      sourceUrl: `${BASE}offre-djezzy-campuce/`,
    },
    {
      name: 'Djezzy CAMPUCE 1200', type: OfferType.PREPAID, priceDA: 1200,
      dataGB: 40, voiceMinutes: -1, smsCount: -1, validityDays: 30, network: '4G',
      features: ['Unlimited Djezzy calls', 'Unlimited Djezzy SMS', 'Student offer', '1 GB Friday bonus/week'],
      sourceUrl: `${BASE}offre-djezzy-campuce/`,
    },
    {
      name: 'Djezzy CAMPUCE 1600', type: OfferType.PREPAID, priceDA: 1600,
      dataGB: 70, voiceMinutes: -1, smsCount: -1, validityDays: 30, network: '4G',
      features: ['Unlimited Djezzy calls', '50 SMS to other operators', 'Student offer', '1 GB Friday bonus/week'],
      sourceUrl: `${BASE}offre-djezzy-campuce/`,
    },

    // ── LEGEND MAX (Postpaid) ─────────────────────────────────────────────────
    {
      name: 'Djezzy LEGEND MAX 1500', type: OfferType.POSTPAID, priceDA: 1500,
      dataGB: 50, voiceMinutes: -1, smsCount: -1, validityDays: 30, network: '4G',
      features: ['Unlimited Djezzy calls', 'Unlimited Djezzy SMS', 'Monthly plan', 'International credit included'],
      sourceUrl: `${BASE}legend-max/`,
    },
    {
      name: 'Djezzy LEGEND MAX 2000', type: OfferType.POSTPAID, priceDA: 2000,
      dataGB: 70, voiceMinutes: -1, smsCount: -1, validityDays: 30, network: '4G',
      features: ['Unlimited calls (all networks)', 'Unlimited Djezzy SMS', '100 SMS to other operators', 'Monthly plan'],
      sourceUrl: `${BASE}legend-max/`,
    },
    {
      name: 'Djezzy LEGEND MAX 2000 Plus', type: OfferType.POSTPAID, priceDA: 2000,
      dataGB: 80, voiceMinutes: -1, smsCount: -1, validityDays: 30, network: '4G',
      features: ['Unlimited Djezzy calls', 'Unlimited Djezzy SMS', 'Monthly plan', '15 min international calls'],
      sourceUrl: `${BASE}legend-max/`,
    },
    {
      name: 'Djezzy LEGEND MAX 2500', type: OfferType.POSTPAID, priceDA: 2500,
      dataGB: 100, voiceMinutes: -1, smsCount: -1, validityDays: 30, network: '4G',
      features: ['Unlimited calls (all networks)', 'Unlimited Djezzy SMS', '150 SMS to other operators', 'Monthly plan'],
      sourceUrl: `${BASE}legend-max/`,
    },
    {
      name: 'Djezzy LEGEND MAX 3000', type: OfferType.POSTPAID, priceDA: 3000,
      dataGB: 150, voiceMinutes: -1, smsCount: -1, validityDays: 30, network: '4G',
      features: ['Unlimited Djezzy calls', 'Unlimited Djezzy SMS', 'Monthly plan', '30 min international calls'],
      sourceUrl: `${BASE}legend-max/`,
    },

    // ── CONFORT PARTAGE (Postpaid, shared data) ───────────────────────────────
    {
      name: 'Djezzy CONFORT PARTAGE 1500', type: OfferType.POSTPAID, priceDA: 1500,
      dataGB: 50, voiceMinutes: -1, smsCount: -1, validityDays: 30, network: '4G',
      features: ['Unlimited Djezzy calls', 'Unlimited Djezzy SMS', 'Shareable secondary SIM', 'Monthly plan'],
      sourceUrl: `${BASE}djezzy-confort-2/`,
    },
    {
      name: 'Djezzy CONFORT PARTAGE 2000', type: OfferType.POSTPAID, priceDA: 2000,
      dataGB: 80, voiceMinutes: -1, smsCount: -1, validityDays: 30, network: '4G',
      features: ['Unlimited Djezzy calls', 'Unlimited Djezzy SMS', 'Shareable secondary SIM', 'Monthly plan', '15 min international'],
      sourceUrl: `${BASE}djezzy-confort-2/`,
    },
    {
      name: 'Djezzy CONFORT PARTAGE 3000', type: OfferType.POSTPAID, priceDA: 3000,
      dataGB: 150, voiceMinutes: -1, smsCount: -1, validityDays: 30, network: '4G',
      features: ['Unlimited Djezzy calls', 'Unlimited Djezzy SMS', 'Shareable secondary SIM', 'Monthly plan', '30 min international'],
      sourceUrl: `${BASE}djezzy-confort-2/`,
    },

    // ── DjezzyNet — Daily (Data-Only) ─────────────────────────────────────────
    {
      name: 'DjezzyNet Daily 15 DA', type: OfferType.DATA_ONLY, priceDA: 15,
      dataGB: 0.3, voiceMinutes: 0, smsCount: 0, validityDays: 1, network: '4G',
      features: ['50% discount on 2nd subscription'],
      sourceUrl: `${BASE}offres-internet/`,
    },
    {
      name: 'DjezzyNet Daily 25 DA', type: OfferType.DATA_ONLY, priceDA: 25,
      dataGB: 0.6, voiceMinutes: 0, smsCount: 0, validityDays: 1, network: '4G',
      features: ['50% discount on 2nd subscription'],
      sourceUrl: `${BASE}offres-internet/`,
    },
    {
      name: 'DjezzyNet Daily 50 DA', type: OfferType.DATA_ONLY, priceDA: 50,
      dataGB: 2, voiceMinutes: 0, smsCount: 0, validityDays: 1, network: '4G',
      features: ['50% discount on 2nd subscription'],
      sourceUrl: `${BASE}offres-internet/`,
    },
    {
      name: 'DjezzyNet Daily 150 DA', type: OfferType.DATA_ONLY, priceDA: 150,
      dataGB: 5, voiceMinutes: 0, smsCount: 0, validityDays: 1, network: '4G',
      features: ['Activate via *720#'],
      sourceUrl: `${BASE}offres-internet/`,
    },

    // ── DjezzyNet — Weekly (Data-Only) ────────────────────────────────────────
    {
      name: 'DjezzyNet Weekly 75 DA', type: OfferType.DATA_ONLY, priceDA: 75,
      dataGB: 4, voiceMinutes: 0, smsCount: 0, validityDays: 7, network: '4G',
      features: ['50% discount on 2nd subscription'],
      sourceUrl: `${BASE}offres-internet/`,
    },
    {
      name: 'DjezzyNet Weekly 150 DA', type: OfferType.DATA_ONLY, priceDA: 150,
      dataGB: 10, voiceMinutes: 0, smsCount: 0, validityDays: 7, network: '4G',
      features: ['50% discount on 2nd subscription'],
      sourceUrl: `${BASE}offres-internet/`,
    },
    {
      name: 'DjezzyNet Weekly 500 DA', type: OfferType.DATA_ONLY, priceDA: 500,
      dataGB: 20, voiceMinutes: 0, smsCount: 0, validityDays: 7, network: '4G',
      features: [],
      sourceUrl: `${BASE}offres-internet/`,
    },

    // ── DjezzyNet — Monthly (Data-Only) ──────────────────────────────────────
    {
      name: 'DjezzyNet Monthly 250 DA', type: OfferType.DATA_ONLY, priceDA: 250,
      dataGB: 12, voiceMinutes: 0, smsCount: 0, validityDays: 30, network: '4G',
      features: ['50% discount on 2nd subscription'],
      sourceUrl: `${BASE}offres-internet/`,
    },
    {
      name: 'DjezzyNet Monthly 500 DA', type: OfferType.DATA_ONLY, priceDA: 500,
      dataGB: 30, voiceMinutes: 0, smsCount: 0, validityDays: 30, network: '4G',
      features: ['50% discount on 2nd subscription'],
      sourceUrl: `${BASE}offres-internet/`,
    },
    {
      name: 'DjezzyNet Monthly 750 DA', type: OfferType.DATA_ONLY, priceDA: 750,
      dataGB: 60, voiceMinutes: 0, smsCount: 0, validityDays: 30, network: '4G',
      features: ['50% discount on 2nd subscription'],
      sourceUrl: `${BASE}offres-internet/`,
    },
    {
      name: 'DjezzyNet Monthly 2000 DA', type: OfferType.DATA_ONLY, priceDA: 2000,
      dataGB: 100, voiceMinutes: 0, smsCount: 0, validityDays: 30, network: '4G',
      features: [],
      sourceUrl: `${BASE}offres-internet/`,
    },
    {
      name: 'DjezzyNet Monthly 4000 DA', type: OfferType.DATA_ONLY, priceDA: 4000,
      dataGB: 220, voiceMinutes: 0, smsCount: 0, validityDays: 30, network: '4G',
      features: ['Bonus app data available'],
      sourceUrl: `${BASE}offres-internet/`,
    },

    // ── 3ayla / SIM Internet (Data-Only, long validity) ───────────────────────
    {
      name: 'Djezzy SIM Internet 1000 DA', type: OfferType.DATA_ONLY, priceDA: 1000,
      dataGB: 15, voiceMinutes: 0, smsCount: 0, validityDays: 30, network: '4G',
      features: ['Internet SIM', '4G modem compatible', 'Activate via *720#'],
      sourceUrl: `${BASE}nouveaux-forfaits-internet-de-djezzy/`,
    },
    {
      name: 'Djezzy SIM Internet 1500 DA', type: OfferType.DATA_ONLY, priceDA: 1500,
      dataGB: 50, voiceMinutes: 0, smsCount: 0, validityDays: 30, network: '4G',
      features: ['Internet SIM', '4G modem compatible'],
      sourceUrl: `${BASE}nouveaux-forfaits-internet-de-djezzy/`,
    },
    {
      name: 'Djezzy 3ayla 3 Months', type: OfferType.DATA_ONLY, priceDA: 2500,
      dataGB: 60, voiceMinutes: 0, smsCount: 0, validityDays: 90, network: '4G',
      features: ['Family internet plan', '4G modem bundle option'],
      sourceUrl: `${BASE}djezzy-3ayla/`,
    },
    {
      name: 'Djezzy 3ayla 6 Months', type: OfferType.DATA_ONLY, priceDA: 4000,
      dataGB: 150, voiceMinutes: 0, smsCount: 0, validityDays: 180, network: '4G',
      features: ['Family internet plan', '4G modem bundle option'],
      sourceUrl: `${BASE}djezzy-3ayla/`,
    },
    {
      name: 'Djezzy 3ayla Annual', type: OfferType.DATA_ONLY, priceDA: 7500,
      dataGB: 350, voiceMinutes: 0, smsCount: 0, validityDays: 365, network: '4G',
      features: ['Annual plan', 'Family internet', '4G modem compatible'],
      sourceUrl: `${BASE}djezzy-3ayla/`,
    },
  ]
}
