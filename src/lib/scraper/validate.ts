/**
 * Scraper Validation & Shared Parsers
 *
 * Single source of truth for text parsing and offer validation across all three
 * operator scrapers. Every scraped offer must pass validateOffer() before being
 * persisted — the orchestrator enforces this as a final gate, and each scraper
 * is expected to call it before pushing into its results array (defense in depth).
 *
 * Design principle: unit-anchored parsers. parseGB("60") returns 0 — only
 * "60 Go" / "60 جيغا" / etc. produce non-zero output. This eliminates the
 * Ooredoo Internet 600/600 misparsing bug at the source.
 */
import { OfferType } from '@prisma/client'

// ─── Shared parsers ─────────────────────────────────────────────────────────

/**
 * Parses a data volume in GB from free text.
 * Accepts French (Go/Mo), English (GB/MB), Arabic (جيغا/ميغا).
 * Returns 0 if no unit-anchored match is found.
 */
export function parseGB(text: string): number {
  if (!text) return 0
  const clean = text.replace(/\s+/g, ' ').trim()

  // Arabic first (more specific patterns)
  const arGiga = clean.match(/([\d.,]+)\s*جيغا/u)
  if (arGiga) return parseFloat(arGiga[1].replace(',', '.'))
  const arMega = clean.match(/([\d.,]+)\s*ميغا/u)
  if (arMega) return parseFloat(arMega[1].replace(',', '.')) / 1024

  // Latin GB — no \b boundary because operator HTML often has "200 GOInternet"
  // (concatenated text from DOM siblings). False positives on words like
  // "google" are vanishingly rare in mobile-plan pricing copy.
  const gb = clean.match(/([\d.,]+)\s*(?:go|gb|giga)/i)
  if (gb) return parseFloat(gb[1].replace(',', '.'))

  // Latin MB — same reasoning
  const mb = clean.match(/([\d.,]+)\s*(?:mo|mb|mega)/i)
  if (mb) return parseFloat(mb[1].replace(',', '.')) / 1024

  return 0
}

/**
 * Parses a price in DA from free text. Requires a unit marker (DA or دج).
 * Returns 0 if no unit-anchored match is found.
 */
export function parsePriceDA(text: string): number {
  if (!text) return 0
  const clean = text.replace(/\s+/g, ' ').trim()

  // Arabic — no word boundary after دج (Arabic chars are not \w in JS regex)
  const ar = clean.match(/(\d[\d\s]*?)\s*دج/u)
  if (ar) {
    const n = parseInt(ar[1].replace(/\s/g, ''))
    return isNaN(n) ? 0 : n
  }

  // Latin (case-insensitive, anchored on "DA" word boundary)
  const la = clean.match(/(\d[\d\s]*?)\s*da\b/i)
  if (la) {
    const n = parseInt(la[1].replace(/\s/g, ''))
    return isNaN(n) ? 0 : n
  }

  return 0
}

/**
 * Parses validity in days from free text.
 * Handles French (jours/semaines/mois/mensuel) and Arabic
 * (يوم/أيام/شهر/أشهر/شهريا and diacritic variants).
 * Returns 30 (monthly default) if no match.
 */
export function parseValidityDays(text: string): number {
  if (!text) return 30
  const clean = text.replace(/\s+/g, ' ').trim()

  // Arabic monthly indicators (including diacritic and prefix variants)
  if (/شهريّا|شهرياً|شهريا|شهري(?!ن)|الشهر|بالشهر|منشهر/u.test(clean)) return 30

  const arMonths = clean.match(/(\d+)\s*(?:أشهر|اشهر|شهور|شهر)/u)
  if (arMonths) return parseInt(arMonths[1]) * 30

  const arDays = clean.match(/(\d+)\s*(?:أيام|ايام|يوم)/u)
  if (arDays) return parseInt(arDays[1])

  // French
  if (/\bmensuel\b/i.test(clean)) return 30
  const frWeeks = clean.match(/(\d+)\s*semaines?/i)
  if (frWeeks) return parseInt(frWeeks[1]) * 7
  const frMonths = clean.match(/(\d+)\s*mois/i)
  if (frMonths) return parseInt(frMonths[1]) * 30
  const frDays = clean.match(/(\d+)\s*jours?/i)
  if (frDays) return parseInt(frDays[1])

  // English
  const enMonths = clean.match(/(\d+)\s*months?/i)
  if (enMonths) return parseInt(enMonths[1]) * 30
  const enDays = clean.match(/(\d+)\s*days?/i)
  if (enDays) return parseInt(enDays[1])

  // Hour-based validity (daily passes shown as "24سا" — Mobilis's Arabic
  // abbreviation for hours, often with no space — or "24 ساعة", "24 heures",
  // "24 hours"). No trailing \b: Arabic letters are not regex word characters,
  // so a \b after "سا" would never match. Round up to whole days, minimum 1.
  const hours = clean.match(/(\d+)\s*(?:ساعات|ساعة|سا|heures?|hours?)/iu)
  if (hours) return Math.max(1, Math.round(parseInt(hours[1]) / 24))

  return 30
}

/**
 * Strips HTML, collapses whitespace, trims, truncates to maxLen.
 */
export function cleanText(s: string, maxLen = 100): string {
  if (!s) return ''
  return s
    .replace(/<[^>]*>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, maxLen)
}

/**
 * Validates and cleans a single feature line. Returns null if the line is
 * noise (too short, contains <script>, looks like a numeric field rather
 * than a feature description).
 */
export function cleanFeatureText(s: string): string | null {
  if (!s) return null
  const cleaned = cleanText(s, 150)
  if (cleaned.length < 3) return null
  if (/<script/i.test(s)) return null
  if (/^\d+$/.test(cleaned)) return null // pure digits
  // Looks like a price line ("1500 DA") or pure data ("60 Go") — not a feature
  if (parsePriceDA(cleaned) > 0 && cleaned.length < 15) return null
  if (parseGB(cleaned) > 0 && cleaned.length < 15) return null
  return cleaned
}

// ─── Validation ─────────────────────────────────────────────────────────────

export interface ScrapedOffer {
  name: string
  type: OfferType | string
  priceDA: number
  dataGB: number
  voiceMinutes: number
  smsCount: number
  validityDays: number
  network: string
  features: string[]
  sourceUrl: string
}

export type ValidationResult =
  | { valid: true }
  | { valid: false; reason: string }

const VALID_TYPES = new Set(['PREPAID', 'POSTPAID', 'DATA_ONLY'])

/**
 * Validates a scraped offer against 12 invariants. Returns { valid: true }
 * when every rule passes; otherwise { valid: false, reason } with the first
 * rule that failed (for logging).
 *
 * Cross-field rules catch the Ooredoo Internet bug pattern where misparsing
 * fell back to whole-card text and produced dataGB === priceDA.
 */
export function validateOffer(o: ScrapedOffer): ValidationResult {
  // name
  if (!o.name || typeof o.name !== 'string') return { valid: false, reason: 'name missing' }
  const trimmed = o.name.trim()
  if (trimmed.length < 3) return { valid: false, reason: `name too short (${trimmed.length} chars)` }
  if (trimmed.length > 100) return { valid: false, reason: `name too long (${trimmed.length} chars)` }
  if (/<script/i.test(trimmed)) return { valid: false, reason: 'name contains <script>' }
  if (/[<>]/.test(trimmed)) return { valid: false, reason: 'name contains raw HTML brackets' }

  // priceDA
  if (typeof o.priceDA !== 'number' || isNaN(o.priceDA)) return { valid: false, reason: 'priceDA not a number' }
  if (!Number.isInteger(o.priceDA)) return { valid: false, reason: 'priceDA not an integer' }
  if (o.priceDA < 10) return { valid: false, reason: `priceDA ${o.priceDA} below 10 DA` }
  if (o.priceDA > 50000) return { valid: false, reason: `priceDA ${o.priceDA} above 50000 DA` }

  // dataGB — floor 0.02 GB (~20 MB) admits real micro-bundles (e.g. 50 MB daily
  // plans parse to ~0.049 GB) while still rejecting parse-garbage like 0.001.
  if (typeof o.dataGB !== 'number' || isNaN(o.dataGB)) return { valid: false, reason: 'dataGB not a number' }
  if (o.dataGB !== -1) {
    if (o.dataGB < 0.02) return { valid: false, reason: `dataGB ${o.dataGB} below 0.02 GB` }
    if (o.dataGB > 2000) return { valid: false, reason: `dataGB ${o.dataGB} above 2000 GB` }
  }

  // voiceMinutes
  if (typeof o.voiceMinutes !== 'number' || isNaN(o.voiceMinutes)) return { valid: false, reason: 'voiceMinutes not a number' }
  if (o.voiceMinutes !== -1) {
    if (o.voiceMinutes < 0) return { valid: false, reason: `voiceMinutes ${o.voiceMinutes} negative` }
    if (o.voiceMinutes > 100000) return { valid: false, reason: `voiceMinutes ${o.voiceMinutes} above 100000` }
  }

  // smsCount
  if (typeof o.smsCount !== 'number' || isNaN(o.smsCount)) return { valid: false, reason: 'smsCount not a number' }
  if (o.smsCount !== -1) {
    if (o.smsCount < 0) return { valid: false, reason: `smsCount ${o.smsCount} negative` }
    if (o.smsCount > 100000) return { valid: false, reason: `smsCount ${o.smsCount} above 100000` }
  }

  // validityDays
  if (typeof o.validityDays !== 'number' || isNaN(o.validityDays)) return { valid: false, reason: 'validityDays not a number' }
  if (!Number.isInteger(o.validityDays)) return { valid: false, reason: 'validityDays not an integer' }
  if (o.validityDays < 1) return { valid: false, reason: `validityDays ${o.validityDays} below 1` }
  if (o.validityDays > 365) return { valid: false, reason: `validityDays ${o.validityDays} above 365` }

  // type
  if (!VALID_TYPES.has(o.type as string)) return { valid: false, reason: `type "${o.type}" not in PREPAID/POSTPAID/DATA_ONLY` }

  // network
  if (!o.network || typeof o.network !== 'string' || o.network.trim().length === 0) {
    return { valid: false, reason: 'network missing or empty' }
  }

  // features
  if (!Array.isArray(o.features)) return { valid: false, reason: 'features not an array' }
  for (const f of o.features) {
    if (typeof f !== 'string') return { valid: false, reason: 'feature not a string' }
    if (f.length > 200) return { valid: false, reason: `feature length ${f.length} above 200` }
    if (/<script/i.test(f)) return { valid: false, reason: 'feature contains <script>' }
  }

  // sourceUrl
  if (!o.sourceUrl || typeof o.sourceUrl !== 'string') return { valid: false, reason: 'sourceUrl missing' }
  if (!o.sourceUrl.startsWith('https://')) return { valid: false, reason: `sourceUrl "${o.sourceUrl}" not https` }

  // Cross-field sanity: the Ooredoo Internet bug pattern
  if (o.dataGB === o.priceDA && o.priceDA > 0) {
    return { valid: false, reason: `dataGB === priceDA (${o.priceDA}) — almost certainly misparsing` }
  }

  // Cross-field sanity: implausibly cheap data (< 1 DA per GB for high-volume plans)
  if (o.dataGB > 100 && o.priceDA / o.dataGB < 1) {
    return { valid: false, reason: `priceDA/dataGB ratio ${(o.priceDA / o.dataGB).toFixed(2)} below 1 DA/GB for ${o.dataGB} GB — implausible` }
  }

  return { valid: true }
}
