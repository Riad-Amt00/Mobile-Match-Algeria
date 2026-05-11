/**
 * Mobilis Algeria Scraper — fetches live data from mobilis.dz using HTTP + cheerio.
 *
 * Parseable pages (live):
 *   passinternet   — div.item_price cards with Arabic جيغا/ميغا units
 *   mobinet_plus   — same div.item_price structure
 *   mobinet        — same div.item_price structure
 *   naviguiinternet — Arabic Quill text with pattern "X جيغا بـ Z دج"
 *
 * Not parseable (Revolution plans use image-only carousels):
 *   revolution_prepaid / revolution_postpaid / revolution_control
 *   → Fallback to verified dataset for these three plan families.
 */
import * as cheerio from 'cheerio'
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

const HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
  'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
  'Accept-Language': 'fr-FR,fr;q=0.9,en;q=0.8',
}

async function fetchPage(url: string): Promise<string | null> {
  try {
    const res = await fetch(url, { headers: HEADERS, signal: AbortSignal.timeout(15000) })
    if (!res.ok) return null
    const text = await res.text()
    if (text.length < 500) return null  // WAF rejection page is ~245 bytes
    return text
  } catch {
    return null
  }
}

// Parse Arabic GB/MB amount: "60 جيغا" → 60, "300 ميغا" → 0.293
function parseArabicGB(text: string): number {
  const giga = text.match(/([\d.]+)\s*جيغا/u)
  if (giga) return parseFloat(giga[1])
  const mega = text.match(/([\d.]+)\s*ميغا/u)
  if (mega) return parseFloat(mega[1]) / 1024
  // Also handle Latin: "60 Go", "60 GB"
  const go = text.match(/([\d.]+)\s*(?:go|gb|giga)/i)
  if (go) return parseFloat(go[1])
  return 0
}

// Parse Arabic DA price: "30 دج" → 30, or plain "30" in context
function parseArabicDA(text: string): number {
  const m = text.match(/(\d[\d\s]*)(?:\s*دج|\s*DA)/u)
  if (m) return parseInt(m[1].replace(/\s/g, ''))
  return 0
}

// Parse validity from Arabic text: "30 يوم" → 30, "3 أشهر" → 90, "شهريا" → 30, "6 أشهر" → 180
function parseArabicDays(text: string): number {
  if (/شهريا|شهري/u.test(text)) return 30
  const months = text.match(/(\d+)\s*(?:أشهر|شهر)/u)
  if (months) return parseInt(months[1]) * 30
  const days = text.match(/(\d+)\s*(?:أيام|يوم)/u)
  if (days) return parseInt(days[1])
  // Latin fallback
  const mLat = text.match(/(\d+)\s*(?:mois|month)/i)
  if (mLat) return parseInt(mLat[1]) * 30
  const dLat = text.match(/(\d+)\s*(?:jours?|days?)/i)
  if (dLat) return parseInt(dLat[1])
  return 30
}

// ── Parser for div.item_price layout (passinternet, mobinet_plus, mobinet) ────
function parseItemPriceCards(
  $: cheerio.CheerioAPI,
  pageUrl: string,
  planFamily: string,
  type: OfferType,
): ScrapedOffer[] {
  const offers: ScrapedOffer[] = []

  $('div.item_price').each((_, el) => {
    const card = $(el)

    // Price — text directly in .pricing-price before the <span class="price-unit">
    const pricingDiv = card.find('.pricing-price')
    const priceText = pricingDiv.clone().find('span').remove().end().text().trim()
    const priceDA = parseInt(priceText.replace(/\D/g, ''))
    if (!priceDA || isNaN(priceDA)) return

    // Validity — in a small span inside .pricing-price like "/ 30 يوم" or "/ شهريا"
    const validityText = pricingDiv.find('span').text()
    const validityDays = parseArabicDays(validityText) || 30

    // Data — in li.prclass span with جيغا/ميغا
    let dataGB = 0
    const features: string[] = []

    card.find('li.prclass').each((_, li) => {
      const text = $(li).text().replace(/\s+/g, ' ').trim()
      if (!text) return
      const gb = parseArabicGB(text)
      if (gb > 0 && !dataGB) dataGB = gb
      // Collect non-data features (calls, SMS, social apps)
      if (gb === 0 && text.length > 1) features.push(text)
    })

    if (!dataGB) return

    offers.push({
      name: `${planFamily} ${priceDA} DA`,
      type,
      priceDA,
      dataGB,
      voiceMinutes: 0,
      smsCount: 0,
      validityDays,
      network: '4G',
      features,
      sourceUrl: pageUrl,
    })
  })

  return offers
}

// ── Parser for Navigui — Arabic Quill text with inline pricing ────────────────
// Pattern: "✅ X جيغا صالحة Y بـ Z دج"
function parseNaviguiText($: cheerio.CheerioAPI, pageUrl: string): ScrapedOffer[] {
  const offers: ScrapedOffer[] = []
  const pageText = $.text()

  // Match lines like: "✅10 جيغا صالحة 30 يومًا بـ 1000 دج"
  // or "✅80 جيغا صالحة 3 أشهر بـ 6000 دج"
  const pattern = /[✅✅]?\s*([\d.]+)\s*جيغا\s*(?:صالحة|لمدة)?\s*([\d٠-٩]+\s*(?:يوم[اً]?|أشهر|شهر|أيام))\s*(?:بـ|بسعر|مقابل|:)?\s*([\d\s]+)\s*(?:دج|DA)/gmu
  let m: RegExpExecArray | null
  const seen = new Set<string>()

  while ((m = pattern.exec(pageText)) !== null) {
    const dataGB = parseFloat(m[1])
    const validityDays = parseArabicDays(m[2])
    const priceDA = parseInt(m[3].replace(/\s/g, '').replace(/[٠-٩]/g, d => String('٠١٢٣٤٥٦٧٨٩'.indexOf(d))))
    if (!dataGB || !priceDA) continue

    const key = `${priceDA}-${dataGB}`
    if (seen.has(key)) continue
    seen.add(key)

    const label = validityDays === 30 ? 'Monthly' : validityDays === 90 ? '3 Months' : validityDays === 180 ? '6 Months' : `${validityDays}d`
    offers.push({
      name: `Navigui Internet ${label} ${priceDA} DA`,
      type: OfferType.DATA_ONLY,
      priceDA,
      dataGB,
      voiceMinutes: 0,
      smsCount: 0,
      validityDays,
      network: '4G',
      features: ['Data rollover (6-month window)', 'Free WhatsApp & Facebook'],
      sourceUrl: pageUrl,
    })
  }

  return offers
}

// ── Main scraper entry point ──────────────────────────────────────────────────
export async function scrapeMobilis(emit: Emit = () => {}): Promise<ScrapedOffer[]> {
  emit('INFO', 'Fetching Mobilis offers from mobilis.dz')
  const liveOffers: ScrapedOffer[] = []
  const liveScrapedFamilies: Set<string> = new Set()

  // ── Pass Internet ─────────────────────────────────────────────────────────
  const passUrl = 'https://mobilis.dz/passinternet'
  const passHtml = await fetchPage(passUrl)
  if (passHtml) {
    const $ = cheerio.load(passHtml)
    const parsed = parseItemPriceCards($, passUrl, 'Mobilis Pass Internet', OfferType.DATA_ONLY)
    if (parsed.length > 0) {
      liveOffers.push(...parsed)
      emit('OK', `Pass Internet: ${parsed.length} offers scraped live`)
      liveScrapedFamilies.add('passinternet')
    } else {
      emit('WARN', 'Pass Internet: page fetched but no cards — using fallback')
    }
  } else {
    emit('WARN', 'Pass Internet: unreachable — using fallback')
  }

  // ── MobiNet Plus ──────────────────────────────────────────────────────────
  const mobinetPlusUrl = 'https://mobilis.dz/mobinet_plus'
  const mobinetPlusHtml = await fetchPage(mobinetPlusUrl)
  if (mobinetPlusHtml) {
    const $ = cheerio.load(mobinetPlusHtml)
    const parsed = parseItemPriceCards($, mobinetPlusUrl, 'MobiNet Plus', OfferType.DATA_ONLY)
    if (parsed.length > 0) {
      liveOffers.push(...parsed)
      emit('OK', `MobiNet Plus: ${parsed.length} offers scraped live`)
      liveScrapedFamilies.add('mobinet_plus')
    } else {
      emit('WARN', 'MobiNet Plus: no cards parsed — using fallback')
    }
  } else {
    emit('WARN', 'MobiNet Plus: unreachable — using fallback')
  }

  // ── MobiNet ───────────────────────────────────────────────────────────────
  const mobinetUrl = 'https://mobilis.dz/mobinet'
  const mobinetHtml = await fetchPage(mobinetUrl)
  if (mobinetHtml) {
    const $ = cheerio.load(mobinetHtml)
    const parsed = parseItemPriceCards($, mobinetUrl, 'MobiNet', OfferType.DATA_ONLY)
    if (parsed.length > 0) {
      liveOffers.push(...parsed)
      emit('OK', `MobiNet: ${parsed.length} offers scraped live`)
      liveScrapedFamilies.add('mobinet')
    } else {
      emit('WARN', 'MobiNet: no cards parsed — using fallback')
    }
  } else {
    emit('WARN', 'MobiNet: unreachable — using fallback')
  }

  // ── Navigui Internet ──────────────────────────────────────────────────────
  const naviguiUrl = 'https://mobilis.dz/naviguiinternet'
  const naviguiHtml = await fetchPage(naviguiUrl)
  if (naviguiHtml) {
    const $ = cheerio.load(naviguiHtml)
    const parsed = parseNaviguiText($, naviguiUrl)
    if (parsed.length > 0) {
      liveOffers.push(...parsed)
      emit('OK', `Navigui Internet: ${parsed.length} offers scraped live`)
      liveScrapedFamilies.add('naviguiinternet')
    } else {
      emit('WARN', 'Navigui Internet: no pricing found in page text — using fallback')
    }
  } else {
    emit('WARN', 'Navigui Internet: unreachable — using fallback')
  }

  // ── Revolution plans (image-only — always use verified dataset) ───────────
  emit('WARN', 'Revolution Prepaid: image-only carousel, no parseable text — using fallback')
  emit('WARN', 'Revolution Control: image-only carousel, no parseable text — using fallback')
  emit('WARN', 'Revolution Postpaid: image-only carousel, no parseable text — using fallback')

  // Merge live with fallback for families that weren't scraped
  const fallback = getMobilisFallbackOffers().filter(o => {
    if (o.sourceUrl.includes('passinternet') && liveScrapedFamilies.has('passinternet')) return false
    if (o.sourceUrl.includes('mobinet_plus') && liveScrapedFamilies.has('mobinet_plus')) return false
    if (o.sourceUrl.includes('mobinet') && !o.sourceUrl.includes('mobinet_plus') && liveScrapedFamilies.has('mobinet')) return false
    if (o.sourceUrl.includes('naviguiinternet') && liveScrapedFamilies.has('naviguiinternet')) return false
    return true
  })

  const result = [...liveOffers, ...fallback]
  emit('OK', `Total: ${result.length} Mobilis offers (${liveOffers.length} live, ${fallback.length} from verified dataset)`)
  return result
}

// ── Fallback verified dataset (Revolution plans + any failed live pages) ──────
function getMobilisFallbackOffers(): ScrapedOffer[] {
  return [
    // ── Revolution Prepaid ────────────────────────────────────────────────────
    { name: 'Mobilis Revolution Prepaid 500', type: OfferType.PREPAID, priceDA: 500, dataGB: 8, voiceMinutes: -1, smsCount: -1, validityDays: 30, network: '4G/5G', features: ['Unlimited Mobilis calls', 'Unlimited Mobilis SMS', 'Unified MU credit system', 'MobiSpace app management', '5G compatible'], sourceUrl: 'https://mobilis.dz/revolution_prepaid' },
    { name: 'Mobilis Revolution Prepaid 1000', type: OfferType.PREPAID, priceDA: 1000, dataGB: 18, voiceMinutes: -1, smsCount: -1, validityDays: 30, network: '4G/5G', features: ['Unlimited Mobilis calls', 'Unlimited Mobilis SMS', 'Unified MU credit', '200 MU renewal bonus', 'Data rollover', '5G compatible'], sourceUrl: 'https://mobilis.dz/revolution_prepaid' },
    { name: 'Mobilis Revolution Prepaid 1500', type: OfferType.PREPAID, priceDA: 1500, dataGB: 30, voiceMinutes: -1, smsCount: -1, validityDays: 30, network: '4G/5G', features: ['Unlimited Mobilis calls', 'Unlimited Mobilis SMS', 'Unified MU credit', '200 MU renewal bonus', 'Data rollover', '5G compatible'], sourceUrl: 'https://mobilis.dz/revolution_prepaid' },
    { name: 'Mobilis Revolution Prepaid 2000', type: OfferType.PREPAID, priceDA: 2000, dataGB: 45, voiceMinutes: -1, smsCount: -1, validityDays: 30, network: '4G/5G', features: ['Unlimited Mobilis calls', 'Unlimited Mobilis SMS', 'Unified MU credit', '200 MU renewal bonus', 'Data rollover', '5G compatible'], sourceUrl: 'https://mobilis.dz/revolution_prepaid' },
    { name: 'Mobilis Revolution Prepaid 3000', type: OfferType.PREPAID, priceDA: 3000, dataGB: 70, voiceMinutes: -1, smsCount: -1, validityDays: 30, network: '4G/5G', features: ['Unlimited calls (all networks)', 'Unlimited SMS', 'Unified MU credit', '200 MU renewal bonus', 'Data rollover', '5G compatible'], sourceUrl: 'https://mobilis.dz/revolution_prepaid' },
    // ── Revolution Control ────────────────────────────────────────────────────
    { name: 'Mobilis Revolution Control 1000', type: OfferType.PREPAID, priceDA: 1000, dataGB: 18, voiceMinutes: -1, smsCount: -1, validityDays: 30, network: '4G/5G', features: ['Unlimited Mobilis calls', 'Unlimited Mobilis SMS', 'Control plan', '250 MU renewal bonus', 'KeepOn MU reserve', '5G compatible'], sourceUrl: 'https://mobilis.dz/revolution_control' },
    { name: 'Mobilis Revolution Control 2000', type: OfferType.PREPAID, priceDA: 2000, dataGB: 45, voiceMinutes: -1, smsCount: -1, validityDays: 30, network: '4G/5G', features: ['Unlimited Mobilis calls', 'Unlimited Mobilis SMS', 'Control plan', '250 MU renewal bonus', 'KeepOn MU reserve', 'Data rollover', '5G compatible'], sourceUrl: 'https://mobilis.dz/revolution_control' },
    { name: 'Mobilis Revolution Control 3000', type: OfferType.PREPAID, priceDA: 3000, dataGB: 70, voiceMinutes: -1, smsCount: -1, validityDays: 30, network: '4G/5G', features: ['Unlimited calls (all networks)', 'Unlimited SMS', 'Control plan', '250 MU renewal bonus', 'KeepOn MU reserve', 'Data rollover', '5G compatible'], sourceUrl: 'https://mobilis.dz/revolution_control' },
    // ── Revolution Postpaid ───────────────────────────────────────────────────
    { name: 'Mobilis Revolution Postpaid 1500', type: OfferType.POSTPAID, priceDA: 1500, dataGB: 30, voiceMinutes: -1, smsCount: -1, validityDays: 30, network: '4G/5G', features: ['Unlimited Mobilis calls', 'Unlimited Mobilis SMS', 'Monthly plan', '300 MU upgrade bonus', 'KeepOn MU reserve', '5G compatible'], sourceUrl: 'https://mobilis.dz/revolution_postpaid' },
    { name: 'Mobilis Revolution Postpaid 2000', type: OfferType.POSTPAID, priceDA: 2000, dataGB: 50, voiceMinutes: -1, smsCount: -1, validityDays: 30, network: '4G/5G', features: ['Unlimited Mobilis calls', 'Unlimited Mobilis SMS', 'Monthly plan', '300 MU upgrade bonus', 'KeepOn MU reserve', 'Data rollover', '5G compatible'], sourceUrl: 'https://mobilis.dz/revolution_postpaid' },
    { name: 'Mobilis Revolution Postpaid 3000', type: OfferType.POSTPAID, priceDA: 3000, dataGB: 80, voiceMinutes: -1, smsCount: -1, validityDays: 30, network: '4G/5G', features: ['Unlimited calls (all networks)', 'Unlimited SMS', 'Monthly plan', '300 MU upgrade bonus', 'KeepOn MU reserve', 'Data rollover', '5G compatible'], sourceUrl: 'https://mobilis.dz/revolution_postpaid' },
    { name: 'Mobilis Revolution Postpaid 4000', type: OfferType.POSTPAID, priceDA: 4000, dataGB: 120, voiceMinutes: -1, smsCount: -1, validityDays: 30, network: '4G/5G', features: ['Unlimited calls (all networks)', 'Unlimited SMS', 'Monthly plan', '300 MU upgrade bonus', 'KeepOn MU reserve', 'Data rollover', '5G compatible'], sourceUrl: 'https://mobilis.dz/revolution_postpaid' },
    // ── MobiNet Plus (fallback) ───────────────────────────────────────────────
    { name: 'MobiNet Plus Monthly', type: OfferType.DATA_ONLY, priceDA: 1500, dataGB: 60, voiceMinutes: 0, smsCount: 0, validityDays: 30, network: '4G', features: ['Unlimited YouTube after quota', 'Modem SIM compatible', 'Share up to 32 users', 'Boost 30 GB add-on (500 DA)'], sourceUrl: 'https://mobilis.dz/mobinet_plus' },
    { name: 'MobiNet Plus 3 Months', type: OfferType.DATA_ONLY, priceDA: 3500, dataGB: 200, voiceMinutes: 0, smsCount: 0, validityDays: 90, network: '4G', features: ['Unlimited YouTube after quota', 'Modem SIM compatible', 'Share up to 32 users'], sourceUrl: 'https://mobilis.dz/mobinet_plus' },
    { name: 'MobiNet Plus 6 Months', type: OfferType.DATA_ONLY, priceDA: 6500, dataGB: 400, voiceMinutes: 0, smsCount: 0, validityDays: 180, network: '4G', features: ['Unlimited YouTube after quota', 'Modem SIM compatible', 'Share up to 32 users', 'Boost 30 GB add-on available'], sourceUrl: 'https://mobilis.dz/mobinet_plus' },
    // ── MobiNet (fallback) ────────────────────────────────────────────────────
    { name: 'MobiNet Monthly', type: OfferType.DATA_ONLY, priceDA: 1500, dataGB: 60, voiceMinutes: 0, smsCount: 0, validityDays: 30, network: '4G', features: ['Unlimited YouTube after quota', 'Modem SIM compatible', 'Share up to 16 users'], sourceUrl: 'https://mobilis.dz/mobinet' },
    { name: 'MobiNet 3 Months', type: OfferType.DATA_ONLY, priceDA: 3500, dataGB: 200, voiceMinutes: 0, smsCount: 0, validityDays: 90, network: '4G', features: ['Unlimited YouTube after quota', 'Modem SIM compatible'], sourceUrl: 'https://mobilis.dz/mobinet' },
    { name: 'MobiNet 6 Months', type: OfferType.DATA_ONLY, priceDA: 6500, dataGB: 400, voiceMinutes: 0, smsCount: 0, validityDays: 180, network: '4G', features: ['Unlimited YouTube after quota', 'Modem SIM compatible', 'Boost 30 GB add-on (500 DA)'], sourceUrl: 'https://mobilis.dz/mobinet' },
    // ── Navigui Internet (fallback) ───────────────────────────────────────────
    { name: 'Navigui Internet Monthly 1000 DA', type: OfferType.DATA_ONLY, priceDA: 1000, dataGB: 10, voiceMinutes: 0, smsCount: 0, validityDays: 30, network: '4G', features: ['Data rollover (6-month window)', 'Free WhatsApp & Facebook'], sourceUrl: 'https://mobilis.dz/naviguiinternet' },
    { name: 'Navigui Internet Monthly 2000 DA', type: OfferType.DATA_ONLY, priceDA: 2000, dataGB: 25, voiceMinutes: 0, smsCount: 0, validityDays: 30, network: '4G', features: ['Data rollover (6-month window)'], sourceUrl: 'https://mobilis.dz/naviguiinternet' },
    { name: 'Navigui Internet 3 Months', type: OfferType.DATA_ONLY, priceDA: 6000, dataGB: 80, voiceMinutes: 0, smsCount: 0, validityDays: 90, network: '4G', features: ['Data rollover'], sourceUrl: 'https://mobilis.dz/naviguiinternet' },
    { name: 'Navigui Internet 6 Months', type: OfferType.DATA_ONLY, priceDA: 15000, dataGB: 300, voiceMinutes: 0, smsCount: 0, validityDays: 180, network: '4G', features: ['Data rollover', 'Balance check via #222*'], sourceUrl: 'https://mobilis.dz/naviguiinternet' },
    // ── Pass Internet (fallback) ──────────────────────────────────────────────
    { name: 'Mobilis Pass Internet 30 DA', type: OfferType.DATA_ONLY, priceDA: 30, dataGB: 0.3, voiceMinutes: 0, smsCount: 0, validityDays: 1, network: '4G', features: ['Free WhatsApp & Facebook', 'Stackable passes'], sourceUrl: 'https://mobilis.dz/passinternet' },
    { name: 'Mobilis Pass Internet 100 DA', type: OfferType.DATA_ONLY, priceDA: 100, dataGB: 1, voiceMinutes: 0, smsCount: 0, validityDays: 1, network: '4G', features: ['Stackable passes'], sourceUrl: 'https://mobilis.dz/passinternet' },
    { name: 'Mobilis Pass Internet 500 DA', type: OfferType.DATA_ONLY, priceDA: 500, dataGB: 4, voiceMinutes: 0, smsCount: 0, validityDays: 7, network: '4G', features: ['Stackable passes'], sourceUrl: 'https://mobilis.dz/passinternet' },
    { name: 'Mobilis Pass Internet 1000 DA', type: OfferType.DATA_ONLY, priceDA: 1000, dataGB: 10, voiceMinutes: 0, smsCount: 0, validityDays: 30, network: '4G', features: ['Stackable passes'], sourceUrl: 'https://mobilis.dz/passinternet' },
    { name: 'Mobilis Pass Internet 2000 DA', type: OfferType.DATA_ONLY, priceDA: 2000, dataGB: 25, voiceMinutes: 0, smsCount: 0, validityDays: 30, network: '4G', features: ['Stackable passes', 'Consumed shortest-expiry first'], sourceUrl: 'https://mobilis.dz/passinternet' },
  ]
}
