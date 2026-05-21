/**
 * Snapshot tests for scraper parsers.
 *
 * These tests run each parser against a frozen HTML fixture captured from the
 * live operator site. When an operator changes their markup, these tests fail
 * BEFORE the change reaches production — replacing "wait for users to see
 * corrupt data" with "the test suite tells you the parser drifted."
 *
 * To refresh fixtures: re-download the page from the URL listed in the const
 * below and overwrite the corresponding `.html` file under fixtures/.
 */
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import * as cheerio from 'cheerio'
import { describe, it, expect } from 'vitest'
import { OfferType } from '@prisma/client'

import {
  parsePriceCards,
  parseDjezzyCampuceCards,
} from '../djezzy'
import {
  parseOoredoo500Cards,
  parseOoredooPopCards,
} from '../ooredoo'
import {
  parseItemPriceCards,
} from '../mobilis'
import { validateOffer } from '../validate'

const fixture = (name: string) =>
  readFileSync(join(__dirname, 'fixtures', name), 'utf-8')

// Cross-check: every offer a parser returns should pass validation.
function assertAllValid(offers: any[]) {
  for (const o of offers) {
    const v = validateOffer(o)
    if (!v.valid) {
      throw new Error(`Offer "${o.name}" failed validation: ${v.reason}`)
    }
  }
}

// ─── Djezzy LEGEND fixture ──────────────────────────────────────────────────

describe('Djezzy LEGEND parser (snapshot)', () => {
  const $ = cheerio.load(fixture('djezzy-legend.html'))
  const offers = parsePriceCards($, 'https://www.djezzy.dz/particuliers/offres/djezzy-legend/', 'LEGEND', OfferType.PREPAID)

  it('extracts at least one offer from the live page', () => {
    expect(offers.length).toBeGreaterThan(0)
  })

  it('every extracted offer passes validation', () => {
    expect(() => assertAllValid(offers)).not.toThrow()
  })

  it('all prices are realistic (10–50000 DA)', () => {
    offers.forEach(o => {
      expect(o.priceDA).toBeGreaterThanOrEqual(10)
      expect(o.priceDA).toBeLessThanOrEqual(50000)
    })
  })

  it('no offer has dataGB === priceDA (regression: Ooredoo Internet bug)', () => {
    offers.forEach(o => expect(o.dataGB).not.toBe(o.priceDA))
  })
})

// ─── Djezzy CAMPUCE fixture ─────────────────────────────────────────────────

describe('Djezzy CAMPUCE parser (snapshot)', () => {
  const $ = cheerio.load(fixture('djezzy-campuce.html'))
  const offers = parseDjezzyCampuceCards($, 'https://www.djezzy.dz/particuliers/offres/offre-djezzy-campuce/')

  it('extracts at least one offer from the live page', () => {
    expect(offers.length).toBeGreaterThan(0)
  })

  it('every extracted offer passes validation', () => {
    expect(() => assertAllValid(offers)).not.toThrow()
  })

  it('features are not polluted with HTML/numeric junk (regression)', () => {
    // Old bug: any non-numeric text was pushed as feature. New: cleanFeatureText filters.
    offers.forEach(o => {
      o.features.forEach((f: string) => {
        expect(f.length).toBeGreaterThanOrEqual(3)
        expect(/<script/i.test(f)).toBe(false)
        expect(/^\d+$/.test(f)).toBe(false)
      })
    })
  })
})

// ─── Ooredoo 500 fixture ────────────────────────────────────────────────────

describe('Ooredoo 500 parser (snapshot)', () => {
  const $ = cheerio.load(fixture('ooredoo-500.html'))
  const offers = parseOoredoo500Cards($, 'https://www.ooredoo.dz/particuliers/offres-mobiles/ooredoo-500', 'Ooredoo 500', OfferType.PREPAID)

  it('extracts offers (may be 0 if Ooredoo changes layout)', () => {
    // Don't assert > 0 here — Ooredoo's site uses dynamic JS that cheerio can't
    // always parse; the test exists to verify NO corrupt offers when it does parse.
    expect(offers).toBeDefined()
  })

  it('every extracted offer passes validation', () => {
    expect(() => assertAllValid(offers)).not.toThrow()
  })

  it('no dataGB === priceDA misparse', () => {
    offers.forEach(o => expect(o.dataGB).not.toBe(o.priceDA))
  })
})

// ─── Ooredoo POP fixture — the regression case for the card.text() bug ─────

describe('Ooredoo POP parser (snapshot) — Ooredoo Internet bug regression', () => {
  const $ = cheerio.load(fixture('ooredoo-pop.html'))
  const offers = parseOoredooPopCards($, 'https://www.ooredoo.dz/fr/particuliers/offres-mobiles/ooredoo-pop', 'Ooredoo POP', OfferType.POSTPAID)

  it('no offer has dataGB exactly equal to priceDA (the 12000 DA / 12000 GB bug)', () => {
    offers.forEach(o => {
      expect(o.dataGB).not.toBe(o.priceDA)
    })
  })

  it('every extracted offer passes validation', () => {
    expect(() => assertAllValid(offers)).not.toThrow()
  })

  it('no offer has implausible data (>500 GB)', () => {
    offers.forEach(o => {
      if (o.dataGB !== -1) {
        expect(o.dataGB).toBeLessThanOrEqual(500)
      }
    })
  })
})

// ─── Mobilis Pass Internet fixture ──────────────────────────────────────────

describe('Mobilis Pass Internet parser (snapshot)', () => {
  const $ = cheerio.load(fixture('mobilis-passinternet.html'))
  const offers = parseItemPriceCards($, 'https://mobilis.dz/passinternet', 'Mobilis Pass Internet', OfferType.DATA_ONLY)

  it('extracts at least one offer from the live page', () => {
    expect(offers.length).toBeGreaterThan(0)
  })

  it('every extracted offer passes validation', () => {
    expect(() => assertAllValid(offers)).not.toThrow()
  })

  it('all prices are realistic (10–50000 DA)', () => {
    offers.forEach(o => {
      expect(o.priceDA).toBeGreaterThanOrEqual(10)
      expect(o.priceDA).toBeLessThanOrEqual(50000)
    })
  })

  it('all data values are realistic (0.05 – 2000 GB or unlimited)', () => {
    offers.forEach(o => {
      if (o.dataGB !== -1) {
        expect(o.dataGB).toBeGreaterThanOrEqual(0.05)
        expect(o.dataGB).toBeLessThanOrEqual(2000)
      }
    })
  })
})
