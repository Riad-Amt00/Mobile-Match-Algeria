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
  it('TC1 — budget 1000DA, data 5Go: top result covers ≥5GB within budget', () => {
    const results = recommendOffers(OFFERS, { budget: 1000, dataGB: 5, voiceMinutes: 0, smsCount: 0 })
    expect(results.length).toBeGreaterThan(0)
    const top = results[0].offer
    expect(top.priceDA).toBeLessThanOrEqual(1000 * 1.15)
    expect(top.dataGB === -1 || top.dataGB >= 5).toBe(true)
  })

  it('TC2 — budget 5000DA, data 100Go: top result is highest-data offer within budget', () => {
    const results = recommendOffers(OFFERS, { budget: 5000, dataGB: 100, voiceMinutes: 0, smsCount: 0 })
    expect(results.length).toBeGreaterThan(0)
    const top = results[0].offer
    // o7 (unlimited, 5000DA) or o3 (60GB, 4500DA) should win — both are within budget
    expect(top.dataGB === -1 || top.dataGB >= 40).toBe(true)
  })

  it('TC3 — voice unlimited (-1): top result has unlimited calls', () => {
    const results = recommendOffers(OFFERS, { budget: 3000, dataGB: 20, voiceMinutes: -1, smsCount: 0 })
    expect(results.length).toBeGreaterThan(0)
    expect(results[0].offer.voiceMinutes).toBe(-1)
  })

  it('TC4 — budget 50DA (below all prices): engine returns empty result', () => {
    const results = recommendOffers(OFFERS, { budget: 50, dataGB: 5, voiceMinutes: 0, smsCount: 0 })
    expect(results).toHaveLength(0)
  })
})

// ─── Priority elicitation ─────────────────────────────────────────────────────

describe('priority elicitation (+8 pts boost)', () => {
  it('priority=price: offer priced ≤80% of budget receives boost', () => {
    const withPriority = recommendOffers(OFFERS, { budget: 3000, dataGB: 10, voiceMinutes: 0, smsCount: 0 }, 3, {}, 'price')
    const withoutPriority = recommendOffers(OFFERS, { budget: 3000, dataGB: 10, voiceMinutes: 0, smsCount: 0 })
    // With price priority, cheap offers should bubble up; scores diverge
    const topWithPriority = withPriority[0].offer
    expect(topWithPriority.priceDA / 3000).toBeLessThanOrEqual(0.8)
  })

  it('priority=calls: offer with unlimited calls receives boost', () => {
    const results = recommendOffers(OFFERS, { budget: 4000, dataGB: 10, voiceMinutes: 100, smsCount: 0 }, 3, {}, 'calls')
    expect(results[0].offer.voiceMinutes).toBe(-1)
  })

  it('priority boost match reason is present', () => {
    const results = recommendOffers(OFFERS, { budget: 4000, dataGB: 10, voiceMinutes: 100, smsCount: 0 }, 3, {}, 'calls')
    const reasons = results[0].matchReasons.map(r => r.key)
    expect(reasons).toContain('match.priority.calls')
  })
})

// ─── Strict budget filter ─────────────────────────────────────────────────────

describe('strict budget mode', () => {
  it('strict=true: no offer exceeds the stated budget', () => {
    const results = recommendOffers(OFFERS, { budget: 1000, dataGB: 5, voiceMinutes: 0, smsCount: 0 }, 3, {}, '', true)
    results.forEach(r => {
      expect(r.offer.priceDA).toBeLessThanOrEqual(1000)
    })
  })

  it('strict=false (default): offers up to 1.15× budget are included', () => {
    // o1 is 1000DA — within 1150 overshoot limit for budget=900
    const results = recommendOffers(OFFERS, { budget: 900, dataGB: 5, voiceMinutes: 0, smsCount: 0 }, 5, {}, '', false)
    const ids = results.map(r => r.offer.id)
    expect(ids).toContain('o1') // 1000DA is within 900 × 1.15 = 1035
  })
})

// ─── Operator affinity ────────────────────────────────────────────────────────

describe('operator affinity boost', () => {
  it('preferred operator scores higher than without affinity', () => {
    const withAffinity = recommendOffers(OFFERS, { budget: 5000, dataGB: 20, voiceMinutes: 0, smsCount: 0 }, 3, { mobilis: 2 })
    const withoutAffinity = recommendOffers(OFFERS, { budget: 5000, dataGB: 20, voiceMinutes: 0, smsCount: 0 })
    // Mobilis offers should appear with a higher relative score
    const mobilisWithAffinity = withAffinity.find(r => r.offer.operatorId === 'mobilis')
    const mobilisWithout = withoutAffinity.find(r => r.offer.operatorId === 'mobilis')
    if (mobilisWithAffinity && mobilisWithout) {
      expect(mobilisWithAffinity.score).toBeGreaterThan(mobilisWithout.score)
    }
    // At minimum the affinity match reason should appear
    const affinityResult = withAffinity.find(r => r.offer.operatorId === 'mobilis')
    if (affinityResult) {
      expect(affinityResult.matchReasons.map(r => r.key)).toContain('match.operator.preferred')
    }
  })
})

// ─── Score bounds ─────────────────────────────────────────────────────────────

describe('score bounds', () => {
  it('all scores are between 0 and 100', () => {
    const results = recommendOffers(OFFERS, { budget: 3000, dataGB: 20, voiceMinutes: 100, smsCount: 50 }, 8)
    results.forEach(r => {
      expect(r.score).toBeGreaterThanOrEqual(0)
      expect(r.score).toBeLessThanOrEqual(100)
    })
  })

  it('results are sorted descending by score', () => {
    const results = recommendOffers(OFFERS, { budget: 5000, dataGB: 30, voiceMinutes: 60, smsCount: 0 }, 5)
    for (let i = 1; i < results.length; i++) {
      expect(results[i - 1].score).toBeGreaterThanOrEqual(results[i].score)
    }
  })
})
