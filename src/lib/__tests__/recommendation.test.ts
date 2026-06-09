import { describe, it, expect } from 'vitest'
import { recommendOffers } from '../recommendation'

// ─── Shared mock catalogue ────────────────────────────────────────────────────
// 8 offers covering the range of prices, data volumes, and voice/SMS capabilities
// used by the thesis validation test cases (Table 4.2) plus the behavioural cases
// below. The engine ranks survivors with TOPSIS over two equally-weighted criteria:
// value for money (price per GB — a cost criterion) and data volume (a benefit).

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
  it('TC1 — budget 1000DA, data 5Go: best value-for-money within the ceiling leads', () => {
    const results = recommendOffers(OFFERS, { budget: 1000, dataGB: 5, voiceMinutes: 0, smsCount: 0 }, 8)
    expect(results.length).toBeGreaterThan(0)
    const top = results[0].offer
    // Budget is a hard ceiling — no offer above 1000DA may be recommended. Among the
    // survivors o1 (15GB at 66.7 DA/GB) dominates on both criteria, so it leads.
    expect(top.priceDA).toBeLessThanOrEqual(1000)
    expect(top.id).toBe('o1')
    // The cheapest, near-empty plan (o8, worst on both criteria) ranks last.
    expect(results[results.length - 1].offer.id).toBe('o8')
  })

  it('TC2 — budget 5000DA, data 100Go: unlimited data is preferred over any finite volume', () => {
    const results = recommendOffers(OFFERS, { budget: 5000, dataGB: 100, voiceMinutes: 0, smsCount: 0 }, 3)
    expect(results.length).toBeGreaterThan(0)
    const top = results[0].offer
    // o7 (unlimited, 5000DA) wins — an unlimited allowance maps above the best finite
    // volume on BOTH data and value-for-money.
    expect(top.id).toBe('o7')
    expect(top.dataGB).toBe(-1)
  })

  it('TC3 — budget 3500DA, data 30Go: the best data/value balance leads, cheapest-empty ranks last', () => {
    const results = recommendOffers(OFFERS, { budget: 3500, dataGB: 30, voiceMinutes: 0, smsCount: 0 }, 8)
    // Survivors ≤3500DA. TOPSIS weighs value for money and data volume equally, so the
    // plan offering the most data at a reasonable cost-per-GB (o6, 40GB at 87.5 DA/GB)
    // leads, while the cheapest, near-empty plan (o8 — worst on both) ranks last.
    expect(results[0].offer.id).toBe('o6')
    expect(results[results.length - 1].offer.id).toBe('o8')
  })

  it('TC4 — budget 50DA (below all prices): engine returns an empty result', () => {
    const results = recommendOffers(OFFERS, { budget: 50, dataGB: 5, voiceMinutes: 0, smsCount: 0 }, 3)
    expect(results).toHaveLength(0)
  })
})

// ─── Value for money, not just "cheapest" ─────────────────────────────────────
// Price is scored as cost per GB, and data counts equally, so a near-empty plan that
// happens to be the cheapest in absolute terms never wins.

describe('value for money', () => {
  it('the cheapest, near-empty plan never leads and ranks last', () => {
    const results = recommendOffers(OFFERS, { budget: 3000, dataGB: 0, voiceMinutes: 0, smsCount: 0 }, 8)
    expect(results.length).toBeGreaterThan(1)
    // o8 (300DA but only 1GB → 300 DA/GB) is the absolute cheapest yet the worst value.
    expect(results[0].offer.id).not.toBe('o8')
    expect(results[results.length - 1].offer.id).toBe('o8')
  })

  it('a single feasible offer is trivially the closest (score 100)', () => {
    const results = recommendOffers(OFFERS, { budget: 350, dataGB: 1, voiceMinutes: 0, smsCount: 0 }, 3)
    expect(results).toHaveLength(1)
    expect(results[0].offer.id).toBe('o8')
    expect(results[0].score).toBe(100)
  })
})

// ─── Hard constraints (screening before ranking) ─────────────────────────────

describe('hard constraints', () => {
  it('budget is a strict ceiling — no recommended offer ever exceeds it', () => {
    const results = recommendOffers(OFFERS, { budget: 1000, dataGB: 5, voiceMinutes: 0, smsCount: 0 }, 8)
    expect(results.length).toBeGreaterThan(0)
    results.forEach(r => expect(r.offer.priceDA).toBeLessThanOrEqual(1000))
  })

  it('an offer priced just above budget is excluded', () => {
    // o1 is 1000DA — above a 900DA budget, so it must not appear.
    const results = recommendOffers(OFFERS, { budget: 900, dataGB: 5, voiceMinutes: 0, smsCount: 0 }, 8)
    expect(results.map(r => r.offer.id)).not.toContain('o1')
  })

  it('plan-type filter keeps only matching offers', () => {
    const results = recommendOffers(OFFERS, { budget: 5000, dataGB: 0, voiceMinutes: 0, smsCount: 0, type: 'DATA_ONLY' }, 8)
    expect(results.every(r => r.offer.type === 'DATA_ONLY')).toBe(true)
    expect(results.map(r => r.offer.id)).toEqual(['o3'])
  })

  it('network filter keeps only matching offers', () => {
    const results = recommendOffers(OFFERS, { budget: 6000, dataGB: 0, voiceMinutes: 0, smsCount: 0, network: '5G' }, 8)
    expect(results.every(r => String(r.offer.network).includes('5G'))).toBe(true)
    expect(results.map(r => r.offer.id)).toEqual(['o7'])
  })

  it('unlimited-calls toggle keeps only offers with unlimited calls', () => {
    const results = recommendOffers(OFFERS, { budget: 5000, dataGB: 0, voiceMinutes: -1, smsCount: 0 }, 8)
    expect(results.length).toBeGreaterThan(0)
    results.forEach(r => expect(r.offer.voiceMinutes).toBe(-1))
  })

  it('unlimited-SMS toggle keeps only offers with unlimited SMS', () => {
    const results = recommendOffers(OFFERS, { budget: 5000, dataGB: 0, voiceMinutes: 0, smsCount: -1 }, 8)
    expect(results.length).toBeGreaterThan(0)
    results.forEach(r => expect(r.offer.smsCount).toBe(-1))
  })
})

// ─── Score bounds and ordering ────────────────────────────────────────────────

describe('score bounds and ordering', () => {
  it('all closeness scores are between 0 and 100', () => {
    const results = recommendOffers(OFFERS, { budget: 3000, dataGB: 20, voiceMinutes: 0, smsCount: 0 }, 8)
    expect(results.length).toBeGreaterThan(0)
    results.forEach(r => {
      expect(r.score).toBeGreaterThanOrEqual(0)
      expect(r.score).toBeLessThanOrEqual(100)
    })
  })

  it('results are sorted descending by score', () => {
    const results = recommendOffers(OFFERS, { budget: 5000, dataGB: 30, voiceMinutes: 0, smsCount: 0 }, 5)
    for (let i = 1; i < results.length; i++) {
      expect(results[i - 1].score).toBeGreaterThanOrEqual(results[i].score)
    }
  })

  it('respects the topN cap', () => {
    const results = recommendOffers(OFFERS, { budget: 5000, dataGB: 20, voiceMinutes: 0, smsCount: 0 }, 3)
    expect(results.length).toBeLessThanOrEqual(3)
  })
})
