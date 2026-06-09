/**
 * Recommendation Engine — content-based multi-criteria ranking (cold-start safe).
 *
 * Offers are ranked with TOPSIS (Technique for Order of Preference by Similarity to
 * Ideal Solution), a standard multi-criteria decision method that orders alternatives
 * by their Euclidean distance to an ideal and an anti-ideal solution (Hwang & Yoon,
 * 1981; recent guide: Taherdoost & Madanchian, 2023). It is content/attribute-based,
 * so it needs no interaction history and works at cold-start. Two criteria are used,
 * weighted equally: value for money (price per GB — a cost criterion) and data volume
 * (a benefit criterion). Hard, categorical constraints (budget ceiling, operator,
 * plan type, network, unlimited toggles) are applied as a screening step before
 * ranking; the budget is a strict ceiling.
 *
 * Pipeline:  hard filters  ->  TOPSIS over the survivors (value-for-money + data,
 *            equal weights)  ->  top-N by closeness. C in [0,1] is the ranking score.
 */

export interface UserNeeds {
  budget: number
  dataGB: number
  voiceMinutes: number
  smsCount: number
  type?: string     // 'any' | 'PREPAID' | 'POSTPAID' | 'DATA_ONLY'
  network?: string  // 'any' | '4G' | '5G'
  operator?: string // 'any' | 'djezzy' | 'ooredoo' | 'mobilis'  (operator slug)
}

export interface ReasonToken {
  key: string
  params?: Record<string, string | number>
}

interface Recommendation {
  offer: any
  score: number
  savings: number
  matchReasons: ReasonToken[]
  mismatches: ReasonToken[]
}

// The two ranking criteria: 'price' is a cost criterion (smaller is better), 'data'
// is a benefit criterion (larger is better). They are weighted equally.
type Criterion = 'price' | 'data'
const COST_CRITERIA = new Set<Criterion>(['price'])
const RANK_CRITERIA: Criterion[] = ['price', 'data']
const RANK_WEIGHTS = [0.5, 0.5]

/**
 * The value of a criterion for an offer, used to build the TOPSIS decision matrix.
 * Price is measured as cost efficiency (dinars per GB), not absolute price, so the
 * ranking favours the best value for money within budget rather than the cheapest,
 * near-empty plan. An unlimited allowance (-1) is mapped to 1.5x the best finite
 * value in the pool so it counts as ideal on the data criterion.
 */
function criterionValue(c: Criterion, offer: any, poolMax: Record<string, number>): number {
  switch (c) {
    case 'price': {
      // Cost efficiency: dinars per GB. Lower is better (a cost criterion).
      // Data is floored at 0.1 GB to avoid division by zero for data-less plans.
      const data = offer.dataGB === -1 ? poolMax.data * 1.5 : Math.max(0, offer.dataGB)
      return offer.priceDA / Math.max(data, 0.1)
    }
    case 'data': return offer.dataGB === -1 ? poolMax.data * 1.5 : Math.max(0, offer.dataGB)
  }
}

/**
 * TOPSIS (Hwang & Yoon, 1981). Returns the closeness coefficient C in [0,1] for each
 * offer, in input order. Steps: vector-normalise each criterion column, apply the
 * weights, find the ideal (A+) and anti-ideal (A-) solutions, then
 * C_i = S_i^- / (S_i^+ + S_i^-) where S are Euclidean distances to A+ / A-.
 */
export function topsis(offers: any[], criteria: Criterion[], weights: number[]): number[] {
  const m = offers.length
  if (m === 0) return []
  if (m === 1) return [1] // a single feasible offer is trivially the closest

  const poolMax: Record<string, number> = {
    data: Math.max(1, ...offers.map(o => (o.dataGB === -1 ? 0 : o.dataGB))),
  }

  // Raw decision matrix [m offers x n criteria].
  const X = offers.map(o => criteria.map(c => criterionValue(c, o, poolMax)))

  // Vector normalisation per column, then weight.
  const V = X.map(row => row.slice())
  criteria.forEach((_, j) => {
    const norm = Math.sqrt(X.reduce((s, row) => s + row[j] * row[j], 0)) || 1
    for (let i = 0; i < m; i++) V[i][j] = (X[i][j] / norm) * weights[j]
  })

  // Ideal (A+) and anti-ideal (A-): for a cost criterion the best is the minimum.
  const Aplus: number[] = []
  const Aminus: number[] = []
  criteria.forEach((c, j) => {
    const col = V.map(row => row[j])
    const hi = Math.max(...col), lo = Math.min(...col)
    if (COST_CRITERIA.has(c)) { Aplus[j] = lo; Aminus[j] = hi }
    else { Aplus[j] = hi; Aminus[j] = lo }
  })

  // Euclidean distances and closeness coefficient.
  return V.map(row => {
    let dPlus = 0, dMinus = 0
    row.forEach((v, j) => { dPlus += (v - Aplus[j]) ** 2; dMinus += (v - Aminus[j]) ** 2 })
    dPlus = Math.sqrt(dPlus); dMinus = Math.sqrt(dMinus)
    const denom = dPlus + dMinus
    return denom === 0 ? 1 : dMinus / denom
  })
}

export function recommendOffers(
  offers: any[],
  needs: UserNeeds,
  topN = 3
): Recommendation[] {
  // ── Hard constraints (categorical, go / no-go). Budget is a strict ceiling. ──
  const feasible = offers
    .filter(o => o.priceDA <= needs.budget)
    .filter(o => !needs.operator || needs.operator === 'any' || o.operator?.slug === needs.operator)
    .filter(o => !needs.type || needs.type === 'any' || o.type === needs.type)
    .filter(o => !needs.network || needs.network === 'any' || String(o.network).includes(needs.network))
    .filter(o => needs.voiceMinutes !== -1 || o.voiceMinutes === -1)
    .filter(o => needs.smsCount !== -1 || o.smsCount === -1)

  if (feasible.length === 0) return []

  // Rank the survivors with TOPSIS on value-for-money and data volume, equally weighted.
  const closeness = topsis(feasible, RANK_CRITERIA, RANK_WEIGHTS)

  const recs: Recommendation[] = feasible.map((offer, i) => {
    const { matchReasons, mismatches } = buildReasons(offer, needs)
    return {
      offer,
      score: Math.round(closeness[i] * 100),
      savings: Math.max(0, needs.budget - offer.priceDA),
      matchReasons,
      mismatches,
    }
  })

  // Rank by closeness (use the raw value to avoid rounding ties).
  recs.sort((a, b) => b.score - a.score)
  return recs.slice(0, topN)
}

function buildReasons(offer: any, needs: UserNeeds) {
  const matchReasons: ReasonToken[] = []
  const mismatches: ReasonToken[] = []

  // Budget fit (descriptive)
  const pricePct = offer.priceDA / Math.max(needs.budget, 1)
  if (pricePct <= 0.5) matchReasons.push({ key: 'match.budget.wellUnder', params: { pct: Math.round((1 - pricePct) * 100) } })
  else if (pricePct <= 0.8) matchReasons.push({ key: 'match.budget.within', params: { pct: Math.round((1 - pricePct) * 100) } })
  else if (pricePct <= 1.0) matchReasons.push({ key: 'match.budget.fits' })

  // Data fit (descriptive)
  if (offer.dataGB === -1) matchReasons.push({ key: 'match.data.unlimited' })
  else if (needs.dataGB > 0) {
    const dataPct = offer.dataGB / needs.dataGB
    if (dataPct >= 1.5) matchReasons.push({ key: 'match.data.excess', params: { pct: Math.round(dataPct * 100 - 100) } })
    else if (dataPct >= 1.0) matchReasons.push({ key: 'match.data.covers' })
    else if (dataPct >= 0.7) mismatches.push({ key: 'match.data.short', params: { has: offer.dataGB, need: needs.dataGB } })
    else mismatches.push({ key: 'match.data.insufficient', params: { has: offer.dataGB, need: needs.dataGB } })
  }

  if (offer.voiceMinutes === -1) matchReasons.push({ key: 'match.voice.unlimited' })
  if (offer.smsCount === -1) matchReasons.push({ key: 'match.sms.unlimited' })

  return { matchReasons, mismatches }
}
