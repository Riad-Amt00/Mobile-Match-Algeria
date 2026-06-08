import { describe, it, expect } from 'vitest'
import { recommendOffers } from '../recommendation'

// ─── Shared mock catalogue ────────────────────────────────────────────────────
// 8 offers covering the range of prices, data volumes, and voice capabilities
// used by the 4 thesis validation test cases (Table 4.2) plus the extra cases below.

const OFFERS = [
  {
    id: 'o1', name: 'Djezzy Flexy 15Go', operatorId: 'djezzy',
    priceDA: 1000, dataGB: 15, voiceMinutes: 60, smsCount: 50,
    type: 'PREPAID', network: '4G', validityDays: 30, features: '[]',
  },
  {
    id: 'o2', name: 'Djezzy Legend Max', operatorId: 'djezzy',
    priceDA: 3000, dataGB: 30, voiceMinutes: -1, smsCount: -1,
    type: 'PREPAID', network: '4G', validityDays: 30, features: '[]',
  },
  {
    id: 'o3', name: 'Ooredoo Data Sim Max 60Go', operatorId: 'ooredoo',
    priceDA: 4500, dataGB: 60, voiceMinutes: 0, smsCount: 0,
    type: 'DATA_ONLY', network: '4G', validityDays: 30, features: '[]',
  },
  {
    id: 'o4', name: 'Ooredoo Illimix 5Go', operatorId: 'ooredoo',
    priceDA: 800, dataGB: 5, voiceMinutes: 120, smsCount: 100,
    type: 'PREPAID', network: '4G', validityDays: 30, features: '[]',
  },
  {
    id: 'o5', name: 'Mobilis Start 2Go', operatorId: 'mobilis',
    priceDA: 500, dataGB: 2, voiceMinutes: 30, smsCount: 20,
    type: 'PREPAID', network: '4G', validityDays: 7, features: '[]',
  },
  {
    id: 'o6', name: 'Mobilis Max 40Go', operatorId: 'mobilis',
    priceDA: 3500, dataGB: 40, voiceMinutes: 200, smsCount: 100,
    type: 'PREPAID', network: '4G', validityDays: 30, features: '[]',
  },
  {
    id: 'o7', name: 'Ooredoo Premium 5G', operatorId: 'ooredoo',
    priceDA: 5000, dataGB: -1, voiceMinutes: -1, smsCount: -1,
    type: 'POSTPAID', network: '5G', validityDays: 30, features: '["streaming"]',
  },
  {
    id: 'o8', name: 'Djezzy Basic 1Go', operatorId: 'djezzy',
    priceDA: 300, dataGB: 1, voiceMinutes: 30, smsCount: 10,
    type: 'PREPAID', network: '4G', validityDays: 7, features: '[]',
  },
]

// ─── Thesis Table 4.2 — four validated test cases ────────────────────────────

describe('thesis test cases (Table 4.2)', () => {
  it('TC1 — budget 1000DA, data 5Go, priorities [data, price]: top covers the need within the budget ceiling', () => {
    const results = recommendOffers(OFFERS, { budget: 1000, dataGB: 5, voiceMinutes: 0, smsCount: 0 }, 3, ['data', 'price'])
    expect(results.length).toBeGreaterThan(0)
    const top = results[0].offer
    // Budget is a hard ceiling — even with data as the priority, no offer above 1000DA
    // may be recommended; among in-budget offers the largest-data one (o1, 15GB) leads.
    expect(top.priceDA).toBeLessThanOrEqual(1000)
    expect(top.id).toBe('o1')
    expect(top.dataGB === -1 || top.dataGB >= 5).toBe(true)
  })

  it('TC2 — budget 5000DA, data 100Go, priorities [data, price]: unlimited data is preferred over any finite volume', () => {
    const results = recommendOffers(OFFERS, { budget: 5000, dataGB: 100, voiceMinutes: 0, smsCount: 0 }, 3, ['data', 'price'])
    expect(results.length).toBeGreaterThan(0)
    const top = results[0].offer
    // o7 (unlimited, 5000DA) wins — an unlimited allowance maps above the best finite volume.
    expect(top.id).toBe('o7')
    expect(top.dataGB).toBe(-1)
  })

  it('TC3 — budget 1400DA, data 20Go, priorities [price, data]: best value-for-money (ROC weight 0.75 on price) leads', () => {
    const results = recommendOffers(OFFERS, { budget: 1400, dataGB: 20, voiceMinutes: 0, smsCount: 0 }, 8, ['price', 'data'])
    // Survivors ≤1400DA, with price scored as cost-per-GB (DA/GB):
    //   o1 1000/15 = 66.7,  o4 800/5 = 160,  o5 500/2 = 250,  o8 300/1 = 300.
    // ROC weights price 0.75 vs data 0.25, so the ranking is driven by value for
    // money: the best-value plan (o1) leads, while the cheapest, near-empty plan
    // (o8 — worst value) ranks last. Cheap no longer means "best".
    expect(results[0].offer.id).toBe('o1')
    const o8i = results.findIndex(r => r.offer.id === 'o8')
    const o4i = results.findIndex(r => r.offer.id === 'o4')
    expect(o4i).toBeLessThan(o8i)
  })

  it('TC4 — budget 50DA (below all prices), priorities [price, data]: engine returns empty result', () => {
    const results = recommendOffers(OFFERS, { budget: 50, dataGB: 5, voiceMinutes: 0, smsCount: 0 }, 3, ['price', 'data'])
    expect(results).toHaveLength(0)
  })
})

// ─── A priority ranking is required ───────────────────────────────────────────
// The engine optimises towards the ranked criteria, so with no ranking there is
// nothing to optimise and it returns nothing (the /recommend page enforces this).

describe('ranking is required', () => {
  it('no priorities → no recommendations', () => {
    const results = recommendOffers(OFFERS, { budget: 5000, dataGB: 20, voiceMinutes: 0, smsCount: 0 })
    expect(results).toHaveLength(0)
  })

  it('empty rank slots (as the UI sends them) → no recommendations', () => {
    const results = recommendOffers(OFFERS, { budget: 5000, dataGB: 20, voiceMinutes: 0, smsCount: 0 }, 3, ['', ''])
    expect(results).toHaveLength(0)
  })
})

// ─── Ranked priority elicitation ──────────────────────────────────────────────
// The user ranks up to 2 criteria. Offers are tiered by the 1st priority's merit
// (closeness to the user's target); the 2nd priority orders offers within a tier.

describe('ranked priority elicitation', () => {
  it('priorities=[price]: the best value-for-money in-budget offer rises to top', () => {
    // Price is scored as cost per GB (value for money), so a price priority surfaces
    // the plan with the lowest DA/GB within budget — not necessarily the cheapest.
    const withPriority = recommendOffers(OFFERS, { budget: 3000, dataGB: 10, voiceMinutes: 0, smsCount: 0 }, 3, ['price'])
    const bestValue = OFFERS
      .filter(o => o.priceDA <= 3000)
      .reduce((best, o) =>
        o.priceDA / Math.max(o.dataGB, 0.1) < best.priceDA / Math.max(best.dataGB, 0.1) ? o : best)
    expect(withPriority[0].offer.id).toBe(bestValue.id)
  })

  it('priorities=[data]: every top result covers the stated data need', () => {
    // Merit is need-relative — a data priority surfaces offers that COVER the need,
    // not the single biggest plan in the catalogue (which may be wild overkill).
    const withPriority = recommendOffers(OFFERS, { budget: 5000, dataGB: 20, voiceMinutes: 0, smsCount: 0 }, 3, ['data'])
    withPriority.forEach(r => {
      expect(r.offer.dataGB === -1 || r.offer.dataGB >= 20).toBe(true)
    })
  })

  it('priorities=[calls]: offer with unlimited calls receives boost', () => {
    const results = recommendOffers(OFFERS, { budget: 4000, dataGB: 10, voiceMinutes: 100, smsCount: 0 }, 3, ['calls'])
    expect(results[0].offer.voiceMinutes).toBe(-1)
  })

  it('priority boost match reason is present', () => {
    const results = recommendOffers(OFFERS, { budget: 4000, dataGB: 10, voiceMinutes: 100, smsCount: 0 }, 3, ['calls'])
    const reasons = results[0].matchReasons.map(r => r.key)
    expect(reasons).toContain('match.priority.calls')
  })

  it('price priority surfaces the best value-for-money offer within the budget ceiling', () => {
    const yesP = recommendOffers(OFFERS, { budget: 4000, dataGB: 0, voiceMinutes: 0, smsCount: 0 }, 3, ['price'])
    const bestValue = OFFERS
      .filter(o => o.priceDA <= 4000)
      .reduce((best, o) =>
        o.priceDA / Math.max(o.dataGB, 0.1) < best.priceDA / Math.max(best.dataGB, 0.1) ? o : best)
    // top result = the best value-for-money (lowest DA/GB) in-budget offer
    expect(yesP[0].offer.id).toBe(bestValue.id)
    expect(yesP[0].matchReasons.some(m => m.key === 'match.priority.price')).toBe(true)
  })

  it('priority weighting: ranking price first favours value-for-money, data first favours volume', () => {
    // TOPSIS is compensatory, so a priority does not STRICTLY tier the result, but the
    // ROC weights steer the order: a high-value, modest-data plan (o1, 66.7 DA/GB)
    // climbs when price is #1, while a higher-data, weaker-value plan (o2) climbs when
    // data is #1. Results are always ordered by closeness (score) descending.
    const needs = { budget: 5000, dataGB: 100, voiceMinutes: 0, smsCount: 0 }
    const priceFirst = recommendOffers(OFFERS, needs, 8, ['price', 'data'])
    const dataFirst  = recommendOffers(OFFERS, needs, 8, ['data', 'price'])
    const rankOf = (res: any[], id: string) => res.findIndex(r => r.offer.id === id)
    expect(rankOf(priceFirst, 'o1')).toBeLessThan(rankOf(dataFirst, 'o1'))
    expect(rankOf(dataFirst, 'o2')).toBeLessThan(rankOf(priceFirst, 'o2'))
    for (let i = 1; i < priceFirst.length; i++) {
      expect(priceFirst[i - 1].score).toBeGreaterThanOrEqual(priceFirst[i].score)
    }
  })

  it('multiple priorities each contribute their own match reason', () => {
    const results = recommendOffers(OFFERS, { budget: 3000, dataGB: 10, voiceMinutes: 100, smsCount: 0 }, 8, ['price', 'calls'])
    const allReasons = results.flatMap(r => r.matchReasons.map(m => m.key))
    expect(allReasons).toContain('match.priority.price')
    expect(allReasons).toContain('match.priority.calls')
  })
})

// ─── Budget hard ceiling ──────────────────────────────────────────────────────

describe('budget hard ceiling', () => {
  it('no recommended offer ever exceeds the stated budget', () => {
    const results = recommendOffers(OFFERS, { budget: 1000, dataGB: 5, voiceMinutes: 0, smsCount: 0 }, 8, ['price'])
    expect(results.length).toBeGreaterThan(0)
    results.forEach(r => {
      expect(r.offer.priceDA).toBeLessThanOrEqual(1000)
    })
  })

  it('an offer priced just above budget is excluded', () => {
    // o1 is 1000DA — above a 900DA budget, so it must not appear.
    const results = recommendOffers(OFFERS, { budget: 900, dataGB: 5, voiceMinutes: 0, smsCount: 0 }, 8, ['price'])
    expect(results.map(r => r.offer.id)).not.toContain('o1')
  })
})

// ─── Score bounds ─────────────────────────────────────────────────────────────

describe('score bounds', () => {
  it('all scores are between 0 and 100', () => {
    const results = recommendOffers(OFFERS, { budget: 3000, dataGB: 20, voiceMinutes: 100, smsCount: 50 }, 8, ['price', 'data'])
    expect(results.length).toBeGreaterThan(0)
    results.forEach(r => {
      expect(r.score).toBeGreaterThanOrEqual(0)
      expect(r.score).toBeLessThanOrEqual(100)
    })
  })

  it('results are sorted descending by score', () => {
    const results = recommendOffers(OFFERS, { budget: 5000, dataGB: 30, voiceMinutes: 60, smsCount: 0 }, 5, ['data', 'price'])
    for (let i = 1; i < results.length; i++) {
      expect(results[i - 1].score).toBeGreaterThanOrEqual(results[i].score)
    }
  })
})
