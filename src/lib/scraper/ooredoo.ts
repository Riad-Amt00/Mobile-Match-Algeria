/**
 * Ooredoo Algeria Scraper — fetches live data from ooredoo.dz using HTTP + cheerio.
 * Falls back to the verified dataset if the website is unreachable or the DOM
 * structure has changed.
 *
 * Live: Ooredoo 500, Scholar, Dima, N'YOOZ, POP, Forfait Internet
 * Fallback: entries whose live scrape returns 0 results
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

const BASE = 'https://www.ooredoo.dz'
const HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
  'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
  'Accept-Language': 'fr-FR,fr;q=0.9,en;q=0.8',
}

async function fetchPage(url: string): Promise<string | null> {
  try {
    const res = await fetch(url, {
      headers: HEADERS,
      signal: AbortSignal.timeout(20000),
    })
    if (!res.ok) return null
    return await res.text()
  } catch {
    return null
  }
}

function parseGB(text: string): number {
  const clean = text.toLowerCase().replace(/\s+/g, ' ').trim()
  const go = clean.match(/([\d.,]+)\s*go/i)
  if (go) return parseFloat(go[1].replace(',', '.'))
  const mb = clean.match(/([\d.,]+)\s*m[bo]/i)
  if (mb) return parseFloat(mb[1].replace(',', '.')) / 1024
  return 0
}

function parseValidity(text: string): number {
  const weeks = text.match(/(\d+)\s*semaines?/i)
  if (weeks) return parseInt(weeks[1]) * 7
  const months = text.match(/(\d+)\s*mois/i)
  if (months) return parseInt(months[1]) * 30
  const days = text.match(/(\d+)\s*jours?/i)
  if (days) return parseInt(days[1])
  return 30
}

// ── Parser for Ooredoo 500 / Dima layout (swiper-slide.s-relative) ────────────
function parseOoredoo500Cards($: cheerio.CheerioAPI, pageUrl: string, planFamily: string, type: OfferType): ScrapedOffer[] {
  const offers: ScrapedOffer[] = []

  $('div.swiper-slide.s-relative').each((_, el) => {
    const card = $(el)

    // Name heading: "Forfait 1500" or "Dima 500" — price embedded in name
    const headingText = card.find('.s-font-extrabold.s-flex-row p').first().text().trim()
    let priceDA = parseInt((headingText.match(/\d[\d\s]*/)?.[0] || '').replace(/\s/g, ''))

    // Fallback for headings without digits (e.g. "Dima"): look for price in other elements
    if (!priceDA || isNaN(priceDA)) {
      // Second <p> in the extrabold row
      const secondP = card.find('.s-font-extrabold.s-flex-row p').eq(1)
      if (secondP.length) {
        const m = secondP.text().trim().match(/\d[\d\s]*/)
        if (m) priceDA = parseInt(m[0].replace(/\s/g, ''))
      }
    }
    if (!priceDA || isNaN(priceDA)) {
      // Any bold/prominent element with a DA or standalone number
      card.find('.s-font-bold, .s-font-extrabold, .card-price').each((_, p) => {
        if (priceDA) return
        const text = $(p).text().replace(/\s+/g, ' ').trim()
        const daMatch = text.match(/(\d[\d\s]+)\s*DA/i)
        if (daMatch) { priceDA = parseInt(daMatch[1].replace(/\s/g, '')); return }
        const numOnly = text.match(/^(\d+)$/)
        if (numOnly) {
          const candidate = parseInt(numOnly[1])
          if (candidate >= 30 && candidate <= 10000) priceDA = candidate
        }
      })
    }

    if (!priceDA || isNaN(priceDA)) return

    // Validity: "Valable 4 semaines" / "Valable 30 jours"
    const validityText = card.find('.s-font-semibold.s-text-sm').first().text().trim()
    const validityDays = parseValidity(validityText)

    // Data: red colored element "40Go internet"
    const dataText = card.find('.s-text-D6001C').first().text().trim()
    const dataGB = parseGB(dataText)
    if (dataGB <= 0) return

    const features: string[] = []
    let voiceMinutes = 0
    let smsCount = 0
    card.find('.s-grid p').each((_, p) => {
      const text = $(p).text().trim()
      if (!text) return
      features.push(text)
      if (/illimit/i.test(text) && /ooredoo|r.seaux|tous/i.test(text)) voiceMinutes = -1
      if (/sms/i.test(text)) smsCount = -1
    })

    offers.push({ name: `${planFamily} ${priceDA}`, type, priceDA, dataGB, voiceMinutes, smsCount, validityDays, network: '4G/5G', features, sourceUrl: pageUrl })
  })
  return offers
}

// ── Parser for Scholar / N'YOOZ layout (swiper-slide.solid.relative) ──────────
function parseOoredooScholarCards($: cheerio.CheerioAPI, pageUrl: string, planFamily: string, type: OfferType): ScrapedOffer[] {
  const offers: ScrapedOffer[] = []

  $('div.swiper-slide.solid.relative').each((_, el) => {
    const card = $(el)

    // Name heading: "Forfait 500" or "N'YOOZ 1500"
    const headingText = card.find('.heading-text').first().text().trim()
    const priceDA = parseInt((headingText.match(/\d[\d\s]*/)?.[0] || '').replace(/\s/g, ''))
    if (!priceDA || isNaN(priceDA)) return

    // Validity
    const validityText = card.find('.feature-text.font-semibold').first().text().trim()
    const validityDays = parseValidity(validityText)

    // Data: red colored main feature
    const dataText = card.find('.main-feture-title, .text-brand-red-4').first().text().trim()
    const dataGB = parseGB(dataText)
    if (dataGB <= 0) return

    const features: string[] = []
    let voiceMinutes = 0
    let smsCount = 0
    card.find('.font-notosans.feature-text').each((_, p) => {
      const text = $(p).text().trim()
      if (!text) return
      features.push(text)
      if (/illimit/i.test(text) && /ooredoo|r.seaux|tous/i.test(text)) voiceMinutes = -1
      if (/gratuit.*ooredoo|ooredoo.*gratuit/i.test(text)) voiceMinutes = -1
      if (/sms/i.test(text)) smsCount = -1
    })

    offers.push({ name: `${planFamily} ${priceDA}`, type, priceDA, dataGB, voiceMinutes, smsCount, validityDays, network: '4G/5G', features, sourceUrl: pageUrl })
  })
  return offers
}

// ── Parser for POP / Internet layout (swiper-slide.a-h-full) ─────────────────
// Red header div (a-bg-ED1C24) contains name+price: "Ooredoo POP 1500"
// Data from element with a-text-ED1C24: "50Go"
// Price also from .card_price if heading parse fails
function parseOoredooPopCards($: cheerio.CheerioAPI, pageUrl: string, planFamily: string, type: OfferType): ScrapedOffer[] {
  const offers: ScrapedOffer[] = []

  $('div.swiper-slide.a-h-full, div.swiper-slide[class*="a-h-full"]').each((_, el) => {
    const card = $(el)

    // Price from red header: "Ooredoo POP 1500" or "Ooredoo Internet 1000"
    const headerText = card.find('[class*="a-bg-ED1C24"], [class*="bg-red"], .card-header, .offer-header').first().text().trim()
    let priceDA = parseInt((headerText.match(/\d[\d\s]*/)?.[0] || '').replace(/\s/g, ''))

    // Fallback: .card_price or any element matching X DA pattern
    if (!priceDA || isNaN(priceDA)) {
      const cardPrice = card.find('.card_price, .price, [class*="price"]').first()
      if (cardPrice.length) {
        const m = cardPrice.text().trim().match(/\d[\d\s]*/)
        if (m) priceDA = parseInt(m[0].replace(/\s/g, ''))
      }
    }
    if (!priceDA || isNaN(priceDA)) return

    // Data from red text element
    const dataText = card.find('[class*="a-text-ED1C24"], [class*="text-red"], .data-amount').first().text().trim()
    const dataGB = parseGB(dataText || card.text())
    if (dataGB <= 0) return

    // Validity from footer or validity text
    const validityText = card.find('.validity, .offer-validity, footer, [class*="validity"]').first().text().trim()
    const validityDays = parseValidity(validityText || card.find('p').last().text().trim())

    const features: string[] = []
    let voiceMinutes = 0
    let smsCount = 0
    card.find('p, li, [class*="feature"]').each((_, p) => {
      const text = $(p).text().trim()
      if (!text || text === headerText) return
      features.push(text)
      if (/illimit/i.test(text) && /ooredoo|r.seaux|tous/i.test(text)) voiceMinutes = -1
      if (/sms/i.test(text)) smsCount = -1
    })

    offers.push({ name: `${planFamily} ${priceDA}`, type, priceDA, dataGB, voiceMinutes, smsCount, validityDays, network: '4G/5G', features: features.slice(0, 5), sourceUrl: pageUrl })
  })
  return offers
}

// ── Main scraper entry point ──────────────────────────────────────────────────
export async function scrapeOoredoo(emit: Emit = () => {}): Promise<ScrapedOffer[]> {
  emit('INFO', 'Fetching Ooredoo offers from ooredoo.dz')
  const liveOffers: ScrapedOffer[] = []
  const scrapedFamilies = new Set<string>()

  // ── Ooredoo 500 ────────────────────────────────────────────────────────────
  const url500 = `${BASE}/particuliers/offres-mobiles/ooredoo-500`
  const html500 = await fetchPage(url500)
  if (html500) {
    const $ = cheerio.load(html500)
    const parsed = parseOoredoo500Cards($, url500, 'Ooredoo 500', OfferType.PREPAID)
    if (parsed.length > 0) {
      liveOffers.push(...parsed)
      emit('OK', `Ooredoo 500: ${parsed.length} offers scraped live`)
      scrapedFamilies.add('Ooredoo 500')
    } else {
      emit('WARN', 'Ooredoo 500: page fetched but no cards found — using fallback')
    }
  } else {
    emit('WARN', 'Ooredoo 500: unreachable — using fallback')
  }

  // ── Ooredoo Scholar ────────────────────────────────────────────────────────
  const urlScholar = `${BASE}/fr/particuliers/offres-mobiles/ooredoo-scholar`
  const htmlScholar = await fetchPage(urlScholar)
  if (htmlScholar) {
    const $ = cheerio.load(htmlScholar)
    const parsed = parseOoredooScholarCards($, urlScholar, 'Ooredoo Scholar', OfferType.PREPAID)
    if (parsed.length > 0) {
      liveOffers.push(...parsed)
      emit('OK', `Ooredoo Scholar: ${parsed.length} offers scraped live`)
      scrapedFamilies.add('Ooredoo Scholar')
    } else {
      emit('WARN', 'Ooredoo Scholar: page fetched but no cards found — using fallback')
    }
  } else {
    emit('WARN', 'Ooredoo Scholar: unreachable — using fallback')
  }

  // ── Dima Ooredoo ──────────────────────────────────────────────────────────
  const urlDima = `${BASE}/fr/particuliers/offres-mobiles/dima-ooredoo`
  const htmlDima = await fetchPage(urlDima)
  if (htmlDima) {
    const $ = cheerio.load(htmlDima)
    const parsed = parseOoredoo500Cards($, urlDima, 'Dima Ooredoo', OfferType.PREPAID)
    if (parsed.length > 0) {
      liveOffers.push(...parsed)
      emit('OK', `Dima Ooredoo: ${parsed.length} offers scraped live`)
      scrapedFamilies.add('Dima Ooredoo')
    } else {
      emit('WARN', 'Dima Ooredoo: no cards found — using fallback')
    }
  } else {
    emit('WARN', 'Dima Ooredoo: unreachable — using fallback')
  }

  // ── N'YOOZ ────────────────────────────────────────────────────────────────
  const urlNyooz = `${BASE}/fr/particuliers/offres-mobiles/n-yooz`
  const htmlNyooz = await fetchPage(urlNyooz)
  if (htmlNyooz) {
    const $ = cheerio.load(htmlNyooz)
    // N'YOOZ heading is "N'YOOZ 1500" — Scholar parser extracts digits from heading
    const parsed = parseOoredooScholarCards($, urlNyooz, "N'YOOZ", OfferType.PREPAID)
    if (parsed.length > 0) {
      liveOffers.push(...parsed)
      emit('OK', `N'YOOZ: ${parsed.length} offers scraped live`)
      scrapedFamilies.add("N'YOOZ")
    } else {
      emit('WARN', "N'YOOZ: no cards found — using fallback")
    }
  } else {
    emit('WARN', "N'YOOZ: unreachable — using fallback")
  }

  // ── Ooredoo POP (postpaid) ────────────────────────────────────────────────
  const urlPop = `${BASE}/fr/particuliers/offres-mobiles/ooredoo-pop`
  const htmlPop = await fetchPage(urlPop)
  if (htmlPop) {
    const $ = cheerio.load(htmlPop)
    const parsed = parseOoredooPopCards($, urlPop, 'Ooredoo POP', OfferType.POSTPAID)
    if (parsed.length > 0) {
      liveOffers.push(...parsed)
      emit('OK', `Ooredoo POP: ${parsed.length} offers scraped live`)
      scrapedFamilies.add('Ooredoo POP')
    } else {
      emit('WARN', 'Ooredoo POP: no cards found — using fallback')
    }
  } else {
    emit('WARN', 'Ooredoo POP: unreachable — using fallback')
  }

  // ── Ooredoo Internet (data-only) ──────────────────────────────────────────
  const urlInternet = `${BASE}/fr/particuliers/internet/ooredoo-internet`
  const htmlInternet = await fetchPage(urlInternet)
  if (htmlInternet) {
    const $ = cheerio.load(htmlInternet)
    const parsed = parseOoredooPopCards($, urlInternet, 'Ooredoo Internet', OfferType.DATA_ONLY)
    if (parsed.length > 0) {
      liveOffers.push(...parsed)
      emit('OK', `Ooredoo Internet: ${parsed.length} offers scraped live`)
      scrapedFamilies.add('Ooredoo Internet')
    } else {
      emit('WARN', 'Ooredoo Internet: no cards found — using fallback')
    }
  } else {
    emit('WARN', 'Ooredoo Internet: unreachable — using fallback')
  }

  // ── Merge live with fallback for unsuccesfully scraped families ────────────
  const filteredFallback = getOoredooFallbackOffers().filter(o => {
    if (o.name.startsWith('Dima Ooredoo') && scrapedFamilies.has('Dima Ooredoo')) return false
    if (o.name.startsWith("N'YOOZ") && scrapedFamilies.has("N'YOOZ")) return false
    if (o.name.startsWith('Ooredoo Scholar') && scrapedFamilies.has('Ooredoo Scholar')) return false
    if (o.name.startsWith('Ooredoo 500') && scrapedFamilies.has('Ooredoo 500')) return false
    if (o.name.startsWith('Ooredoo POP') && scrapedFamilies.has('Ooredoo POP')) return false
    if ((o.name.startsWith('Ooredoo Forfait Internet') || o.name.startsWith('Ooredoo Internet')) && scrapedFamilies.has('Ooredoo Internet')) return false
    return true
  })

  const result = [...liveOffers, ...filteredFallback]
  emit('OK', `Total: ${result.length} Ooredoo offers (${liveOffers.length} live, ${filteredFallback.length} from fallback)`)
  return result
}

// ── Fallback verified dataset ─────────────────────────────────────────────────
function getOoredooFallbackOffers(): ScrapedOffer[] {
  const BASE_URL = 'https://www.ooredoo.dz/fr/particuliers/offres-mobiles/'
  return [
    // ── Dima Ooredoo (Prepaid) ───────────────────────────────────────────────
    { name: 'Dima Ooredoo 50', type: OfferType.PREPAID, priceDA: 50, dataGB: 0.2, voiceMinutes: 30, smsCount: 0, validityDays: 1, network: '4G/5G', features: ['5G compatible'], sourceUrl: `${BASE_URL}dima-ooredoo` },
    { name: 'Dima Ooredoo 100', type: OfferType.PREPAID, priceDA: 100, dataGB: 0.5, voiceMinutes: -1, smsCount: -1, validityDays: 1, network: '4G/5G', features: ['Unlimited calls (all networks)', 'Free Facebook & Messenger', '5G compatible'], sourceUrl: `${BASE_URL}dima-ooredoo` },
    { name: 'Dima Ooredoo 500', type: OfferType.PREPAID, priceDA: 500, dataGB: 3, voiceMinutes: 100, smsCount: 50, validityDays: 15, network: '4G/5G', features: ['Unlimited Ooredoo calls', 'ANAZIK music subscription', '5G compatible'], sourceUrl: `${BASE_URL}dima-ooredoo` },
    { name: 'Dima Ooredoo 750', type: OfferType.PREPAID, priceDA: 750, dataGB: 10, voiceMinutes: -1, smsCount: 0, validityDays: 14, network: '4G/5G', features: ['Unlimited Ooredoo calls', 'Free Facebook', '5G compatible'], sourceUrl: `${BASE_URL}dima-ooredoo` },
    { name: 'Dima Ooredoo 1200', type: OfferType.PREPAID, priceDA: 1200, dataGB: 8, voiceMinutes: 100, smsCount: 120, validityDays: 30, network: '4G/5G', features: ['Unlimited Ooredoo calls', 'ANAZIK music subscription', '5G compatible'], sourceUrl: `${BASE_URL}dima-ooredoo` },
    { name: 'Dima Ooredoo 1500', type: OfferType.PREPAID, priceDA: 1500, dataGB: 30, voiceMinutes: 150, smsCount: 150, validityDays: 30, network: '4G/5G', features: ['Unlimited Ooredoo calls', 'ANAFLIX film/series subscription', '5G compatible'], sourceUrl: `${BASE_URL}dima-ooredoo` },
    { name: 'Dima Ooredoo 2000', type: OfferType.PREPAID, priceDA: 2000, dataGB: 50, voiceMinutes: 300, smsCount: 200, validityDays: 30, network: '4G/5G', features: ['Unlimited Ooredoo calls', 'ANAZIK music subscription', 'ANAFLIX film/series subscription', '5G compatible'], sourceUrl: `${BASE_URL}dima-ooredoo` },
    { name: 'Dima Ooredoo 2500', type: OfferType.PREPAID, priceDA: 2500, dataGB: 100, voiceMinutes: -1, smsCount: 100, validityDays: 30, network: '4G/5G', features: ['Unlimited calls (all networks)', 'ANAZIK music subscription', 'ANAFLIX film/series subscription', 'SHAHID subscription', '5G compatible'], sourceUrl: `${BASE_URL}dima-ooredoo` },
    { name: 'Dima Ooredoo 4000', type: OfferType.PREPAID, priceDA: 4000, dataGB: 200, voiceMinutes: -1, smsCount: 200, validityDays: 30, network: '4G/5G', features: ['Unlimited calls (all networks)', '5G compatible'], sourceUrl: `${BASE_URL}dima-ooredoo` },
    // ── N'YOOZ (Prepaid) ─────────────────────────────────────────────────────
    { name: "N'YOOZ 30", type: OfferType.PREPAID, priceDA: 30, dataGB: 0.2, voiceMinutes: 0, smsCount: 0, validityDays: 1, network: '4G/5G', features: ['Unlimited Facebook & Messenger', 'Free Snapchat', '5G compatible'], sourceUrl: `${BASE_URL}n-yooz` },
    { name: "N'YOOZ 100", type: OfferType.PREPAID, priceDA: 100, dataGB: 1, voiceMinutes: 10, smsCount: -1, validityDays: 1, network: '4G/5G', features: ['Unlimited Ooredoo calls', 'Free Facebook & Messenger', 'Free Snapchat', '5G compatible'], sourceUrl: `${BASE_URL}n-yooz` },
    { name: "N'YOOZ 200", type: OfferType.PREPAID, priceDA: 200, dataGB: 2.5, voiceMinutes: 40, smsCount: -1, validityDays: 1, network: '4G/5G', features: ['Unlimited Ooredoo calls', 'Free Facebook & Messenger', 'Free Snapchat', 'Free YouTube', '5G compatible'], sourceUrl: `${BASE_URL}n-yooz` },
    { name: "N'YOOZ 300", type: OfferType.PREPAID, priceDA: 300, dataGB: 3, voiceMinutes: 30, smsCount: 30, validityDays: 14, network: '4G/5G', features: ['Free Snapchat', 'Double data via My Ooredoo app', '5G compatible'], sourceUrl: `${BASE_URL}n-yooz` },
    { name: "N'YOOZ 500", type: OfferType.PREPAID, priceDA: 500, dataGB: 7, voiceMinutes: 50, smsCount: 50, validityDays: 30, network: '4G/5G', features: ['Free Snapchat', '2 GB bonus included', '5G compatible'], sourceUrl: `${BASE_URL}n-yooz` },
    { name: "N'YOOZ 1000", type: OfferType.PREPAID, priceDA: 1000, dataGB: 15, voiceMinutes: 100, smsCount: -1, validityDays: 30, network: '4G/5G', features: ['Unlimited Ooredoo calls', 'Free Snapchat', '5G compatible'], sourceUrl: `${BASE_URL}n-yooz` },
    { name: "N'YOOZ 1500", type: OfferType.PREPAID, priceDA: 1500, dataGB: 30, voiceMinutes: 150, smsCount: -1, validityDays: 30, network: '4G/5G', features: ['Unlimited Ooredoo calls', 'Free Facebook & Messenger', 'Free Snapchat', '5G compatible'], sourceUrl: `${BASE_URL}n-yooz` },
    // ── Ooredoo Scholar (Student Prepaid) ────────────────────────────────────
    { name: 'Ooredoo Scholar 500', type: OfferType.PREPAID, priceDA: 500, dataGB: 9, voiceMinutes: -1, smsCount: 0, validityDays: 28, network: '4G/5G', features: ['Unlimited Ooredoo calls', 'Student offer', '2 GB app bonus', '5G compatible'], sourceUrl: `${BASE_URL}ooredoo-scholar` },
    { name: 'Ooredoo Scholar 1000', type: OfferType.PREPAID, priceDA: 1000, dataGB: 25, voiceMinutes: -1, smsCount: 0, validityDays: 28, network: '4G/5G', features: ['Unlimited Ooredoo calls', 'Student offer', '5 GB app bonus', '5G compatible'], sourceUrl: `${BASE_URL}ooredoo-scholar` },
    { name: 'Ooredoo Scholar 1500', type: OfferType.PREPAID, priceDA: 1500, dataGB: 60, voiceMinutes: -1, smsCount: 0, validityDays: 28, network: '4G/5G', features: ['Unlimited Ooredoo calls', 'Student offer', '10 GB app bonus', '5G compatible'], sourceUrl: `${BASE_URL}ooredoo-scholar` },
    { name: 'Ooredoo Scholar 2000', type: OfferType.PREPAID, priceDA: 2000, dataGB: 90, voiceMinutes: -1, smsCount: 0, validityDays: 28, network: '4G/5G', features: ['Unlimited Ooredoo calls', 'Student offer', '10 GB app bonus', '5G compatible'], sourceUrl: `${BASE_URL}ooredoo-scholar` },
    { name: 'Ooredoo Scholar 2500', type: OfferType.PREPAID, priceDA: 2500, dataGB: 140, voiceMinutes: -1, smsCount: 100, validityDays: 28, network: '4G/5G', features: ['Unlimited calls (all networks)', 'Student offer', '20 GB app bonus', '5G compatible', 'Multi-month discount available'], sourceUrl: `${BASE_URL}ooredoo-scholar` },
    // ── Ooredoo 500 (Prepaid) ────────────────────────────────────────────────
    { name: 'Ooredoo 500', type: OfferType.PREPAID, priceDA: 500, dataGB: 5, voiceMinutes: -1, smsCount: 0, validityDays: 28, network: '4G/5G', features: ['Unlimited Ooredoo calls', '500 DA national credit', '5G compatible', 'Multi-cycle packs available (up to 25% savings)'], sourceUrl: `https://www.ooredoo.dz/particuliers/offres-mobiles/ooredoo-500` },
    // ── Ooredoo POP (Postpaid) ───────────────────────────────────────────────
    { name: 'Ooredoo POP 1500', type: OfferType.POSTPAID, priceDA: 1500, dataGB: 50, voiceMinutes: -1, smsCount: 0, validityDays: 30, network: '4G/5G', features: ['Unlimited Ooredoo calls', '1500 DA national credit', '10 min international (20 destinations)', 'Monthly plan', 'Unused data/credit rolls over', '5G compatible'], sourceUrl: `${BASE_URL}ooredoo-pop` },
    { name: 'Ooredoo POP 2000', type: OfferType.POSTPAID, priceDA: 2000, dataGB: 80, voiceMinutes: -1, smsCount: 50, validityDays: 30, network: '4G/5G', features: ['Unlimited calls (all networks)', 'ANAZIK music subscription', 'ANAFLIX film/series subscription', 'Free Facebook', 'Monthly plan', '5G compatible'], sourceUrl: `${BASE_URL}ooredoo-pop` },
    { name: 'Ooredoo POP 2500', type: OfferType.POSTPAID, priceDA: 2500, dataGB: 120, voiceMinutes: -1, smsCount: 0, validityDays: 30, network: '4G/5G', features: ['Unlimited Ooredoo calls', '2500 DA national credit', '30 min international (20 destinations)', 'Monthly plan', '5G compatible'], sourceUrl: `${BASE_URL}ooredoo-pop` },
    { name: 'Ooredoo POP 4000', type: OfferType.POSTPAID, priceDA: 4000, dataGB: 300, voiceMinutes: -1, smsCount: 0, validityDays: 30, network: '4G/5G', features: ['Unlimited Ooredoo calls', '4000 DA national credit', '50 min international (20 destinations)', 'Monthly plan', '5G compatible'], sourceUrl: `${BASE_URL}ooredoo-pop` },
    // ── Forfait Internet (Data-Only) ─────────────────────────────────────────
    { name: 'Ooredoo Forfait Internet 100 DA', type: OfferType.DATA_ONLY, priceDA: 100, dataGB: 0.7, voiceMinutes: 0, smsCount: 0, validityDays: 1, network: '4G', features: ['Unlimited YouTube'], sourceUrl: 'https://www.ooredoo.dz/fr/particuliers/internet/ooredoo-internet' },
    { name: 'Ooredoo Forfait Internet 300 DA', type: OfferType.DATA_ONLY, priceDA: 300, dataGB: 3, voiceMinutes: 0, smsCount: 0, validityDays: 3, network: '4G', features: ['Unlimited YouTube'], sourceUrl: 'https://www.ooredoo.dz/fr/particuliers/internet/ooredoo-internet' },
    { name: 'Ooredoo Forfait Internet 500 DA', type: OfferType.DATA_ONLY, priceDA: 500, dataGB: 6, voiceMinutes: 0, smsCount: 0, validityDays: 30, network: '4G', features: [], sourceUrl: 'https://www.ooredoo.dz/fr/particuliers/internet/ooredoo-internet' },
    { name: 'Ooredoo Forfait Internet 1000 DA', type: OfferType.DATA_ONLY, priceDA: 1000, dataGB: 15, voiceMinutes: 0, smsCount: 0, validityDays: 30, network: '4G', features: ['5 GB YouTube bonus allocation'], sourceUrl: 'https://www.ooredoo.dz/fr/particuliers/internet/ooredoo-internet' },
    { name: 'Ooredoo Forfait Internet 1500 DA', type: OfferType.DATA_ONLY, priceDA: 1500, dataGB: 40, voiceMinutes: 0, smsCount: 0, validityDays: 30, network: '4G', features: ['Unlimited YouTube'], sourceUrl: 'https://www.ooredoo.dz/fr/particuliers/internet/ooredoo-internet' },
  ]
}
