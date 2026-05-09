/**
 * Recommendation Engine — Scores offers against a user profile.
 *
 * Score breakdown (100 total):
 *   - Budget fit:     25 pts  (how well the price matches the budget)
 *   - Data fit:       25 pts  (how well the data matches)
 *   - Voice fit:      15 pts  (how well call minutes match)
 *   - SMS fit:        10 pts  (how well SMS count matches)
 *   - Value bonus:    10 pts  (cost-effectiveness: data-per-DA ratio)
 *   - Feature bonus:   5 pts  (streaming, social media, night bonus, etc.)
 *   - Validity fit:    5 pts  (monthly plans score higher)
 *   - Type/Network:    5 pts  (filter match bonuses)
 */

export interface UserNeeds {
  budget: number
  dataGB: number
  voiceMinutes: number
  smsCount: number
  type?: string   // 'any' | 'PREPAID' | 'POSTPAID' | 'DATA_ONLY'
  network?: string // 'any' | '4G' | '5G'
}

interface Recommendation {
  offer: any
  score: number
  savings: number
  matchReasons: string[]
  mismatches: string[]
}

export function recommendOffers(offers: any[], needs: UserNeeds, topN = 3): Recommendation[] {
  const scored: Recommendation[] = offers
    .filter(o => o.priceDA <= needs.budget * 1.15) // allow slight overshoot
    .map(o => scoreOffer(o, needs))
    .sort((a, b) => b.score - a.score)

  // Diversity bonus — if top picks are all from same operator, swap #3 for another
  if (scored.length >= 3) {
    const topOps = scored.slice(0, 2).map(r => r.offer.operatorId)
    if (topOps[0] === topOps[1] && scored[2].offer.operatorId === topOps[0]) {
      // Find first result from a different operator
      const differentIdx = scored.findIndex((r, i) => i > 2 && r.offer.operatorId !== topOps[0])
      if (differentIdx > 0 && scored[differentIdx].score >= scored[2].score * 0.85) {
        const swap = scored.splice(differentIdx, 1)[0]
        scored.splice(2, 0, swap)
      }
    }
  }

  return scored.slice(0, topN)
}

function scoreOffer(offer: any, needs: UserNeeds): Recommendation {
  let score = 0
  const matchReasons: string[] = []
  const mismatches: string[] = []

  // ── Budget fit (25 pts) ────────────────────────────────────────
  const pricePct = offer.priceDA / needs.budget
  if (pricePct <= 0.5) {
    score += 25
    matchReasons.push(`Well under budget (${Math.round((1 - pricePct) * 100)}% savings)`)
  } else if (pricePct <= 0.8) {
    score += 22
    matchReasons.push(`Within budget with ${Math.round((1 - pricePct) * 100)}% to spare`)
  } else if (pricePct <= 1.0) {
    score += 18
    matchReasons.push('Fits your budget')
  } else if (pricePct <= 1.15) {
    score += 10
    mismatches.push(`Slightly over budget (+${Math.round((pricePct - 1) * 100)}%)`)
  } else {
    score += 0
    mismatches.push(`Over budget by ${Math.round((pricePct - 1) * 100)}%`)
  }

  // ── Data fit (25 pts) ──────────────────────────────────────────
  if (offer.dataGB === -1) {
    score += 25
    matchReasons.push('Unlimited data included')
  } else if (needs.dataGB <= 0) {
    score += 20 // user doesn't care about data
  } else {
    const dataPct = offer.dataGB / needs.dataGB
    if (dataPct >= 1.5) {
      score += 25
      matchReasons.push(`${Math.round(dataPct * 100 - 100)}% more data than needed`)
    } else if (dataPct >= 1.0) {
      score += 22
      matchReasons.push('Covers your data needs')
    } else if (dataPct >= 0.7) {
      score += 15
      mismatches.push(`Data slightly short (${offer.dataGB} vs ${needs.dataGB} GB needed)`)
    } else {
      score += 8
      mismatches.push(`Insufficient data: ${offer.dataGB} GB vs ${needs.dataGB} GB needed`)
    }
  }

  // ── Voice fit (15 pts) ─────────────────────────────────────────
  if (offer.voiceMinutes === -1) {
    score += 15
    matchReasons.push('Unlimited calls')
  } else if (needs.voiceMinutes <= 0) {
    score += 12
  } else {
    const voicePct = offer.voiceMinutes / needs.voiceMinutes
    if (voicePct >= 1.0) {
      score += 15
      if (voicePct >= 2) matchReasons.push('More than enough call minutes')
    } else if (voicePct >= 0.7) {
      score += 10
      mismatches.push(`Call minutes slightly short (${offer.voiceMinutes} vs ${needs.voiceMinutes} min)`)
    } else {
      score += 5
      mismatches.push(`Low call minutes: ${offer.voiceMinutes} vs ${needs.voiceMinutes} min needed`)
    }
  }

  // ── SMS fit (10 pts) ───────────────────────────────────────────
  if (offer.smsCount === -1) {
    score += 10
    matchReasons.push('Unlimited SMS')
  } else if (needs.smsCount <= 0) {
    score += 8
  } else {
    const smsPct = offer.smsCount / needs.smsCount
    if (smsPct >= 1.0) {
      score += 10
    } else if (smsPct >= 0.5) {
      score += 6
    } else {
      score += 2
      mismatches.push(`Low SMS count: ${offer.smsCount} vs ${needs.smsCount} needed`)
    }
  }

  // ── Value bonus (10 pts) ───────────────────────────────────────
  if (offer.dataGB > 0 && offer.priceDA > 0) {
    const dataPerDA = (offer.dataGB / offer.priceDA) * 1000 // MB per DA
    if (dataPerDA >= 50) score += 10       // excellent value
    else if (dataPerDA >= 30) score += 8
    else if (dataPerDA >= 15) score += 5
    else score += 2
  } else if (offer.dataGB === -1) {
    score += 9 // unlimited data = great value
  }

  // ── Feature bonus (5 pts) ─────────────────────────────────────
  try {
    const features = typeof offer.features === 'string' ? JSON.parse(offer.features) : offer.features || []
    const featureText = features.join(' ').toLowerCase()
    if (featureText.includes('réseaux sociaux') || featureText.includes('facebook')) score += 1
    if (featureText.includes('streaming') || featureText.includes('anaflix') || featureText.includes('shahid')) score += 1
    if (featureText.includes('bonus nuit') || featureText.includes('nuit')) score += 1
    if (featureText.includes('illimités toutes') || featureText.includes('illimités tous')) score += 1
    if (featureText.includes('roaming')) score += 1
  } catch {}

  // ── Validity bonus (5 pts) ────────────────────────────────────
  if (offer.validityDays >= 30) score += 5
  else if (offer.validityDays >= 7) score += 3
  else score += 1

  // ── Type/Network filter match (5 pts) ─────────────────────────
  if (needs.type && needs.type !== 'any') {
    if (offer.type === needs.type) score += 3
    else score -= 5
  } else {
    score += 2
  }

  if (needs.network && needs.network !== 'any') {
    if (offer.network.includes(needs.network)) score += 2
    else mismatches.push(`${needs.network} not available (${offer.network} only)`)
  } else {
    score += 1
  }

  // ── Calculate savings ─────────────────────────────────────────
  const savings = Math.max(0, needs.budget - offer.priceDA)

  // Clamp score 0-100
  score = Math.max(0, Math.min(100, score))

  return { offer, score, savings, matchReasons, mismatches }
}
