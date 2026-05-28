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
import {
  parseGB as parseArabicGB,
  parsePriceDA as parseArabicDA,
  parseValidityDays as parseArabicDays,
  validateOffer,
  type ScrapedOffer as ValidatedOffer,
} from './validate'
import { createBrowserFetcher } from './fetch'

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

function pushIfValid(offers: ScrapedOffer[], offer: ScrapedOffer): void {
  if (validateOffer(offer as ValidatedOffer).valid) offers.push(offer)
}

// ── Parser for div.item_price layout (passinternet, mobinet_plus, mobinet) ────
export function parseItemPriceCards(
  $: cheerio.CheerioAPI,
  pageUrl: string,
  planFamily: string,
  type: OfferType,
): ScrapedOffer[] {
  const offers: ScrapedOffer[] = []

  $('div.item_price').each((_, el) => {
    const card = $(el)

    // Price — use the unit-anchored parser on the whole .pricing-price text.
    // More robust than DOM-traversal-then-text-extract; the parser ignores
    // anything that isn't "<digits> DA" or "<digits> دج".
    const pricingDiv = card.find('.pricing-price')
    let priceDA = parseArabicDA(pricingDiv.text())
    // Fallback: digit-only extraction if no unit marker found (rare layout variant)
    if (!priceDA) {
      const priceText = pricingDiv.clone().find('span').remove().end().text().trim()
      priceDA = parseInt(priceText.replace(/\D/g, ''))
    }
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

    pushIfValid(offers, {
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
export function parseNaviguiText($: cheerio.CheerioAPI, pageUrl: string): ScrapedOffer[] {
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
    pushIfValid(offers, {
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
  // All operators use the same real-browser fetch path for a uniform pipeline.
  const { fetchPage, close } = createBrowserFetcher(emit)
  try {
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
  } finally {
    await close()
  }
}

// ── Fallback verified dataset (Revolution plans + any failed live pages) ──────
function getMobilisFallbackOffers(): ScrapedOffer[] {
  return [
    // ── Revolution Prepaid ────────────────────────────────────────────────────
    // Manually verified 2026-05-28 against mobilis.dz/revolution_prepaid (offers
    // are image-only, read visually). Each tier is a Mobilis-Unit (MU) pool; the
    // dataGB figure is the advertised max internet allocation if the whole pool
    // is spent on data. Calls/SMS toward Mobilis are unlimited on every tier.
    { name: 'Mobilis Revolution Prepaid 100', type: OfferType.PREPAID, priceDA: 100, dataGB: 2, voiceMinutes: -1, smsCount: -1, validityDays: 1, network: '4G/5G', features: ['Unlimited Mobilis calls & SMS', '100 MU pool', '5G compatible'], sourceUrl: 'https://mobilis.dz/revolution_prepaid' },
    { name: 'Mobilis Revolution Prepaid 500', type: OfferType.PREPAID, priceDA: 500, dataGB: 12, voiceMinutes: -1, smsCount: -1, validityDays: 15, network: '4G/5G', features: ['Unlimited Mobilis calls & SMS', '600 MU pool', '5G compatible'], sourceUrl: 'https://mobilis.dz/revolution_prepaid' },
    { name: 'Mobilis Revolution Prepaid 1000', type: OfferType.PREPAID, priceDA: 1000, dataGB: 25, voiceMinutes: -1, smsCount: -1, validityDays: 30, network: '4G/5G', features: ['Unlimited Mobilis calls & SMS', '1250 MU pool', '5G compatible'], sourceUrl: 'https://mobilis.dz/revolution_prepaid' },
    { name: 'Mobilis Revolution Prepaid 1200', type: OfferType.PREPAID, priceDA: 1200, dataGB: 35, voiceMinutes: -1, smsCount: -1, validityDays: 30, network: '4G/5G', features: ['Unlimited Mobilis calls & SMS', 'Unlimited Facebook', '1750 MU pool', '5G compatible'], sourceUrl: 'https://mobilis.dz/revolution_prepaid' },
    { name: 'Mobilis Revolution Prepaid 1500', type: OfferType.PREPAID, priceDA: 1500, dataGB: 55, voiceMinutes: -1, smsCount: -1, validityDays: 30, network: '4G/5G', features: ['Unlimited Mobilis calls & SMS', 'Unlimited Facebook', '2750 MU pool', '5G compatible'], sourceUrl: 'https://mobilis.dz/revolution_prepaid' },
    { name: 'Mobilis Revolution Prepaid 1800', type: OfferType.PREPAID, priceDA: 1800, dataGB: 80, voiceMinutes: -1, smsCount: -1, validityDays: 30, network: '4G/5G', features: ['Unlimited Mobilis calls & SMS', 'Unlimited Facebook', '4000 MU pool', '5G compatible'], sourceUrl: 'https://mobilis.dz/revolution_prepaid' },
    { name: 'Mobilis Revolution Prepaid 2000', type: OfferType.PREPAID, priceDA: 2000, dataGB: 100, voiceMinutes: -1, smsCount: -1, validityDays: 30, network: '4G/5G', features: ['Unlimited calls (all networks)', 'Unlimited Mobilis SMS', 'Unlimited Facebook', '5000 MU pool', '5G compatible'], sourceUrl: 'https://mobilis.dz/revolution_prepaid' },
    { name: 'Mobilis Revolution Prepaid 2500', type: OfferType.PREPAID, priceDA: 2500, dataGB: 130, voiceMinutes: -1, smsCount: -1, validityDays: 30, network: '4G/5G', features: ['Unlimited calls (all networks)', 'Unlimited Mobilis SMS', 'Unlimited Facebook', '6500 MU pool', '5G compatible'], sourceUrl: 'https://mobilis.dz/revolution_prepaid' },
    // ── Revolution Control ────────────────────────────────────────────────────
    // Manually verified 2026-05-28 against mobilis.dz/revolution_control.
    { name: 'Mobilis Revolution Control 1200', type: OfferType.POSTPAID, priceDA: 1200, dataGB: 45, voiceMinutes: -1, smsCount: -1, validityDays: 30, network: '4G/5G', features: ['Unlimited Mobilis calls & SMS', 'Unlimited Facebook', '2250 MU pool', 'Control plan', '5G compatible'], sourceUrl: 'https://mobilis.dz/revolution_control' },
    { name: 'Mobilis Revolution Control 1500', type: OfferType.POSTPAID, priceDA: 1500, dataGB: 70, voiceMinutes: -1, smsCount: -1, validityDays: 30, network: '4G/5G', features: ['Unlimited Mobilis calls & SMS', 'Unlimited Facebook', '3500 MU pool', 'Control plan', '5G compatible'], sourceUrl: 'https://mobilis.dz/revolution_control' },
    { name: 'Mobilis Revolution Control 1800', type: OfferType.POSTPAID, priceDA: 1800, dataGB: 100, voiceMinutes: -1, smsCount: -1, validityDays: 30, network: '4G/5G', features: ['Unlimited Mobilis calls & SMS', 'Unlimited Facebook', '5000 MU pool', 'Control plan', '5G compatible'], sourceUrl: 'https://mobilis.dz/revolution_control' },
    { name: 'Mobilis Revolution Control 2000', type: OfferType.POSTPAID, priceDA: 2000, dataGB: 118, voiceMinutes: -1, smsCount: -1, validityDays: 30, network: '4G/5G', features: ['Unlimited Mobilis calls & SMS', 'Unlimited Facebook', '5900 MU pool', 'Control plan', '5G compatible'], sourceUrl: 'https://mobilis.dz/revolution_control' },
    { name: 'Mobilis Revolution Control 2500', type: OfferType.POSTPAID, priceDA: 2500, dataGB: 150, voiceMinutes: -1, smsCount: -1, validityDays: 30, network: '4G/5G', features: ['Unlimited calls (all networks)', 'Unlimited Mobilis SMS', 'Unlimited Facebook', '7500 MU pool', 'Control plan', '5G compatible'], sourceUrl: 'https://mobilis.dz/revolution_control' },
    { name: 'Mobilis Revolution Control 3000', type: OfferType.POSTPAID, priceDA: 3000, dataGB: 188, voiceMinutes: -1, smsCount: -1, validityDays: 30, network: '4G/5G', features: ['Unlimited calls (all networks)', 'Unlimited Mobilis SMS', 'Unlimited Facebook', '9400 MU pool', 'Control plan', '5G compatible'], sourceUrl: 'https://mobilis.dz/revolution_control' },
    // ── Revolution Postpaid ───────────────────────────────────────────────────
    // Only the 1500 DA tier could be read on 2026-05-28 (the rest sit behind a
    // carousel that did not render); the unverified tiers were removed rather
    // than kept as unconfirmed data.
    { name: 'Mobilis Revolution Postpaid 1500', type: OfferType.POSTPAID, priceDA: 1500, dataGB: 60, voiceMinutes: -1, smsCount: -1, validityDays: 30, network: '4G/5G', features: ['Unlimited Mobilis calls & SMS', 'Unlimited Facebook', '3000 MU pool', 'Monthly plan', '5G compatible'], sourceUrl: 'https://mobilis.dz/revolution_postpaid' },
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
