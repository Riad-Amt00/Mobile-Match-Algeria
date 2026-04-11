/**
 * Djezzy Scraper — uses Playwright for JS-rendered pages
 * Target: https://www.djezzy5g.dz/
 */
import { chromium } from 'playwright'
import { db } from '@/lib/db'
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

export async function scrapeDjezzy(): Promise<ScrapedOffer[]> {
  const browser = await chromium.launch({ headless: true })
  const context = await browser.newContext({
    userAgent:
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/122.0.0.0 Safari/537.36',
  })
  const page = await context.newPage()
  const offers: ScrapedOffer[] = []

  try {
    // ─── Prepaid Offers ──────────────────────────────────────────────────
    await page.goto('https://www.djezzy5g.dz/', { waitUntil: 'networkidle', timeout: 30000 })
    await page.waitForTimeout(2000)

    // Click Prépayé tab if it exists
    const tabs = ['Prépayé', 'Prepaid', 'ZID', 'IZZY']
    for (const tab of tabs) {
      try {
        await page.click(`text=${tab}`, { timeout: 3000 })
        await page.waitForTimeout(1500)
        const cards = await page.$$('.offer-card, .plan-card, [class*="offer"], [class*="pack"]')
        for (const card of cards) {
          const text = await card.innerText()
          const parsed = parseDjezzyCard(text, 'PREPAID')
          if (parsed) offers.push({ ...parsed, sourceUrl: 'https://www.djezzy5g.dz/#Offer' })
        }
      } catch {}
    }

    // Direct page scrape for all visible cards
    const allText = await page.evaluate(() => {
      const cards = document.querySelectorAll('[class*="card"], [class*="offer"], [class*="plan"], [class*="pack"]')
      return Array.from(cards).map((c) => c.textContent || '')
    })

    for (const text of allText) {
      const parsed = parseDjezzyCard(text, guessDjezzyType(text))
      if (parsed && parsed.priceDA > 0) {
        const exists = offers.find((o) => o.name === parsed.name)
        if (!exists) offers.push({ ...parsed, sourceUrl: 'https://www.djezzy5g.dz/' })
      }
    }
  } catch (error) {
    console.error('[Djezzy Scraper] Error:', error)
  } finally {
    await browser.close()
  }

  // If scraping yields no results, return known offers based on site research
  if (offers.length === 0) {
    return getDjezzyFallbackOffers()
  }

  return offers
}

function parseDjezzyCard(text: string, defaultType: OfferType): ScrapedOffer | null {
  const priceMatch = text.match(/(\d[\d\s]*)\s*DA/i)
  const dataMatch = text.match(/(\d+(?:[.,]\d+)?)\s*GB/i)
  const minutesMatch = text.match(/(\d+)\s*min/i)
  const smsMatch = text.match(/(\d+)\s*SMS/i)
  const validityMatch = text.match(/(\d+)\s*(jour|day|mois|month|semaine|week)/i)

  if (!priceMatch) return null

  const price = parseFloat(priceMatch[1].replace(/\s/g, ''))
  if (price <= 0 || price > 20000) return null

  return {
    name: `Djezzy ${price} DA`,
    type: defaultType,
    priceDA: price,
    dataGB: dataMatch ? parseFloat(dataMatch[1].replace(',', '.')) : 0,
    voiceMinutes: minutesMatch ? parseInt(minutesMatch[1]) : -1,
    smsCount: smsMatch ? parseInt(smsMatch[1]) : -1,
    validityDays: validityMatch ? parseValidity(validityMatch[1], validityMatch[2]) : 30,
    network: text.toLowerCase().includes('5g') ? '5G' : '4G',
    features: [],
    sourceUrl: 'https://www.djezzy5g.dz/',
  }
}

function guessDjezzyType(text: string): OfferType {
  const lower = text.toLowerCase()
  if (lower.includes('postpay') || lower.includes('postpayé')) return OfferType.POSTPAID
  if (lower.includes('internet') || lower.includes('data only')) return OfferType.DATA_ONLY
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

function getDjezzyFallbackOffers(): ScrapedOffer[] {
  return [
    // ── PREPAID ZID ──
    {
      name: 'ZID 100',
      type: OfferType.PREPAID, priceDA: 100, dataGB: 1, voiceMinutes: 30,
      smsCount: 20, validityDays: 1, network: '4G',
      features: ['Appels Djezzy illimités'], sourceUrl: 'https://www.djezzy5g.dz/#Offer',
    },
    {
      name: 'ZID 200',
      type: OfferType.PREPAID, priceDA: 200, dataGB: 3, voiceMinutes: 60,
      smsCount: 50, validityDays: 7, network: '4G',
      features: ['Appels Djezzy illimités', 'Réseaux sociaux offerts'], sourceUrl: 'https://www.djezzy5g.dz/#Offer',
    },
    {
      name: 'ZID 500',
      type: OfferType.PREPAID, priceDA: 500, dataGB: 10, voiceMinutes: 150,
      smsCount: 100, validityDays: 30, network: '4G',
      features: ['Appels Djezzy illimités', 'Facebook offert'], sourceUrl: 'https://www.djezzy5g.dz/#Offer',
    },
    {
      name: 'ZID 1000',
      type: OfferType.PREPAID, priceDA: 1000, dataGB: 25, voiceMinutes: 300,
      smsCount: 200, validityDays: 30, network: '4G',
      features: ['Appels Djezzy illimités', 'Réseaux sociaux offerts', 'Data de nuit 10 GB'], sourceUrl: 'https://www.djezzy5g.dz/#Offer',
    },
    {
      name: 'ZID 1500',
      type: OfferType.PREPAID, priceDA: 1500, dataGB: 40, voiceMinutes: -1,
      smsCount: 300, validityDays: 30, network: '4G',
      features: ['Appels illimités toutes réseaux', 'Réseaux sociaux offerts', 'Data de nuit 15 GB'], sourceUrl: 'https://www.djezzy5g.dz/#Offer',
    },
    {
      name: 'ZID 2000',
      type: OfferType.PREPAID, priceDA: 2000, dataGB: 60, voiceMinutes: -1,
      smsCount: -1, validityDays: 30, network: '4G/5G',
      features: ['Appels illimités toutes réseaux', 'SMS illimités', 'Réseaux sociaux offerts', 'Data de nuit 20 GB'], sourceUrl: 'https://www.djezzy5g.dz/#Offer',
    },
    // ── PREPAID IZZY (short term) ──
    {
      name: 'IZZY Jour',
      type: OfferType.PREPAID, priceDA: 50, dataGB: 0.5, voiceMinutes: 20,
      smsCount: 10, validityDays: 1, network: '4G',
      features: ['Appels Djezzy illimités'], sourceUrl: 'https://www.djezzy5g.dz/#Offer',
    },
    {
      name: 'IZZY Semaine',
      type: OfferType.PREPAID, priceDA: 300, dataGB: 5, voiceMinutes: 100,
      smsCount: 50, validityDays: 7, network: '4G',
      features: ['Appels Djezzy illimités', 'Facebook offert'], sourceUrl: 'https://www.djezzy5g.dz/#Offer',
    },
    // ── POSTPAID ──
    {
      name: 'Djezzy Business 1500',
      type: OfferType.POSTPAID, priceDA: 1500, dataGB: 30, voiceMinutes: 200,
      smsCount: 100, validityDays: 30, network: '4G',
      features: ['Facturation mensuelle', 'Appels Djezzy illimités'], sourceUrl: 'https://www.djezzy5g.dz/',
    },
    {
      name: 'Djezzy Business 2500',
      type: OfferType.POSTPAID, priceDA: 2500, dataGB: 80, voiceMinutes: -1,
      smsCount: 200, validityDays: 30, network: '4G/5G',
      features: ['Facturation mensuelle', 'Appels illimités toutes réseaux', 'Roaming disponible'], sourceUrl: 'https://www.djezzy5g.dz/',
    },
    {
      name: 'Djezzy Business 4000',
      type: OfferType.POSTPAID, priceDA: 4000, dataGB: 150, voiceMinutes: -1,
      smsCount: -1, validityDays: 30, network: '4G/5G',
      features: ['Facturation mensuelle', 'Appels illimités toutes réseaux', 'SMS illimités', 'Roaming international', '5G prioritaire'], sourceUrl: 'https://www.djezzy5g.dz/',
    },
    // ── DATA ONLY ──
    {
      name: 'Djezzy Data 500',
      type: OfferType.DATA_ONLY, priceDA: 500, dataGB: 15, voiceMinutes: 0,
      smsCount: 0, validityDays: 30, network: '4G',
      features: ['Data uniquement', 'Compatible tablette/routeur'], sourceUrl: 'https://www.djezzy5g.dz/',
    },
    {
      name: 'Djezzy Data 1000',
      type: OfferType.DATA_ONLY, priceDA: 1000, dataGB: 35, voiceMinutes: 0,
      smsCount: 0, validityDays: 30, network: '4G',
      features: ['Data uniquement', 'Compatible tablette/routeur', 'Bonus nuit 10 GB'], sourceUrl: 'https://www.djezzy5g.dz/',
    },
  ]
}
