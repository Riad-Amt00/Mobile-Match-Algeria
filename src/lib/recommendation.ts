/**
 * Recommendation Engine
 * Scores each offer against user's profile and returns ranked top N matches.
 */

export interface UserNeeds {
  budget: number        // DZD per month
  dataGB: number        // GB needed per month
  voiceMinutes: number  // minutes needed (0 = don't care, -1 = need unlimited)
  smsCount: number      // SMS needed (0 = don't care)
  type?: 'PREPAID' | 'POSTPAID' | 'DATA_ONLY' | 'any'
  network?: '4G' | '5G' | 'any'
}

export interface ScoredOffer {
  offer: any
  score: number         // 0-100
  savings: number       // DZD saved vs cheapest alternative for same data
  matchReasons: string[]
  mismatches: string[]
}

export function recommendOffers(offers: any[], needs: UserNeeds, topN = 3): ScoredOffer[] {
  const scored = offers.map((offer) => scoreOffer(offer, needs))
  scored.sort((a, b) => b.score - a.score)

  // Calculate savings — baseline is average price among matching offers
  const matchingPrices = scored.filter((s) => s.score > 30).map((s) => s.offer.priceDA)
  const avgPrice = matchingPrices.length > 0
    ? matchingPrices.reduce((a, b) => a + b, 0) / matchingPrices.length
    : 0

  return scored.slice(0, topN).map((s) => ({
    ...s,
    savings: Math.max(0, avgPrice - s.offer.priceDA),
  }))
}

function scoreOffer(offer: any, needs: UserNeeds): ScoredOffer {
  let score = 0
  const matchReasons: string[] = []
  const mismatches: string[] = []

  // ─── Budget Score (30 pts) ────────────────────────────────────────
  if (offer.priceDA <= needs.budget) {
    const budgetRatio = offer.priceDA / needs.budget
    if (budgetRatio <= 0.7) {
      score += 30
      matchReasons.push(`Well within your budget (${offer.priceDA} DA / ${needs.budget} DA)`)
    } else if (budgetRatio <= 0.9) {
      score += 25
      matchReasons.push(`Within your budget`)
    } else {
      score += 15
    }
  } else {
    const overage = ((offer.priceDA - needs.budget) / needs.budget) * 100
    if (overage <= 10) {
      score += 5
      mismatches.push(`Slightly over budget (+${overage.toFixed(0)}%)`)
    } else {
      mismatches.push(`Over budget by ${offer.priceDA - needs.budget} DA`)
    }
  }

  // ─── Data Score (35 pts) ─────────────────────────────────────────
  const offerData = offer.dataGB === 0 ? 999 : offer.dataGB // 0 = unlimited
  if (offerData >= needs.dataGB) {
    const dataRatio = needs.dataGB > 0 ? offer.dataGB / needs.dataGB : 1
    if (dataRatio >= 1.5) {
      score += 35
      matchReasons.push(`Excellent data allowance (${offer.dataGB === 0 ? 'Unlimited' : offer.dataGB + ' GB'})`)
    } else if (dataRatio >= 1) {
      score += 28
      matchReasons.push(`Data matches your needs`)
    } else {
      score += 15
    }
  } else {
    const shortage = needs.dataGB - offer.dataGB
    mismatches.push(`Insufficient data (${shortage} GB short)`)
  }

  // ─── Voice Score (20 pts) ────────────────────────────────────────
  const offerMinutes = offer.voiceMinutes === -1 ? 9999 : (offer.voiceMinutes ?? 0)
  if (needs.voiceMinutes === -1) {
    // User needs unlimited
    if (offer.voiceMinutes === -1) {
      score += 20
      matchReasons.push('Unlimited calls included ✓')
    } else {
      mismatches.push('Unlimited calls not included')
    }
  } else if (offerMinutes >= needs.voiceMinutes) {
    score += needs.voiceMinutes > 0 ? 20 : 10
    if (needs.voiceMinutes > 0) matchReasons.push(`Sufficient call minutes (${offer.voiceMinutes === -1 ? 'Unlimited' : offer.voiceMinutes + ' min'})`)
  } else if (needs.voiceMinutes > 0) {
    mismatches.push(`Insufficient minutes (${offer.voiceMinutes} / ${needs.voiceMinutes} min)`)
  }

  // ─── Offer Type Score (10 pts) ───────────────────────────────────
  if (!needs.type || needs.type === 'any' || offer.type === needs.type) {
    score += 10
    if (needs.type && needs.type !== 'any') matchReasons.push(`Matching offer type (${needs.type})`)
  } else {
    mismatches.push(`Different offer type (${offer.type} vs ${needs.type} requested)`)
  }

  // ─── Network Score (5 pts) ───────────────────────────────────────
  if (!needs.network || needs.network === 'any') {
    score += 5
  } else if (offer.network.includes(needs.network)) {
    score += 5
    matchReasons.push(`${needs.network} compatible`)
  } else {
    mismatches.push(`${needs.network} network not guaranteed`)
  }

  return { offer, score: Math.min(100, score), savings: 0, matchReasons, mismatches }
}

export function calculateSavings(currentOffer: any, bestOffer: any, months = 12): number {
  if (!currentOffer || !bestOffer) return 0
  return Math.max(0, (currentOffer.priceDA - bestOffer.priceDA) * months)
}
