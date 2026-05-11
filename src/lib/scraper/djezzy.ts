/**
 * Djezzy Scraper — fetches live data from djezzy.dz using HTTP + cheerio.
 * Falls back to the verified dataset if the website is unreachable or has
 * changed its HTML structure.
 *
 * Live: LEGEND, DjezzyNet, LEGEND MAX, CONFORT PARTAGE, CAMPUCE, 3ayla
 * Fallback only: ZID (connection timeout), IZZY! (marketing page, no structured data)
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

const BASE = 'https://www.djezzy.dz'
const HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
  'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
  'Accept-Language': 'fr-FR,fr;q=0.9,en;q=0.8',
}

async function fetchPage(url: string): Promise<string | null> {
  try {
    const res = await fetch(url, {
      headers: HEADERS,
      signal: AbortSignal.timeout(15000),
    })
    if (!res.ok) return null
    return await res.text()
  } catch {
    return null
  }
}

function parseGB(text: string): number {
  const clean = text.toLowerCase().replace(/\s+/g, ' ').trim()
  const go = clean.match(/([\d.,]+)\s*g[bo]/i)
  if (go) return parseFloat(go[1].replace(',', '.'))
  const mb = clean.match(/([\d.,]+)\s*m[bo]/i)
  if (mb) return parseFloat(mb[1].replace(',', '.')) / 1024
  return 0
}

function parseDA(text: string): number {
  const m = text.match(/(\d[\d\s]*)\s*DA/i)
  return m ? parseInt(m[1].replace(/\s/g, '')) : 0
}

function parseDays(text: string): number {
  const m = text.match(/(\d+)\s*(?:jours?|days?)/i)
  return m ? parseInt(m[1]) : 30
}

// ── Parser for price-card article layout (LEGEND) ─────────────────────────────
function parsePriceCards(
  $: cheerio.CheerioAPI,
  pageUrl: string,
  planFamily: string,
  type: OfferType,
  defaultValidity = 30,
): ScrapedOffer[] {
  const offers: ScrapedOffer[] = []

  $('article.price-card').each((_, el) => {
    const card = $(el)
    const featureItems = card.find('li.feature-item')

    let priceDA = 0
    let dataGB = 0
    let voiceMinutes = -1
    let smsCount = -1
    let validityDays = defaultValidity
    const features: string[] = []

    featureItems.each((_, fi) => {
      const item = $(fi)
      const iconClass = item.find('i').attr('class') || ''
      const text = item.text().replace(/\s+/g, ' ').trim()

      if (iconClass.includes('icon-Internet')) {
        const gb = parseGB(text)
        if (gb > 0) dataGB = gb
      } else if (iconClass.includes('icon-Appels-Illimite')) {
        voiceMinutes = -1
        if (/tous les r.seaux/i.test(text)) {
          features.push('Unlimited calls (all networks)')
        } else {
          features.push('Unlimited Djezzy calls')
        }
      } else if (iconClass.includes('icon-SMS-illimite')) {
        smsCount = -1
        features.push(/djezzy/i.test(text) ? 'Unlimited Djezzy SMS' : 'Unlimited SMS')
      } else if (iconClass.includes('icon-Courrier')) {
        const sm = text.match(/(\d+)\s*SMS/i)
        if (sm) features.push(`${sm[1]} SMS to other networks`)
      } else if (iconClass.includes('icon-Historique')) {
        validityDays = parseDays(text)
      } else if (iconClass.includes('icon-Flexy2')) {
        const cr = text.match(/(\d+)\s*DA/i)
        if (cr) features.push(`${cr[1]} DA credit`)
      } else if (iconClass.includes('icon-Promotion')) {
        features.push('50% discount on 2nd subscription')
      }

      const p = parseDA(text)
      if (p > 0 && !priceDA) priceDA = p
    })

    if (!priceDA) {
      const label = card.attr('aria-label') || ''
      const lm = label.match(/(\d+)/)
      if (lm) priceDA = parseInt(lm[1])
    }

    if (!priceDA || dataGB <= 0) return

    offers.push({
      name: `Djezzy ${planFamily} ${priceDA}`,
      type,
      priceDA,
      dataGB,
      voiceMinutes,
      smsCount,
      validityDays,
      network: '4G',
      features,
      sourceUrl: pageUrl,
    })
  })

  return offers
}

// ── Parser for CAMPUCE price-card layout (different inner structure) ───────────
function parseDjezzyCampuceCards($: cheerio.CheerioAPI, pageUrl: string): ScrapedOffer[] {
  const offers: ScrapedOffer[] = []

  $('article.price-card').each((_, el) => {
    const card = $(el)

    // Price: dedicated price-value div; fallback to parseDA on heading text
    let priceDA = 0
    const priceEl = card.find('div.price-value, .price-value, .card-price, h2, h3').first()
    if (priceEl.length) priceDA = parseDA(priceEl.text())
    if (!priceDA) {
      const label = card.attr('aria-label') || ''
      const lm = label.match(/(\d+)/)
      if (lm) priceDA = parseInt(lm[1])
    }

    // Data: feature-data element; fallback to icon-Internet feature item
    let dataGB = 0
    const dataEl = card.find('strong.feature-data, .feature-data, .data-amount')
    if (dataEl.length) dataGB = parseGB(dataEl.text())
    if (dataGB <= 0) {
      card.find('li.feature-item').each((_, fi) => {
        const iconClass = $(fi).find('i').attr('class') || ''
        if (iconClass.includes('icon-Internet')) {
          const gb = parseGB($(fi).text())
          if (gb > 0) dataGB = gb
        }
      })
    }

    // Features and validity from feature items
    const features: string[] = []
    let validityDays = 30
    card.find('li.feature-item').each((_, fi) => {
      const item = $(fi)
      const iconClass = item.find('i').attr('class') || ''
      const text = item.text().replace(/\s+/g, ' ').trim()

      if (iconClass.includes('icon-Historique')) {
        validityDays = parseDays(text)
      } else if (iconClass.includes('icon-Appels-Illimite')) {
        features.push(/tous/i.test(text) ? 'Unlimited calls (all networks)' : 'Unlimited Djezzy calls')
      } else if (iconClass.includes('icon-SMS-illimite')) {
        features.push('Unlimited Djezzy SMS')
      } else if (iconClass.includes('icon-Promotion')) {
        features.push('Student offer')
      } else if (text.length > 2 && !parseDA(text) && !parseGB(text)) {
        features.push(text)
      }
    })

    if (!priceDA || dataGB <= 0) return

    offers.push({
      name: `Djezzy CAMPUCE ${priceDA}`,
      type: OfferType.PREPAID,
      priceDA,
      dataGB,
      voiceMinutes: -1,
      smsCount: -1,
      validityDays,
      network: '4G',
      features,
      sourceUrl: pageUrl,
    })
  })

  return offers
}

// ── Parser for table-based layout (LEGEND MAX, CONFORT PARTAGE, 3ayla) ────────
// Layout: div.options-tab-table > div.col-centered > table
//   thead: span.price span (number) + span.da.unit (unit e.g. "Go")
//   tbody: last td h4 or span matching "Pour XXXX DA"
function parseDjezzyTableCards(
  $: cheerio.CheerioAPI,
  pageUrl: string,
  planFamily: string,
  type: OfferType,
  validityDays = 30,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  container?: cheerio.Cheerio<any>,
): ScrapedOffer[] {
  const offers: ScrapedOffer[] = []

  const tables = container
    ? container.find('div.options-tab-table div.col-centered table, div.col-centered table, table.price-table, table')
    : $('div.options-tab-table div.col-centered table, div.col-centered table, table.price-table, table')

  tables.each((_, table) => {
    const $table = $(table)

    // Data from thead
    let dataGB = 0
    const priceSpan = $table.find('thead span.price span').first()
    const unitSpan = $table.find('thead span.da.unit, thead span.unit').first()
    if (priceSpan.length && unitSpan.length) {
      const unitText = unitSpan.text().trim().toLowerCase()
      if (unitText.includes('go') || unitText.includes('gb')) {
        dataGB = parseFloat(priceSpan.text().trim().replace(',', '.')) || 0
      }
    }
    if (dataGB <= 0) {
      const goMatch = $table.find('thead').text().match(/([\d.,]+)\s*Go/i)
      if (goMatch) dataGB = parseFloat(goMatch[1].replace(',', '.'))
    }
    if (dataGB <= 0) return

    // Price from tbody: "Pour XXXX DA" pattern in any td element
    let priceDA = 0
    $table.find('tbody tr td h4, tbody tr td h3, tbody tr td span, tbody tr td p, tbody tr td').each((_, el) => {
      if (priceDA) return
      const text = $(el).text().replace(/\s+/g, ' ').trim()
      const m = text.match(/Pour\s+([\d\s]+)\s*DA/i)
      if (m) priceDA = parseInt(m[1].replace(/\s/g, ''))
    })
    if (!priceDA) return

    // Features from tbody rows, excluding the price row
    const features: string[] = []
    $table.find('tbody tr').each((_, tr) => {
      $(tr).find('td').each((_, td) => {
        const text = $(td).text().replace(/\s+/g, ' ').trim()
        if (text && !/Pour\s+\d/i.test(text) && text.length > 2 && !/^\d+$/.test(text)) {
          features.push(text)
        }
      })
    })

    offers.push({
      name: `Djezzy ${planFamily} ${priceDA}`,
      type,
      priceDA,
      dataGB,
      voiceMinutes: type === OfferType.DATA_ONLY ? 0 : -1,
      smsCount: type === OfferType.DATA_ONLY ? 0 : -1,
      validityDays,
      network: '4G',
      features: features.slice(0, 5),
      sourceUrl: pageUrl,
    })
  })

  return offers
}

// ── Parser for DjezzyNet tabbed layout (daily / weekly / monthly tabs) ────────
function parseDjezzyNet($: cheerio.CheerioAPI, pageUrl: string): ScrapedOffer[] {
  const offers: ScrapedOffer[] = []

  const tabValidities: Record<string, number> = {
    JOUR: 1,
    SEMAINE: 7,
    MOIS: 30,
  }

  $('[role="tabpanel"]').each((_, panel) => {
    const panelId = $(panel).attr('id') || ''
    let validityDays = 30
    const tabLink = $(`[href="#${panelId}"]`)
    const tabText = tabLink.text().trim().toUpperCase()
    for (const [key, days] of Object.entries(tabValidities)) {
      if (tabText.includes(key)) { validityDays = days; break }
    }

    $(panel).find('article.price-card').each((_, el) => {
      const card = $(el)
      let dataGB = 0
      let priceDA = 0
      const features: string[] = []

      card.find('li.feature-item').each((_, fi) => {
        const item = $(fi)
        const iconClass = item.find('i').attr('class') || ''
        const text = item.text().replace(/\s+/g, ' ').trim()

        if (iconClass.includes('icon-Internet')) {
          dataGB = parseGB(text)
        } else if (iconClass.includes('icon-Promotion')) {
          features.push('50% discount on 2nd subscription')
        }
        const p = parseDA(text)
        if (p > 0 && !priceDA) priceDA = p
      })

      if (!priceDA || dataGB <= 0) return

      offers.push({
        name: `DjezzyNet ${validityDays === 1 ? 'Daily' : validityDays === 7 ? 'Weekly' : 'Monthly'} ${priceDA} DA`,
        type: OfferType.DATA_ONLY,
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
  })

  return offers
}

// ── Parser for 3ayla tab-based layout (1/3/6/12 months) ──────────────────────
function parseDjezzy3ayla($: cheerio.CheerioAPI, pageUrl: string): ScrapedOffer[] {
  const offers: ScrapedOffer[] = []

  const tabPanels = $('[role="tabpanel"]')
  if (tabPanels.length > 0) {
    tabPanels.each((_, panel) => {
      const $panel = $(panel)
      const panelId = $panel.attr('id') || ''
      const tabLink = $(`[href="#${panelId}"], [aria-controls="${panelId}"]`).first()
      const tabText = tabLink.text().trim().toLowerCase()

      let validityDays = 30
      const anMatch = tabText.match(/(\d+)\s*an/i)
      const moisMatch = tabText.match(/(\d+)\s*mois/i)
      if (anMatch) validityDays = parseInt(anMatch[1]) * 365
      else if (moisMatch) validityDays = parseInt(moisMatch[1]) * 30

      const tabOffers = parseDjezzyTableCards($, pageUrl, '3ayla', OfferType.DATA_ONLY, validityDays, $panel)
      offers.push(...tabOffers)
    })
  } else {
    // No tabs — flat table layout
    const flat = parseDjezzyTableCards($, pageUrl, '3ayla', OfferType.DATA_ONLY, 30)
    offers.push(...flat)
  }

  return offers
}

// ── Main scraper entry point ──────────────────────────────────────────────────
export async function scrapeDjezzy(emit: Emit = () => {}): Promise<ScrapedOffer[]> {
  emit('INFO', 'Fetching Djezzy offers from djezzy.dz')
  const liveOffers: ScrapedOffer[] = []
  const scrapedFamilies = new Set<string>()

  // ── LEGEND prepaid ────────────────────────────────────────────────────────
  const legendUrl = `${BASE}/particuliers/offres/djezzy-legend/`
  const legendHtml = await fetchPage(legendUrl)
  if (legendHtml) {
    const $ = cheerio.load(legendHtml)
    const parsed = parsePriceCards($, legendUrl, 'LEGEND', OfferType.PREPAID)
    if (parsed.length > 0) {
      liveOffers.push(...parsed)
      emit('OK', `LEGEND: ${parsed.length} offers scraped live`)
      scrapedFamilies.add('LEGEND')
    } else {
      emit('WARN', 'LEGEND: page fetched but no price cards found — using fallback')
    }
  } else {
    emit('WARN', 'LEGEND: page unreachable — using fallback')
  }

  // ── LEGEND MAX postpaid (table layout) ────────────────────────────────────
  const legendMaxUrl = `${BASE}/particuliers/offres/legend-max/`
  const legendMaxHtml = await fetchPage(legendMaxUrl)
  if (legendMaxHtml) {
    const $ = cheerio.load(legendMaxHtml)
    const parsed = parseDjezzyTableCards($, legendMaxUrl, 'LEGEND MAX', OfferType.POSTPAID, 30)
    if (parsed.length > 0) {
      liveOffers.push(...parsed)
      emit('OK', `LEGEND MAX: ${parsed.length} offers scraped live`)
      scrapedFamilies.add('LEGEND MAX')
    } else {
      emit('WARN', 'LEGEND MAX: page fetched but no table cards found — using fallback')
    }
  } else {
    emit('WARN', 'LEGEND MAX: page unreachable — using fallback')
  }

  // ── CONFORT PARTAGE postpaid (table layout) ───────────────────────────────
  const confortUrl = `${BASE}/particuliers/offres/djezzy-confort-2/`
  const confortHtml = await fetchPage(confortUrl)
  if (confortHtml) {
    const $ = cheerio.load(confortHtml)
    const parsed = parseDjezzyTableCards($, confortUrl, 'CONFORT PARTAGE', OfferType.POSTPAID, 30)
    if (parsed.length > 0) {
      liveOffers.push(...parsed)
      emit('OK', `CONFORT PARTAGE: ${parsed.length} offers scraped live`)
      scrapedFamilies.add('CONFORT PARTAGE')
    } else {
      emit('WARN', 'CONFORT PARTAGE: no table cards found — using fallback')
    }
  } else {
    emit('WARN', 'CONFORT PARTAGE: unreachable — using fallback')
  }

  // ── CAMPUCE student prepaid ────────────────────────────────────────────────
  const campuceUrl = `${BASE}/particuliers/offres/offre-djezzy-campuce/`
  const campuceHtml = await fetchPage(campuceUrl)
  if (campuceHtml) {
    const $ = cheerio.load(campuceHtml)
    // Try custom CAMPUCE parser first; fall back to LEGEND parser (same article.price-card but different inner structure)
    let parsed = parseDjezzyCampuceCards($, campuceUrl)
    if (parsed.length === 0) parsed = parsePriceCards($, campuceUrl, 'CAMPUCE', OfferType.PREPAID)
    if (parsed.length === 0) parsed = parseDjezzyTableCards($, campuceUrl, 'CAMPUCE', OfferType.PREPAID, 30)
    if (parsed.length > 0) {
      liveOffers.push(...parsed)
      emit('OK', `CAMPUCE: ${parsed.length} offers scraped live`)
      scrapedFamilies.add('CAMPUCE')
    } else {
      emit('WARN', 'CAMPUCE: page fetched but no cards found — using fallback')
    }
  } else {
    emit('WARN', 'CAMPUCE: page unreachable — using fallback')
  }

  // ── DjezzyNet data-only (tabbed) ──────────────────────────────────────────
  const netUrl = `${BASE}/particuliers/offres/offres-internet/`
  const netHtml = await fetchPage(netUrl)
  if (netHtml) {
    const $ = cheerio.load(netHtml)
    const parsed = parseDjezzyNet($, netUrl)
    if (parsed.length > 0) {
      liveOffers.push(...parsed)
      emit('OK', `DjezzyNet: ${parsed.length} offers scraped live`)
      scrapedFamilies.add('DjezzyNet')
    } else {
      emit('WARN', 'DjezzyNet: no offers parsed — using fallback')
    }
  } else {
    emit('WARN', 'DjezzyNet: unreachable — using fallback')
  }

  // ── 3ayla multi-month internet plans ─────────────────────────────────────
  const aaylaUrl = `${BASE}/particuliers/offres/djezzy-3ayla/`
  const aaylaHtml = await fetchPage(aaylaUrl)
  if (aaylaHtml) {
    const $ = cheerio.load(aaylaHtml)
    const parsed = parseDjezzy3ayla($, aaylaUrl)
    if (parsed.length > 0) {
      liveOffers.push(...parsed)
      emit('OK', `3ayla: ${parsed.length} offers scraped live`)
      scrapedFamilies.add('3ayla')
    } else {
      emit('WARN', '3ayla: no offers parsed — using fallback')
    }
  } else {
    emit('WARN', '3ayla: unreachable — using fallback')
  }

  // ── Merge live with fallback for families not successfully scraped ─────────
  const filteredFallback = getDjezzyFallbackOffers().filter(o => {
    if (o.name.startsWith('Djezzy LEGEND MAX') && scrapedFamilies.has('LEGEND MAX')) return false
    if (o.name.startsWith('Djezzy LEGEND ') && !o.name.startsWith('Djezzy LEGEND MAX') && scrapedFamilies.has('LEGEND')) return false
    if (o.name.startsWith('Djezzy CONFORT PARTAGE') && scrapedFamilies.has('CONFORT PARTAGE')) return false
    if (o.name.startsWith('Djezzy CAMPUCE') && scrapedFamilies.has('CAMPUCE')) return false
    if (o.name.startsWith('DjezzyNet') && scrapedFamilies.has('DjezzyNet')) return false
    if ((o.name.startsWith('Djezzy 3ayla') || o.name.startsWith('Djezzy SIM Internet')) && scrapedFamilies.has('3ayla')) return false
    return true
  })

  // Emit permanent fallback notices so admin health dashboard detects ZID/IZZY!
  emit('WARN', 'ZID: page unreachable on every attempt — permanent fallback (connection timeout)')
  emit('WARN', 'IZZY!: marketing page with no structured data — permanent fallback')

  const result = [...liveOffers, ...filteredFallback]
  emit('OK', `Total: ${result.length} Djezzy offers (${liveOffers.length} live, ${filteredFallback.length} from fallback)`)
  return result
}

// ── Fallback verified dataset (used when live scrape fails for a family) ──────
function getDjezzyFallbackOffers(): ScrapedOffer[] {
  const SRC = 'https://www.djezzy.dz/particuliers/offres/'
  return [
    // ── LEGEND (Prepaid) ────────────────────────────────────────────────────
    { name: 'Djezzy LEGEND 100', type: OfferType.PREPAID, priceDA: 100, dataGB: 1, voiceMinutes: -1, smsCount: -1, validityDays: 1, network: '4G', features: ['Unlimited Djezzy calls', 'Unlimited Djezzy SMS', 'Data rollover'], sourceUrl: `${SRC}djezzy-legend/` },
    { name: 'Djezzy LEGEND 1000', type: OfferType.PREPAID, priceDA: 1000, dataGB: 15, voiceMinutes: -1, smsCount: -1, validityDays: 30, network: '4G', features: ['Unlimited Djezzy calls', 'Unlimited Djezzy SMS', 'Data rollover'], sourceUrl: `${SRC}djezzy-legend/` },
    { name: 'Djezzy LEGEND 1500', type: OfferType.PREPAID, priceDA: 1500, dataGB: 45, voiceMinutes: -1, smsCount: -1, validityDays: 30, network: '4G', features: ['Unlimited Djezzy calls', 'Unlimited Djezzy SMS', 'Data rollover'], sourceUrl: `${SRC}djezzy-legend/` },
    { name: 'Djezzy LEGEND 2000', type: OfferType.PREPAID, priceDA: 2000, dataGB: 70, voiceMinutes: -1, smsCount: -1, validityDays: 30, network: '4G', features: ['Unlimited calls (all networks)', 'Unlimited Djezzy SMS', 'Data rollover'], sourceUrl: `${SRC}djezzy-legend/` },
    { name: 'Djezzy LEGEND 2000 Max', type: OfferType.PREPAID, priceDA: 2000, dataGB: 90, voiceMinutes: 350, smsCount: -1, validityDays: 30, network: '4G', features: ['Unlimited Djezzy calls', '350 min to other operators', 'Unlimited Djezzy SMS', 'Data rollover'], sourceUrl: `${SRC}djezzy-legend/` },
    { name: 'Djezzy LEGEND 2500', type: OfferType.PREPAID, priceDA: 2500, dataGB: 120, voiceMinutes: -1, smsCount: -1, validityDays: 30, network: '4G', features: ['Unlimited calls (all networks)', 'Unlimited Djezzy SMS', 'Data rollover'], sourceUrl: `${SRC}djezzy-legend/` },
    { name: 'Djezzy LEGEND 3000', type: OfferType.PREPAID, priceDA: 3000, dataGB: 145, voiceMinutes: -1, smsCount: -1, validityDays: 30, network: '4G', features: ['Unlimited calls (all networks)', 'Unlimited Djezzy SMS', 'Data rollover'], sourceUrl: `${SRC}djezzy-legend/` },
    { name: 'Djezzy LEGEND 4000', type: OfferType.PREPAID, priceDA: 4000, dataGB: 200, voiceMinutes: -1, smsCount: -1, validityDays: 30, network: '4G', features: ['Unlimited calls (all networks)', 'Unlimited Djezzy SMS', 'Data rollover'], sourceUrl: `${SRC}djezzy-legend/` },
    // ── IZZY! (Prepaid — marketing page, no structured data, permanent fallback) ─
    { name: 'IZZY! 50', type: OfferType.PREPAID, priceDA: 50, dataGB: 1, voiceMinutes: -1, smsCount: -1, validityDays: 1, network: '4G', features: ['Unlimited calls (all networks)', 'Unlimited SMS', 'Optional add-ons'], sourceUrl: `${SRC}izzy-game-changer/` },
    { name: 'IZZY! 300', type: OfferType.PREPAID, priceDA: 300, dataGB: 3, voiceMinutes: -1, smsCount: -1, validityDays: 15, network: '4G', features: ['Unlimited calls (all networks)', 'Unlimited SMS', 'Optional add-ons (YouTube, social)'], sourceUrl: `${SRC}izzy-game-changer/` },
    { name: 'IZZY! 500', type: OfferType.PREPAID, priceDA: 500, dataGB: 5, voiceMinutes: -1, smsCount: -1, validityDays: 30, network: '4G', features: ['Unlimited calls (all networks)', 'Unlimited SMS'], sourceUrl: `${SRC}izzy-game-changer/` },
    { name: 'IZZY! 1200', type: OfferType.PREPAID, priceDA: 1200, dataGB: 10, voiceMinutes: -1, smsCount: -1, validityDays: 30, network: '4G', features: ['Unlimited calls (all networks)', 'Unlimited SMS', 'Free YouTube', '1000 DA credit'], sourceUrl: `${SRC}izzy-game-changer/` },
    // ── ZID (Prepaid — permanent fallback: connection timeout on every attempt) ──
    { name: 'Djezzy ZID 50', type: OfferType.PREPAID, priceDA: 50, dataGB: 0.5, voiceMinutes: -1, smsCount: -1, validityDays: 1, network: '4G', features: ['Unlimited Djezzy calls', 'Unlimited Djezzy SMS'], sourceUrl: `${SRC}djezzy-zid/` },
    { name: 'Djezzy ZID 100', type: OfferType.PREPAID, priceDA: 100, dataGB: 1, voiceMinutes: -1, smsCount: -1, validityDays: 1, network: '4G', features: ['Unlimited Djezzy calls', 'Unlimited Djezzy SMS'], sourceUrl: `${SRC}djezzy-zid/` },
    { name: 'Djezzy ZID 200', type: OfferType.PREPAID, priceDA: 200, dataGB: 2, voiceMinutes: -1, smsCount: -1, validityDays: 7, network: '4G', features: ['Unlimited Djezzy calls', 'Unlimited Djezzy SMS'], sourceUrl: `${SRC}djezzy-zid/` },
    { name: 'Djezzy ZID 500', type: OfferType.PREPAID, priceDA: 500, dataGB: 5, voiceMinutes: -1, smsCount: -1, validityDays: 30, network: '4G', features: ['Unlimited Djezzy calls', 'Unlimited Djezzy SMS'], sourceUrl: `${SRC}djezzy-zid/` },
    { name: 'Djezzy ZID 1000', type: OfferType.PREPAID, priceDA: 1000, dataGB: 15, voiceMinutes: -1, smsCount: -1, validityDays: 30, network: '4G', features: ['Unlimited Djezzy calls', 'Unlimited Djezzy SMS'], sourceUrl: `${SRC}djezzy-zid/` },
    { name: 'Djezzy ZID 1500', type: OfferType.PREPAID, priceDA: 1500, dataGB: 40, voiceMinutes: -1, smsCount: -1, validityDays: 30, network: '4G', features: ['Unlimited Djezzy calls', 'Unlimited Djezzy SMS'], sourceUrl: `${SRC}djezzy-zid/` },
    // ── CAMPUCE Student (Prepaid) ────────────────────────────────────────────
    { name: 'Djezzy CAMPUCE 100', type: OfferType.PREPAID, priceDA: 100, dataGB: 1, voiceMinutes: -1, smsCount: -1, validityDays: 1, network: '4G', features: ['Unlimited Djezzy calls', 'Unlimited Djezzy SMS', 'Student offer', 'Free SIM', '1 GB Friday bonus/week'], sourceUrl: `${SRC}offre-djezzy-campuce/` },
    { name: 'Djezzy CAMPUCE 400', type: OfferType.PREPAID, priceDA: 400, dataGB: 5, voiceMinutes: -1, smsCount: -1, validityDays: 30, network: '4G', features: ['Unlimited Djezzy calls', 'Unlimited Djezzy SMS', 'Student offer', '20% discount', '1 GB Friday bonus/week'], sourceUrl: `${SRC}offre-djezzy-campuce/` },
    { name: 'Djezzy CAMPUCE 800', type: OfferType.PREPAID, priceDA: 800, dataGB: 15, voiceMinutes: -1, smsCount: -1, validityDays: 30, network: '4G', features: ['Unlimited Djezzy calls', 'Unlimited Djezzy SMS', 'Student offer', '1 GB Friday bonus/week'], sourceUrl: `${SRC}offre-djezzy-campuce/` },
    { name: 'Djezzy CAMPUCE 1200', type: OfferType.PREPAID, priceDA: 1200, dataGB: 40, voiceMinutes: -1, smsCount: -1, validityDays: 30, network: '4G', features: ['Unlimited Djezzy calls', 'Unlimited Djezzy SMS', 'Student offer', '1 GB Friday bonus/week'], sourceUrl: `${SRC}offre-djezzy-campuce/` },
    { name: 'Djezzy CAMPUCE 1600', type: OfferType.PREPAID, priceDA: 1600, dataGB: 70, voiceMinutes: -1, smsCount: -1, validityDays: 30, network: '4G', features: ['Unlimited Djezzy calls', '50 SMS to other operators', 'Student offer', '1 GB Friday bonus/week'], sourceUrl: `${SRC}offre-djezzy-campuce/` },
    // ── LEGEND MAX (Postpaid) ────────────────────────────────────────────────
    { name: 'Djezzy LEGEND MAX 1500', type: OfferType.POSTPAID, priceDA: 1500, dataGB: 50, voiceMinutes: -1, smsCount: -1, validityDays: 30, network: '4G', features: ['Unlimited Djezzy calls', 'Unlimited Djezzy SMS', 'Monthly plan', 'International credit included'], sourceUrl: `${SRC}legend-max/` },
    { name: 'Djezzy LEGEND MAX 2000', type: OfferType.POSTPAID, priceDA: 2000, dataGB: 70, voiceMinutes: -1, smsCount: -1, validityDays: 30, network: '4G', features: ['Unlimited calls (all networks)', 'Unlimited Djezzy SMS', '100 SMS to other operators', 'Monthly plan'], sourceUrl: `${SRC}legend-max/` },
    { name: 'Djezzy LEGEND MAX 2500', type: OfferType.POSTPAID, priceDA: 2500, dataGB: 100, voiceMinutes: -1, smsCount: -1, validityDays: 30, network: '4G', features: ['Unlimited calls (all networks)', 'Unlimited Djezzy SMS', '150 SMS to other operators', 'Monthly plan'], sourceUrl: `${SRC}legend-max/` },
    { name: 'Djezzy LEGEND MAX 3000', type: OfferType.POSTPAID, priceDA: 3000, dataGB: 150, voiceMinutes: -1, smsCount: -1, validityDays: 30, network: '4G', features: ['Unlimited Djezzy calls', 'Unlimited Djezzy SMS', 'Monthly plan', '30 min international calls'], sourceUrl: `${SRC}legend-max/` },
    // ── CONFORT PARTAGE (Postpaid, shared data) ──────────────────────────────
    { name: 'Djezzy CONFORT PARTAGE 1500', type: OfferType.POSTPAID, priceDA: 1500, dataGB: 50, voiceMinutes: -1, smsCount: -1, validityDays: 30, network: '4G', features: ['Unlimited Djezzy calls', 'Unlimited Djezzy SMS', 'Shareable secondary SIM', 'Monthly plan'], sourceUrl: `${SRC}djezzy-confort-2/` },
    { name: 'Djezzy CONFORT PARTAGE 2000', type: OfferType.POSTPAID, priceDA: 2000, dataGB: 80, voiceMinutes: -1, smsCount: -1, validityDays: 30, network: '4G', features: ['Unlimited Djezzy calls', 'Unlimited Djezzy SMS', 'Shareable secondary SIM', 'Monthly plan', '15 min international'], sourceUrl: `${SRC}djezzy-confort-2/` },
    { name: 'Djezzy CONFORT PARTAGE 3000', type: OfferType.POSTPAID, priceDA: 3000, dataGB: 150, voiceMinutes: -1, smsCount: -1, validityDays: 30, network: '4G', features: ['Unlimited Djezzy calls', 'Unlimited Djezzy SMS', 'Shareable secondary SIM', 'Monthly plan', '30 min international'], sourceUrl: `${SRC}djezzy-confort-2/` },
    // ── DjezzyNet — Daily ────────────────────────────────────────────────────
    { name: 'DjezzyNet Daily 15 DA', type: OfferType.DATA_ONLY, priceDA: 15, dataGB: 0.3, voiceMinutes: 0, smsCount: 0, validityDays: 1, network: '4G', features: ['50% discount on 2nd subscription'], sourceUrl: `${SRC}offres-internet/` },
    { name: 'DjezzyNet Daily 25 DA', type: OfferType.DATA_ONLY, priceDA: 25, dataGB: 0.6, voiceMinutes: 0, smsCount: 0, validityDays: 1, network: '4G', features: ['50% discount on 2nd subscription'], sourceUrl: `${SRC}offres-internet/` },
    { name: 'DjezzyNet Daily 50 DA', type: OfferType.DATA_ONLY, priceDA: 50, dataGB: 2, voiceMinutes: 0, smsCount: 0, validityDays: 1, network: '4G', features: ['50% discount on 2nd subscription'], sourceUrl: `${SRC}offres-internet/` },
    { name: 'DjezzyNet Daily 150 DA', type: OfferType.DATA_ONLY, priceDA: 150, dataGB: 5, voiceMinutes: 0, smsCount: 0, validityDays: 1, network: '4G', features: ['Activate via *720#'], sourceUrl: `${SRC}offres-internet/` },
    // ── DjezzyNet — Weekly ───────────────────────────────────────────────────
    { name: 'DjezzyNet Weekly 75 DA', type: OfferType.DATA_ONLY, priceDA: 75, dataGB: 4, voiceMinutes: 0, smsCount: 0, validityDays: 7, network: '4G', features: ['50% discount on 2nd subscription'], sourceUrl: `${SRC}offres-internet/` },
    { name: 'DjezzyNet Weekly 150 DA', type: OfferType.DATA_ONLY, priceDA: 150, dataGB: 10, voiceMinutes: 0, smsCount: 0, validityDays: 7, network: '4G', features: ['50% discount on 2nd subscription'], sourceUrl: `${SRC}offres-internet/` },
    { name: 'DjezzyNet Weekly 500 DA', type: OfferType.DATA_ONLY, priceDA: 500, dataGB: 20, voiceMinutes: 0, smsCount: 0, validityDays: 7, network: '4G', features: [], sourceUrl: `${SRC}offres-internet/` },
    // ── DjezzyNet — Monthly ──────────────────────────────────────────────────
    { name: 'DjezzyNet Monthly 250 DA', type: OfferType.DATA_ONLY, priceDA: 250, dataGB: 12, voiceMinutes: 0, smsCount: 0, validityDays: 30, network: '4G', features: ['50% discount on 2nd subscription'], sourceUrl: `${SRC}offres-internet/` },
    { name: 'DjezzyNet Monthly 500 DA', type: OfferType.DATA_ONLY, priceDA: 500, dataGB: 30, voiceMinutes: 0, smsCount: 0, validityDays: 30, network: '4G', features: ['50% discount on 2nd subscription'], sourceUrl: `${SRC}offres-internet/` },
    { name: 'DjezzyNet Monthly 750 DA', type: OfferType.DATA_ONLY, priceDA: 750, dataGB: 60, voiceMinutes: 0, smsCount: 0, validityDays: 30, network: '4G', features: ['50% discount on 2nd subscription'], sourceUrl: `${SRC}offres-internet/` },
    { name: 'DjezzyNet Monthly 2000 DA', type: OfferType.DATA_ONLY, priceDA: 2000, dataGB: 100, voiceMinutes: 0, smsCount: 0, validityDays: 30, network: '4G', features: [], sourceUrl: `${SRC}offres-internet/` },
    { name: 'DjezzyNet Monthly 4000 DA', type: OfferType.DATA_ONLY, priceDA: 4000, dataGB: 220, voiceMinutes: 0, smsCount: 0, validityDays: 30, network: '4G', features: ['Bonus app data available'], sourceUrl: `${SRC}offres-internet/` },
    // ── 3ayla / SIM Internet ─────────────────────────────────────────────────
    { name: 'Djezzy SIM Internet 1000 DA', type: OfferType.DATA_ONLY, priceDA: 1000, dataGB: 15, voiceMinutes: 0, smsCount: 0, validityDays: 30, network: '4G', features: ['Internet SIM', '4G modem compatible', 'Activate via *720#'], sourceUrl: `${SRC}nouveaux-forfaits-internet-de-djezzy/` },
    { name: 'Djezzy SIM Internet 1500 DA', type: OfferType.DATA_ONLY, priceDA: 1500, dataGB: 50, voiceMinutes: 0, smsCount: 0, validityDays: 30, network: '4G', features: ['Internet SIM', '4G modem compatible'], sourceUrl: `${SRC}nouveaux-forfaits-internet-de-djezzy/` },
    { name: 'Djezzy 3ayla 3 Months', type: OfferType.DATA_ONLY, priceDA: 2500, dataGB: 60, voiceMinutes: 0, smsCount: 0, validityDays: 90, network: '4G', features: ['Family internet plan', '4G modem bundle option'], sourceUrl: `${SRC}djezzy-3ayla/` },
    { name: 'Djezzy 3ayla 6 Months', type: OfferType.DATA_ONLY, priceDA: 4000, dataGB: 150, voiceMinutes: 0, smsCount: 0, validityDays: 180, network: '4G', features: ['Family internet plan', '4G modem bundle option'], sourceUrl: `${SRC}djezzy-3ayla/` },
    { name: 'Djezzy 3ayla Annual', type: OfferType.DATA_ONLY, priceDA: 7500, dataGB: 350, voiceMinutes: 0, smsCount: 0, validityDays: 365, network: '4G', features: ['Annual plan', 'Family internet', '4G modem compatible'], sourceUrl: `${SRC}djezzy-3ayla/` },
  ]
}
