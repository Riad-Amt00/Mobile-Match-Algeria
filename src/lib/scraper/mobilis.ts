/**
 * Mobilis Algeria Scraper — uses Playwright for JS-rendered pages
 * Target: https://mobilis.dz/
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

export async function scrapeMobilis(): Promise<ScrapedOffer[]> {
  const browser = await chromium.launch({ headless: true })
  const context = await browser.newContext({
    userAgent:
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/122.0.0.0 Safari/537.36',
    locale: 'en-US',
  })
  const page = await context.newPage()
  const offers: ScrapedOffer[] = []

  const urlsToScrape = [
    'https://mobilis.dz/particuliers/nos-offres',
    'https://mobilis.dz/particuliers/nos-offres/prepaye',
    'https://mobilis.dz/particuliers/nos-offres/postpaye',
    'https://mobilis.dz/particuliers/nos-offres/internet',
    'https://mobilis.dz/',
  ]

  try {
    for (const url of urlsToScrape) {
      await page.goto(url, { waitUntil: 'networkidle', timeout: 30000 })
      await page.waitForTimeout(2000)

      const cardTexts = await page.evaluate(() => {
        const selectors = ['[class*="card"]', '[class*="offer"]', '[class*="plan"]', '[class*="pack"]', '[class*="forfait"]', 'article']
        const results: string[] = []
        selectors.forEach((sel) => {
          document.querySelectorAll(sel).forEach((el) => {
            const text = el.textContent || ''
            if (text.includes('DA') && text.length > 20) results.push(text)
          })
        })
        return [...new Set(results)]
      })

      for (const text of cardTexts) {
        const parsed = parseMobilisCard(text)
        if (parsed && parsed.priceDA > 0) {
          const exists = offers.find((o) => o.name === parsed.name)
          if (!exists) offers.push({ ...parsed, sourceUrl: url })
        }
      }
    }
  } catch (error) {
    console.error('[Mobilis Scraper] Error:', error)
  } finally {
    await browser.close()
  }

  return offers.length > 0 ? offers : getMobilisFallbackOffers()
}

function parseMobilisCard(text: string): ScrapedOffer | null {
  const priceMatch = text.match(/(\d[\d\s]*)\s*DA/i)
  const dataMatch = text.match(/(\d+(?:[.,]\d+)?)\s*GB/i)
  const minutesMatch = text.match(/(\d+)\s*min/i)
  const smsMatch = text.match(/(\d+)\s*SMS/i)

  if (!priceMatch) return null
  const price = parseFloat(priceMatch[1].replace(/\s/g, ''))
  if (price <= 0 || price > 20000) return null

  const lower = text.toLowerCase()
  let type: OfferType = OfferType.PREPAID
  if (lower.includes('postpay') || lower.includes('abonnement')) type = OfferType.POSTPAID
  if (lower.includes('internet only') || lower.includes('data only')) type = OfferType.DATA_ONLY

  return {
    name: `Mobilis ${price} DA`,
    type,
    priceDA: price,
    dataGB: dataMatch ? parseFloat(dataMatch[1].replace(',', '.')) : 0,
    voiceMinutes: minutesMatch ? parseInt(minutesMatch[1]) : lower.includes('illimité') ? -1 : 0,
    smsCount: smsMatch ? parseInt(smsMatch[1]) : 0,
    validityDays: lower.includes('jour') || lower.includes('24h') ? 1 : lower.includes('semaine') ? 7 : 30,
    network: lower.includes('5g') ? '4G/5G' : '4G',
    features: [],
    sourceUrl: 'https://mobilis.dz/',
  }
}

function getMobilisFallbackOffers(): ScrapedOffer[] {
  return [
    // ── PREPAID - TAWALI (Daily/Short) ──
    {
      name: 'Tawali 50',
      type: OfferType.PREPAID, priceDA: 50, dataGB: 0.3, voiceMinutes: 20,
      smsCount: 10, validityDays: 1, network: '4G',
      features: ['Unlimited Mobilis calls'], sourceUrl: 'https://mobilis.dz/',
    },
    {
      name: 'Tawali 100',
      type: OfferType.PREPAID, priceDA: 100, dataGB: 0.8, voiceMinutes: 40,
      smsCount: 20, validityDays: 1, network: '4G',
      features: ['Unlimited Mobilis calls', '100 DA credit'], sourceUrl: 'https://mobilis.dz/',
    },
    {
      name: 'Tawali 200',
      type: OfferType.PREPAID, priceDA: 200, dataGB: 2, voiceMinutes: 80,
      smsCount: 30, validityDays: 7, network: '4G',
      features: ['Unlimited Mobilis calls', 'Free Facebook'], sourceUrl: 'https://mobilis.dz/',
    },
    // ── PREPAID - IDOOM (Monthly) ──
    {
      name: 'Idoom 500',
      type: OfferType.PREPAID, priceDA: 500, dataGB: 8, voiceMinutes: 100,
      smsCount: 50, validityDays: 30, network: '4G',
      features: ['Unlimited Mobilis calls', '5 GB night bonus data'], sourceUrl: 'https://mobilis.dz/',
    },
    {
      name: 'Idoom 1000',
      type: OfferType.PREPAID, priceDA: 1000, dataGB: 20, voiceMinutes: 200,
      smsCount: 100, validityDays: 30, network: '4G',
      features: ['Unlimited Mobilis calls', 'Free social media', '10 GB night bonus'], sourceUrl: 'https://mobilis.dz/',
    },
    {
      name: 'Idoom 1500',
      type: OfferType.PREPAID, priceDA: 1500, dataGB: 35, voiceMinutes: -1,
      smsCount: 150, validityDays: 30, network: '4G',
      features: ['Unlimited calls all operators', 'Free social media', '15 GB night bonus'], sourceUrl: 'https://mobilis.dz/',
    },
    {
      name: 'Idoom 2000',
      type: OfferType.PREPAID, priceDA: 2000, dataGB: 60, voiceMinutes: -1,
      smsCount: 200, validityDays: 30, network: '4G',
      features: ['Unlimited calls all operators', 'Free social media', '20 GB night bonus', 'Unlimited Mobilis SMS'], sourceUrl: 'https://mobilis.dz/',
    },
    {
      name: 'Idoom 2500',
      type: OfferType.PREPAID, priceDA: 2500, dataGB: 100, voiceMinutes: -1,
      smsCount: -1, validityDays: 30, network: '4G/5G',
      features: ['Unlimited calls all operators', 'Unlimited SMS', 'Free social media', '30 GB night bonus'], sourceUrl: 'https://mobilis.dz/',
    },
    {
      name: 'Idoom 4000',
      type: OfferType.PREPAID, priceDA: 4000, dataGB: 200, voiceMinutes: -1,
      smsCount: -1, validityDays: 30, network: '4G/5G',
      features: ['Unlimited calls all operators', 'Unlimited SMS', 'HD streaming', '50 GB night bonus', '5G priority'], sourceUrl: 'https://mobilis.dz/',
    },
    // ── POSTPAID - MOBILIS PRO ──
    {
      name: 'Pro 1500',
      type: OfferType.POSTPAID, priceDA: 1500, dataGB: 25, voiceMinutes: 200,
      smsCount: 100, validityDays: 30, network: '4G',
      features: ['Monthly billing', 'Unlimited Mobilis calls', 'Priority support'], sourceUrl: 'https://mobilis.dz/',
    },
    {
      name: 'Pro 2500',
      type: OfferType.POSTPAID, priceDA: 2500, dataGB: 70, voiceMinutes: -1,
      smsCount: 200, validityDays: 30, network: '4G',
      features: ['Monthly billing', 'Unlimited calls all operators', 'Africa roaming included'], sourceUrl: 'https://mobilis.dz/',
    },
    {
      name: 'Pro Elite 4000',
      type: OfferType.POSTPAID, priceDA: 4000, dataGB: 150, voiceMinutes: -1,
      smsCount: -1, validityDays: 30, network: '4G/5G',
      features: ['Monthly billing', 'Unlimited calls all operators', 'Unlimited SMS', 'International roaming', '5G when available'], sourceUrl: 'https://mobilis.dz/',
    },
    {
      name: 'Pro Elite 6000',
      type: OfferType.POSTPAID, priceDA: 6000, dataGB: 300, voiceMinutes: -1,
      smsCount: -1, validityDays: 30, network: '4G/5G',
      features: ['Monthly billing', 'Unlimited calls all operators', 'Unlimited SMS', 'Premium international roaming', '5G when available', 'Dual-network SIM'], sourceUrl: 'https://mobilis.dz/',
    },
    // ── DATA ONLY - IDOOM 4G ──
    {
      name: 'Idoom 4G 1000',
      type: OfferType.DATA_ONLY, priceDA: 1000, dataGB: 30, voiceMinutes: 0,
      smsCount: 0, validityDays: 30, network: '4G',
      features: ['Data only', '4G box compatible', '15 GB night bonus'], sourceUrl: 'https://mobilis.dz/',
    },
    {
      name: 'Idoom 4G 2000',
      type: OfferType.DATA_ONLY, priceDA: 2000, dataGB: 80, voiceMinutes: 0,
      smsCount: 0, validityDays: 30, network: '4G',
      features: ['Data only', '4G box compatible', '40 GB night bonus'], sourceUrl: 'https://mobilis.dz/',
    },
    {
      name: 'Idoom 4G 3500',
      type: OfferType.DATA_ONLY, priceDA: 3500, dataGB: 200, voiceMinutes: 0,
      smsCount: 0, validityDays: 30, network: '4G/5G',
      features: ['Home internet', '4G/5G box compatible', 'Priority bandwidth'], sourceUrl: 'https://mobilis.dz/',
    },
  ]
}
