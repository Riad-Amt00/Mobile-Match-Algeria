/**
 * Recommendation Engine — content-based multi-criteria ranking (cold-start safe).
 *
 * The engine ranks offers with TOPSIS (Technique for Order of Preference by
 * Similarity to Ideal Solution), a standard multi-criteria decision method that
 * orders alternatives by their Euclidean distance to an ideal and an anti-ideal
 * solution (Hwang & Yoon, 1981; recent guide: Taherdoost & Madanchian, 2023). It
 * is content/attribute-based, so it needs no interaction history and works at
 * cold-start. The criterion weights are derived from the user's ranking of the
 * criteria with Rank-Order Centroid (ROC) surrogate weights (Barron & Barrett,
 * 1996), so no weight is hand-tuned. Hard, categorical constraints (budget
 * ceiling, operator, plan type, network, unlimited toggles) are applied as a
 * screening step before ranking; the budget is a strict ceiling.
 *
 * Pipeline:  hard filters  ->  ROC weights (from the criterion ranking)
 *            ->  TOPSIS over the surviving offers  ->  top-N by closeness.
 * The closeness coefficient C in [0,1] is reported as the match score (C*100).
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

// Criteria that can be ranked. Each has a direction: a benefit criterion is
// better when larger, a cost criterion is better when smaller.
type Criterion = 'price' | 'data' | 'calls' | 'sms' | 'network'
const COST_CRITERIA = new Set<Criterion>(['price'])

function clamp01(x: number): number {
  return x < 0 ? 0 : x > 1 ? 1 : x
}

/** Newer technology ranks higher when "network" is chosen as a criterion. */
function networkMerit(network: string): number {
  const n = String(network || '').toLowerCase()
  if (n.includes('5g')) return 1
  if (n.includes('4g')) return 0.6
  if (n.includes('3g')) return 0.3
  return 0.15
}

/**
 * Rank-Order Centroid (ROC) surrogate weights (Barron & Barrett, 1996).
 * Turns a ranking of n criteria (most important first) into numeric weights
 * w_k = (1/n) * sum_{i=k}^{n} (1/i), which sum to 1. For two criteria this gives
 * 0.75 and 0.25; for one criterion, 1. No weight is chosen by hand.
 */
export function rocWeights(n: number): number[] {
  if (n <= 0) return []
  const w: number[] = []
  for (let k = 1; k <= n; k++) {
    let s = 0
    for (let i = k; i <= n; i++) s += 1 / i
    w.push(s / n)
  }
  return w
}

/**
 * The raw value of a criterion for an offer, with unlimited (-1) mapped to the
 * best value present in the pool so an unlimited allowance counts as ideal.
 */
function criterionValue(c: Criterion, offer: any, poolMax: Record<string, number>): number {
  // An unlimited allowance (-1) is encoded as 1.5x the largest finite value in
  // the pool, so on a benefit criterion it ranks strictly above any finite plan
  // (it becomes the ideal), rather than merely tying the finite maximum.
  switch (c) {
    case 'price': return offer.priceDA
    case 'data':  return offer.dataGB === -1 ? poolMax.data * 1.5 : Math.max(0, offer.dataGB)
    case 'calls': return offer.voiceMinutes === -1 ? poolMax.calls * 1.5 : Math.max(0, offer.voiceMinutes)
    case 'sms':   return offer.smsCount === -1 ? poolMax.sms * 1.5 : Math.max(0, offer.smsCount)
    case 'network': return networkMerit(offer.network)
  }
}

/**
 * TOPSIS (Hwang & Yoon, 1981). Returns the closeness coefficient C in [0,1] for
 * each offer, in input order. Steps: vector-normalise each criterion column,
 * apply the weights, find the ideal (A+) and anti-ideal (A-) solutions, then
 * C_i = S_i^- / (S_i^+ + S_i^-) where S are Euclidean distances to A+ / A-.
 */
export function topsis(offers: any[], criteria: Criterion[], weights: number[]): number[] {
  const m = offers.length
  if (m === 0) return []
  if (m === 1) return [1] // a single feasible offer is trivially the closest

  const poolMax: Record<string, number> = {
    data:  Math.max(1, ...offers.map(o => (o.dataGB === -1 ? 0 : o.dataGB))),
    calls: Math.max(1, ...offers.map(o => (o.voiceMinutes === -1 ? 0 : o.voiceMinutes))),
    sms:   Math.max(1, ...offers.map(o => (o.smsCount === -1 ? 0 : o.smsCount))),
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
  topN = 3,
  priorities: string[] = []
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

  // Criteria to rank on come from the user's priority ranking; default to
  // price then data when none are given. ROC turns the ranking into weights.
  const valid: Criterion[] = ['price', 'data', 'calls', 'sms', 'network']
  let criteria = priorities.filter(p => valid.includes(p as Criterion)).slice(0, 4) as Criterion[]
  const ranked = criteria.length > 0
  if (!ranked) criteria = ['price', 'data']
  // With a stated ranking, ROC turns it into weights; with no ranking, the
  // criteria are weighted equally (the standard neutral default).
  const weights = ranked ? rocWeights(criteria.length) : criteria.map(() => 1 / criteria.length)

  const closeness = topsis(feasible, criteria, weights)

  const recs: Recommendation[] = feasible.map((offer, i) => {
    const { matchReasons, mismatches } = buildReasons(offer, needs, criteria)
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

/**
 * Per-criterion merit in [0,1], need-relative, used only to generate the
 * human-readable match reasons (not for ranking — TOPSIS does the ranking).
 */
function reasonMerit(c: Criterion, offer: any, needs: UserNeeds): number {
  switch (c) {
    case 'price': return clamp01(1 - offer.priceDA / Math.max(needs.budget, 1))
    case 'data':  return offer.dataGB === -1 ? 1 : needs.dataGB > 0 ? clamp01(offer.dataGB / needs.dataGB) : 0.5
    case 'calls': return offer.voiceMinutes === -1 ? 1 : needs.voiceMinutes > 0 ? clamp01(offer.voiceMinutes / needs.voiceMinutes) : 0.5
    case 'sms':   return offer.smsCount === -1 ? 1 : needs.smsCount > 0 ? clamp01(offer.smsCount / needs.smsCount) : 0.5
    case 'network': return networkMerit(offer.network)
  }
}

function buildReasons(offer: any, needs: UserNeeds, criteria: Criterion[]) {
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

  // A "priority" reason for each ranked criterion the offer scores well on.
  for (const c of criteria) {
    if (reasonMerit(c, offer, needs) >= 0.66) matchReasons.push({ key: `match.priority.${c}` })
  }

  return { matchReasons, mismatches }
}
