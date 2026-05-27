/**
 * Recommendation Engine — Scores offers against a user profile.
 *
 * Hard filters (categorical, go/no-go):
 *   - Budget is a HARD CEILING — no offer above the user's monthly budget is returned.
 *   - Operator, plan type, network, and unlimited calls / SMS are filters too.
 *
 * Ranked priority elicitation: the user ranks up to 2 criteria (price, data).
 * Each offer gets a per-criterion merit in [0, 1]:
 *   - Price merit: CHEAPER IS BETTER. An offer at 0 DA scores 1; at the budget
 *     ceiling, the merit is 0. (This is consistent with the savings indicator
 *     shown on each card, where the same budget is treated as a ceiling.)
 *   - Data merit: how well the offer's data covers the user's stated need
 *     (saturating utility — extra data beyond the need does not raise the merit).
 *
 * Merit is target-relative, never pool-relative, so a catalogue outlier cannot
 * distort the scale. Offers are then ranked in TIERS by the top priority's merit
 * (rounded to 0.25 → 5 discrete bands); within a tier the 2nd priority decides
 * the order. The 2nd priority's contribution is bounded below the tier width
 * (0.24 < 0.25) so it can never lift an offer past a higher tier — "follow the
 * top priority strictly, then get as close as possible on the 2nd". This is
 * applied lexicographic preference ordering with bounded relaxation, after
 * Fishburn (1974) and Roberts (1979); the bounded-relaxation framing is
 * characterised in modern preference theory by Goswami, Mitra and Sen (2021).
 * The base fitness score is used only as a tiebreaker.
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

export function recommendOffers(
  offers: any[],
  needs: UserNeeds,
  topN = 3,
  priorities: string[] = []
): Recommendation[] {
  // Hard constraints — offers failing any of these are excluded entirely, never
  // scored: budget is a ceiling; operator / plan-type / network are categorical
  // filters; unlimited calls / SMS (when requested, needs = -1) are binary filters.
  const scored: Recommendation[] = offers
    .filter(o => o.priceDA <= needs.budget)
    .filter(o => !needs.operator || needs.operator === 'any' || o.operator?.slug === needs.operator)
    .filter(o => !needs.type || needs.type === 'any' || o.type === needs.type)
    .filter(o => !needs.network || needs.network === 'any' || String(o.network).includes(needs.network))
    .filter(o => needs.voiceMinutes !== -1 || o.voiceMinutes === -1)
    .filter(o => needs.smsCount !== -1 || o.smsCount === -1)
    .map(o => scoreOffer(o, needs))

  // ── Ranked priority elicitation — tiered ranking ───────────────────────────
  // The user ranks up to 2 criteria. Offers are grouped into TIERS by the top
  // priority's merit; within a tier the 2nd priority decides the order. The 2nd can
  // never lift an offer past a higher tier — "follow the top priority, then get as
  // close as possible to the 2nd."
  const ranked = priorities.filter(Boolean).slice(0, 2)
  if (ranked.length > 0 && scored.length > 0) {
    // Per-criterion merit, 0 → 1, scored against the user's stated NEED — never
    // normalised across the pool. An offer that fully covers the need scores 1;
    // anything beyond the need is capped at 1. This keeps a catalogue outlier (e.g.
    // a freak 1000 GB plan) from compressing every realistic offer toward 0.
    // Unlimited (-1) always scores 1.
    const merit = (pri: string, o: any): number => {
      if (pri === 'price')
        // CHEAPER IS BETTER. The budget is the user's monthly ceiling, not a target —
        // an offer at 0 DA scores 1, an offer at the ceiling scores 0. This matches
        // how the budget is interpreted everywhere else in the app (the savings
        // indicator on each card uses the same ceiling semantics).
        return clamp01(1 - o.priceDA / Math.max(needs.budget, 1))
      if (pri === 'data') {
        if (o.dataGB === -1) return 1
        return needs.dataGB > 0 ? clamp01(o.dataGB / needs.dataGB) : 0.5
      }
      if (pri === 'calls') {
        if (o.voiceMinutes === -1) return 1
        if (needs.voiceMinutes === -1) return 0          // user wants unlimited, offer isn't
        return needs.voiceMinutes > 0 ? clamp01(o.voiceMinutes / needs.voiceMinutes) : 0.5
      }
      if (pri === 'sms') {
        if (o.smsCount === -1) return 1
        if (needs.smsCount === -1) return 0              // user wants unlimited, offer isn't
        return needs.smsCount > 0 ? clamp01(o.smsCount / needs.smsCount) : 0.5
      }
      if (pri === 'network')
        return networkMerit(o.network)
      return 0
    }

    // Tier by the TOP priority's merit (rounded to 0.25 → ~4 broad tiers, so a real
    // range of e.g. "cheap" offers shares a tier); within a tier the 2nd priority
    // refines the order. The 2nd term is kept strictly below one tier-step (0.25), so
    // it can never push an offer past a higher tier. The base fitness score (r.score
    // so far) only breaks an exact tie.
    const keyed = scored.map(r => {
      const m1 = merit(ranked[0], r.offer)
      const m2 = ranked[1] ? merit(ranked[1], r.offer) : 0
      if (m1 >= 0.66) r.matchReasons.push({ key: `match.priority.${ranked[0]}` })
      if (ranked[1] && m2 >= 0.66) r.matchReasons.push({ key: `match.priority.${ranked[1]}` })
      // Two priorities: TIER by the 1st (round to 0.25), then refine by the 2nd
      // (bounded below the tier width 0.25, so the 2nd cannot cross a tier).
      // One priority: rank purely by the 1st priority's continuous merit — no
      // tier coarsening to lose precision when there is no 2nd criterion that
      // would need a tier band to act inside.
      const composite = ranked[1]
        ? Math.round(m1 * 4) / 4 + m2 * 0.24
        : m1
      return { r, composite, base: r.score }
    })
    keyed.sort((a, b) => b.composite - a.composite || b.base - a.base)
    scored.length = 0
    const maxComposite = ranked[1] ? 1.24 : 1.0
    for (const k of keyed) {
      // composite ∈ [0, maxComposite] → scale to 0–100.
      k.r.score = Math.round((k.composite / maxComposite) * 100)
      scored.push(k.r)
    }
  } else {
    scored.sort((a, b) => b.score - a.score)
  }

  // No post-hoc reordering. Lexicographic strict priority means the ordering
  // produced by the tiered ranking is the final ordering — anything else would
  // contradict the Fishburn (1974) framing we cite in Chapter 1 §1.3.2.
  return scored.slice(0, topN)
}

function clamp01(x: number): number {
  return x < 0 ? 0 : x > 1 ? 1 : x
}

/**
 * Merit of an offer's network for the "network" priority. Picking Network as a
 * priority means "I want the best network technology" — newer tech ranks higher,
 * regardless of any 4G/5G filter the user may or may not have set.
 */
function networkMerit(network: string): number {
  const n = String(network || '').toLowerCase()
  if (n.includes('5g')) return 1
  if (n.includes('4g')) return 0.6
  if (n.includes('3g')) return 0.3
  return 0.15
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
