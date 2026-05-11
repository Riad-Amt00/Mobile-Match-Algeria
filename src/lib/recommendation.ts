/**
 * Recommendation Engine — Scores offers against a user profile.
 *
 * Score breakdown (100 total):
 *   - Budget fit:     25 pts  (how well the price matches the budget)
 *   - Data fit:       25 pts  (how well the data matches)
 *   - Voice fit:      15 pts  (how well call minutes match)
 *   - Value bonus:    15 pts  (cost-effectiveness: data-per-DA ratio)
 *   - SMS fit:         5 pts  (SMS is de-prioritised — OTT apps dominate in Algeria)
 *   - Feature bonus:   5 pts  (streaming, social media, night bonus, etc.)
 *   - Validity fit:    5 pts  (monthly plans score higher)
 *   - Type/Network:    5 pts  (filter match bonuses)
 *
 * Priority boost (up to +8 pts, capped at 100): applied after base scoring when the user
 * has selected a top priority via direct weight elicitation in the UI.
 */

export interface UserNeeds {
  budget: number
  dataGB: number
  voiceMinutes: number
  smsCount: number
  type?: string   // 'any' | 'PREPAID' | 'POSTPAID' | 'DATA_ONLY'
  network?: string // 'any' | '4G' | '5G'
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

export function recommendOffers(
  offers: any[],
  needs: UserNeeds,
  topN = 3,
  operatorAffinity: Record<string, number> = {},
  priority = '',
  budgetStrict = false
): Recommendation[] {
  const scored: Recommendation[] = offers
    .filter(o => o.priceDA <= needs.budget * (budgetStrict ? 1.0 : 1.15))
    .map(o => scoreOffer(o, needs))
    .sort((a, b) => b.score - a.score)

  // Operator affinity boost — up to +5 pts for operators the user has saved before
  if (Object.keys(operatorAffinity).length > 0) {
    scored.forEach(r => {
      const count = operatorAffinity[r.offer.operatorId] ?? 0
      if (count > 0) {
        r.score = Math.min(100, r.score + Math.min(5, count * 2))
        if (count >= 1) r.matchReasons.push({ key: 'match.operator.preferred' })
      }
    })
    scored.sort((a, b) => b.score - a.score)
  }

  // Priority elicitation — user's stated top priority gets +8 pts for offers excelling in that dimension
  if (priority) {
    scored.forEach(r => {
      let boost = false
      if (priority === 'data') {
        boost = r.offer.dataGB === -1 || (needs.dataGB > 0 && r.offer.dataGB / needs.dataGB >= 1.0)
      } else if (priority === 'price') {
        boost = r.offer.priceDA / needs.budget <= 0.8
      } else if (priority === 'calls') {
        boost = r.offer.voiceMinutes === -1 ||
                (needs.voiceMinutes > 0 && r.offer.voiceMinutes / needs.voiceMinutes >= 1.0)
      } else if (priority === 'network') {
        boost = !!needs.network && needs.network !== 'any' && r.offer.network.includes(needs.network)
      }
      if (boost) {
        r.score = Math.min(100, r.score + 8)
        r.matchReasons.push({ key: `match.priority.${priority}` })
      }
    })
    scored.sort((a, b) => b.score - a.score)
  }

  // Diversity bonus — if top picks are all from same operator, swap #3 for another
  if (scored.length >= 3) {
    const topOps = scored.slice(0, 2).map(r => r.offer.operatorId)
    if (topOps[0] === topOps[1] && scored[2].offer.operatorId === topOps[0]) {
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
  const matchReasons: ReasonToken[] = []
  const mismatches: ReasonToken[] = []

  // ── Budget fit (25 pts) ────────────────────────────────────────
  const pricePct = offer.priceDA / needs.budget
  if (pricePct <= 0.5) {
    score += 25
    matchReasons.push({ key: 'match.budget.wellUnder', params: { pct: Math.round((1 - pricePct) * 100) } })
  } else if (pricePct <= 0.8) {
    score += 22
    matchReasons.push({ key: 'match.budget.within', params: { pct: Math.round((1 - pricePct) * 100) } })
  } else if (pricePct <= 1.0) {
    score += 18
    matchReasons.push({ key: 'match.budget.fits' })
  } else if (pricePct <= 1.15) {
    score += 10
    mismatches.push({ key: 'match.budget.slightlyOver', params: { pct: Math.round((pricePct - 1) * 100) } })
  } else {
    score += 0
    mismatches.push({ key: 'match.budget.over', params: { pct: Math.round((pricePct - 1) * 100) } })
  }

  // ── Data fit (25 pts) ──────────────────────────────────────────
  if (offer.dataGB === -1) {
    score += 25
    matchReasons.push({ key: 'match.data.unlimited' })
  } else if (needs.dataGB <= 0) {
    score += 20
  } else {
    const dataPct = offer.dataGB / needs.dataGB
    if (dataPct >= 1.5) {
      score += 25
      matchReasons.push({ key: 'match.data.excess', params: { pct: Math.round(dataPct * 100 - 100) } })
    } else if (dataPct >= 1.0) {
      score += 22
      matchReasons.push({ key: 'match.data.covers' })
    } else if (dataPct >= 0.7) {
      score += 15
      mismatches.push({ key: 'match.data.short', params: { has: offer.dataGB, need: needs.dataGB } })
    } else {
      score += 8
      mismatches.push({ key: 'match.data.insufficient', params: { has: offer.dataGB, need: needs.dataGB } })
    }
  }

  // ── Voice fit (15 pts) ─────────────────────────────────────────
  if (offer.voiceMinutes === -1) {
    score += 15
    matchReasons.push({ key: 'match.voice.unlimited' })
  } else if (needs.voiceMinutes === -1) {
    score += 3
    mismatches.push({ key: 'match.voice.notUnlimited', params: { has: offer.voiceMinutes } })
  } else if (needs.voiceMinutes <= 0) {
    score += 12
  } else {
    const voicePct = offer.voiceMinutes / needs.voiceMinutes
    if (voicePct >= 1.0) {
      score += 15
      if (voicePct >= 2) matchReasons.push({ key: 'match.voice.excess' })
    } else if (voicePct >= 0.7) {
      score += 10
      mismatches.push({ key: 'match.voice.short', params: { has: offer.voiceMinutes, need: needs.voiceMinutes } })
    } else {
      score += 5
      mismatches.push({ key: 'match.voice.low', params: { has: offer.voiceMinutes, need: needs.voiceMinutes } })
    }
  }

  // ── SMS fit (5 pts — de-prioritised: OTT apps dominate in Algeria) ──────
  if (offer.smsCount === -1) {
    score += 5
    matchReasons.push({ key: 'match.sms.unlimited' })
  } else if (needs.smsCount === -1) {
    score += 1
    mismatches.push({ key: 'match.sms.notUnlimited', params: { has: offer.smsCount } })
  } else if (needs.smsCount <= 0) {
    score += 4
  } else {
    const smsPct = offer.smsCount / needs.smsCount
    if (smsPct >= 1.0) {
      score += 5
    } else if (smsPct >= 0.5) {
      score += 3
    } else {
      score += 1
      mismatches.push({ key: 'match.sms.low', params: { has: offer.smsCount, need: needs.smsCount } })
    }
  }

  // ── Value bonus (15 pts) ───────────────────────────────────────
  if (offer.dataGB > 0 && offer.priceDA > 0) {
    const dataPerDA = (offer.dataGB / offer.priceDA) * 1000
    if (dataPerDA >= 50) { score += 15; matchReasons.push({ key: 'match.value.great' }) }
    else if (dataPerDA >= 30) score += 12
    else if (dataPerDA >= 15) score += 8
    else score += 3
  } else if (offer.dataGB === -1) {
    score += 13
  }

  // ── Feature bonus (5 pts) ─────────────────────────────────────
  try {
    const features = typeof offer.features === 'string' ? JSON.parse(offer.features) : offer.features || []
    const featureText = features.join(' ').toLowerCase()
    if (featureText.includes('social') || featureText.includes('facebook') || featureText.includes('réseaux sociaux')) score += 1
    if (featureText.includes('streaming') || featureText.includes('youtube') || featureText.includes('anaflix') || featureText.includes('shahid')) score += 1
    if (featureText.includes('night') || featureText.includes('nuit') || featureText.includes('bonus nuit')) score += 1
    if (featureText.includes('unlimited calls') || featureText.includes('illimités toutes') || featureText.includes('illimités tous')) score += 1
    if (featureText.includes('roaming') || featureText.includes('rollover')) score += 1
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
    else mismatches.push({ key: 'match.network.unavailable', params: { net: needs.network, alt: offer.network } })
  } else {
    score += 1
  }

  // ── Calculate savings ─────────────────────────────────────────
  const savings = Math.max(0, needs.budget - offer.priceDA)

  score = Math.max(0, Math.min(100, score))

  return { offer, score, savings, matchReasons, mismatches }
}
