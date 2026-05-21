import { describe, it, expect } from 'vitest'
import {
  parseGB,
  parsePriceDA,
  parseValidityDays,
  cleanText,
  cleanFeatureText,
  validateOffer,
  type ScrapedOffer,
} from '../validate'
import { OfferType } from '@prisma/client'

// ─── Shared parser tests ────────────────────────────────────────────────────

describe('parseGB', () => {
  it('parses French Go', () => expect(parseGB('15 Go')).toBe(15))
  it('parses French Go without space', () => expect(parseGB('15Go')).toBe(15))
  it('parses English GB', () => expect(parseGB('1.5 GB')).toBe(1.5))
  it('parses Arabic giga', () => expect(parseGB('60 جيغا')).toBe(60))
  it('parses French Mo as fraction of GB', () => {
    const v = parseGB('500 Mo')
    expect(v).toBeGreaterThan(0.48)
    expect(v).toBeLessThan(0.5)
  })
  it('parses Arabic mega as fraction of GB', () => {
    const v = parseGB('300 ميغا')
    expect(v).toBeGreaterThan(0.29)
    expect(v).toBeLessThan(0.30)
  })
  it('returns 0 for digits without unit', () => expect(parseGB('60')).toBe(0))
  it('returns 0 for junk', () => expect(parseGB('hello world')).toBe(0))
  it('returns 0 for empty string', () => expect(parseGB('')).toBe(0))
  it('handles comma decimal separator', () => expect(parseGB('1,5 Go')).toBe(1.5))
})

describe('parsePriceDA', () => {
  it('parses "1500 DA"', () => expect(parsePriceDA('1500 DA')).toBe(1500))
  it('parses "1 500 DA" (thin space)', () => expect(parsePriceDA('1 500 DA')).toBe(1500))
  it('parses Arabic "1500 دج"', () => expect(parsePriceDA('1500 دج')).toBe(1500))
  it('parses case-insensitive', () => expect(parsePriceDA('1500 da')).toBe(1500))
  it('returns 0 for digits without unit', () => expect(parsePriceDA('1500')).toBe(0))
  it('returns 0 for junk', () => expect(parsePriceDA('hello')).toBe(0))
  it('returns 0 for empty', () => expect(parsePriceDA('')).toBe(0))
})

describe('parseValidityDays', () => {
  it('parses French jours', () => expect(parseValidityDays('30 jours')).toBe(30))
  it('parses French semaines', () => expect(parseValidityDays('4 semaines')).toBe(28))
  it('parses French mois', () => expect(parseValidityDays('3 mois')).toBe(90))
  it('parses Arabic يوم', () => expect(parseValidityDays('30 يوم')).toBe(30))
  it('parses Arabic أشهر', () => expect(parseValidityDays('3 أشهر')).toBe(90))
  it('parses Arabic شهريا (monthly)', () => expect(parseValidityDays('شهريا')).toBe(30))
  it('parses Arabic شهريّا diacritic variant', () => expect(parseValidityDays('شهريّا')).toBe(30))
  it('parses Arabic شهرياً diacritic variant', () => expect(parseValidityDays('شهرياً')).toBe(30))
  it('parses Arabic الشهر', () => expect(parseValidityDays('الشهر')).toBe(30))
  it('parses French mensuel', () => expect(parseValidityDays('mensuel')).toBe(30))
  it('defaults to 30 for empty', () => expect(parseValidityDays('')).toBe(30))
  it('defaults to 30 for junk', () => expect(parseValidityDays('hello')).toBe(30))
})

describe('cleanText', () => {
  it('strips HTML tags', () => expect(cleanText('<b>hello</b>')).toBe('hello'))
  it('collapses whitespace', () => expect(cleanText('hello    world')).toBe('hello world'))
  it('truncates to maxLen', () => expect(cleanText('abcdefghij', 5)).toBe('abcde'))
})

describe('cleanFeatureText', () => {
  it('returns null for <script>', () => expect(cleanFeatureText('<script>alert(1)</script>')).toBeNull())
  it('returns null for pure digits', () => expect(cleanFeatureText('123')).toBeNull())
  it('returns null for short strings', () => expect(cleanFeatureText('ab')).toBeNull())
  it('returns null for empty', () => expect(cleanFeatureText('')).toBeNull())
  it('returns null for short price lines', () => expect(cleanFeatureText('1500 DA')).toBeNull())
  it('returns null for short data lines', () => expect(cleanFeatureText('15 Go')).toBeNull())
  it('keeps legitimate features', () => {
    expect(cleanFeatureText('Unlimited social media')).toBe('Unlimited social media')
  })
  it('keeps features with embedded numbers in context', () => {
    expect(cleanFeatureText('1500 DA credit for international calls')).toBe('1500 DA credit for international calls')
  })
})

// ─── Validation rule tests ──────────────────────────────────────────────────

const goodOffer = (): ScrapedOffer => ({
  name: 'Test Plan 1500',
  type: OfferType.PREPAID,
  priceDA: 1500,
  dataGB: 25,
  voiceMinutes: 100,
  smsCount: 50,
  validityDays: 30,
  network: '4G',
  features: ['Unlimited calls'],
  sourceUrl: 'https://www.example.com/plan',
})

describe('validateOffer — passes on a good offer', () => {
  it('valid baseline', () => {
    expect(validateOffer(goodOffer())).toEqual({ valid: true })
  })
})

describe('validateOffer — name rules', () => {
  it('rejects too short name', () => {
    const o = goodOffer(); o.name = 'AB'
    const r = validateOffer(o)
    expect(r.valid).toBe(false)
  })
  it('rejects too long name', () => {
    const o = goodOffer(); o.name = 'x'.repeat(101)
    expect(validateOffer(o).valid).toBe(false)
  })
  it('rejects name with <script>', () => {
    const o = goodOffer(); o.name = 'Plan <script>alert(1)</script>'
    expect(validateOffer(o).valid).toBe(false)
  })
  it('rejects name with HTML brackets', () => {
    const o = goodOffer(); o.name = 'Plan <span>X</span>'
    expect(validateOffer(o).valid).toBe(false)
  })
})

describe('validateOffer — price rules', () => {
  it('rejects price below 10', () => {
    const o = goodOffer(); o.priceDA = 5
    expect(validateOffer(o).valid).toBe(false)
  })
  it('rejects price above 50000', () => {
    const o = goodOffer(); o.priceDA = 60000
    expect(validateOffer(o).valid).toBe(false)
  })
  it('rejects non-integer price', () => {
    const o = goodOffer(); o.priceDA = 1500.5
    expect(validateOffer(o).valid).toBe(false)
  })
})

describe('validateOffer — data rules', () => {
  it('accepts -1 unlimited', () => {
    const o = goodOffer(); o.dataGB = -1
    expect(validateOffer(o).valid).toBe(true)
  })
  it('rejects parse-garbage data below 0.02 GB', () => {
    const o = goodOffer(); o.dataGB = 0.001
    expect(validateOffer(o).valid).toBe(false)
  })
  it('accepts real micro-bundles (~50 MB / 0.049 GB)', () => {
    const o = goodOffer(); o.dataGB = 50 / 1024
    expect(validateOffer(o).valid).toBe(true)
  })
  it('rejects above 2000 GB', () => {
    const o = goodOffer(); o.dataGB = 5000
    expect(validateOffer(o).valid).toBe(false)
  })
})

describe('validateOffer — Ooredoo Internet bug regression', () => {
  it('rejects dataGB === priceDA exactly (600 DA / 600 GB)', () => {
    const o = goodOffer(); o.priceDA = 600; o.dataGB = 600
    const r = validateOffer(o)
    expect(r.valid).toBe(false)
    if (!r.valid) expect(r.reason).toMatch(/dataGB === priceDA/)
  })
  it('rejects 12000 DA / 12000 GB (the worst case from production)', () => {
    const o = goodOffer(); o.priceDA = 12000; o.dataGB = 12000
    expect(validateOffer(o).valid).toBe(false)
  })
  it('rejects implausibly cheap data (priceDA/dataGB < 1 with dataGB > 100)', () => {
    const o = goodOffer(); o.priceDA = 100; o.dataGB = 500 // 0.2 DA/GB — impossible
    const r = validateOffer(o)
    expect(r.valid).toBe(false)
  })
})

describe('validateOffer — feature rules', () => {
  it('rejects feature with <script>', () => {
    const o = goodOffer(); o.features = ['<script>x</script>']
    expect(validateOffer(o).valid).toBe(false)
  })
  it('rejects feature too long', () => {
    const o = goodOffer(); o.features = ['x'.repeat(201)]
    expect(validateOffer(o).valid).toBe(false)
  })
  it('accepts empty features array', () => {
    const o = goodOffer(); o.features = []
    expect(validateOffer(o).valid).toBe(true)
  })
})

describe('validateOffer — sourceUrl rules', () => {
  it('rejects http (not https)', () => {
    const o = goodOffer(); o.sourceUrl = 'http://example.com'
    expect(validateOffer(o).valid).toBe(false)
  })
  it('rejects empty sourceUrl', () => {
    const o = goodOffer(); o.sourceUrl = ''
    expect(validateOffer(o).valid).toBe(false)
  })
})

describe('validateOffer — type rules', () => {
  it('accepts PREPAID', () => {
    const o = goodOffer(); o.type = 'PREPAID'
    expect(validateOffer(o).valid).toBe(true)
  })
  it('accepts POSTPAID', () => {
    const o = goodOffer(); o.type = 'POSTPAID'
    expect(validateOffer(o).valid).toBe(true)
  })
  it('accepts DATA_ONLY', () => {
    const o = goodOffer(); o.type = 'DATA_ONLY'
    expect(validateOffer(o).valid).toBe(true)
  })
  it('rejects unknown type', () => {
    const o = goodOffer(); o.type = 'INVALID'
    expect(validateOffer(o).valid).toBe(false)
  })
})

describe('validateOffer — validityDays rules', () => {
  it('rejects 0 days', () => {
    const o = goodOffer(); o.validityDays = 0
    expect(validateOffer(o).valid).toBe(false)
  })
  it('rejects >365 days', () => {
    const o = goodOffer(); o.validityDays = 400
    expect(validateOffer(o).valid).toBe(false)
  })
  it('accepts 365 (annual)', () => {
    const o = goodOffer(); o.validityDays = 365
    expect(validateOffer(o).valid).toBe(true)
  })
})
