import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'
import type { TKey } from '@/lib/i18n'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[àáâãäå]/g, 'a')
    .replace(/[èéêë]/g, 'e')
    .replace(/[ìíîï]/g, 'i')
    .replace(/[òóôõö]/g, 'o')
    .replace(/[ùúûü]/g, 'u')
    .replace(/[ç]/g, 'c')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

type TFn = (key: TKey) => string

export function formatDA(amount: number): string {
  return new Intl.NumberFormat('fr-DZ').format(amount) + ' DA'
}

export function formatData(gb: number, t?: TFn): string {
  if (gb === 0) return t ? t('common.unlimited') : 'Unlimited'
  if (gb < 1) return `${Math.round(gb * 1000)} MB`
  return `${gb} GB`
}

export function formatMinutes(min: number | null | undefined, t?: TFn): string {
  if (min === null || min === undefined) return t ? t('common.naValue') : 'N/A'
  if (min === -1) return t ? t('common.unlimited') : 'Unlimited'
  if (min === 0) return t ? t('common.none') : 'None'
  return `${min} ${t ? t('common.min') : 'min'}`
}

export function formatSms(sms: number | null | undefined, t?: TFn): string {
  if (sms === null || sms === undefined) return t ? t('common.naValue') : 'N/A'
  if (sms === -1) return t ? t('common.unlimited') : 'Unlimited'
  if (sms === 0) return t ? t('common.none') : 'None'
  return `${sms} SMS`
}

/**
 * Recovers whether an UNLIMITED calls/SMS allowance applies on-net (same operator
 * only) or to all networks, by reading the offer's scraped feature list. Algerian
 * operators sell "unlimited" as either on-net (e.g. «illimité vers Djezzy») or
 * all-networks («illimité tous réseaux»); the binary voiceMinutes/smsCount sentinel
 * (-1) cannot carry that distinction, so it is recovered from the feature text here.
 * Returns null when the features do not make the scope explicit.
 */
export function unlimitedScope(features: string[], kind: 'calls' | 'sms'): 'all' | 'onnet' | null {
  const relevant = features.filter(f => {
    const l = f.toLowerCase()
    const mentionsKind = kind === 'calls' ? /call|appel|voix|مكالمات/.test(l) : /sms|رسائل/.test(l)
    // «illimité vers X» / «unlimited toward X» lines often cover BOTH calls and SMS.
    const generic = /illimit[ée]s? vers|unlimited.*(toward|vers)/.test(l)
    return mentionsKind || generic
  })
  const text = relevant.join(' · ').toLowerCase()
  if (!text) return null
  if (/all network|tous les r[ée]seaux|toutes? directions|كل الشبكات/.test(text)) return 'all'
  if (/vers (djezzy|ooredoo|mobilis)|(djezzy|ooredoo|mobilis) (calls|sms)|m[êe]me r[ée]seau|same network|on-?net/.test(text)) return 'onnet'
  return null
}

type OfferLike = { voiceMinutes: number; smsCount: number; features?: string | string[]; operator?: { name?: string } }

function offerFeatures(o: OfferLike): string[] {
  if (Array.isArray(o.features)) return o.features
  return typeof o.features === 'string' ? parseFeatures(o.features) : []
}

/**
 * A finite cross-network allowance bundled on top of an on-net unlimited plan,
 * e.g. "20 SMS to other networks", "50 SMS vers autres réseaux", "100 SMS vers les
 * autres réseaux nationaux". Returns the count (as a string) when present.
 */
function offNetCount(features: string[], kind: 'calls' | 'sms'): string | null {
  const unit = kind === 'sms' ? '(?:sms|رسائل)' : '(?:min|minutes?|دقيقة)'
  const re = new RegExp(`(\\d+)\\s*${unit}[^\\d]*(?:other|autre|أخرى)`, 'i')
  for (const f of features) {
    const m = f.match(re)
    if (m) return m[1]
  }
  return null
}

function scopedUnlimited(features: string[], kind: 'calls' | 'sms', operatorName: string | undefined, t?: TFn): string {
  const scope = unlimitedScope(features, kind)
  if (!t) return 'Unlimited'
  if (scope === 'all') return t('offer.unlimitedAllNet')
  let label = scope === 'onnet' && operatorName
    ? t('offer.unlimitedOnNet').replace('{op}', operatorName)
    : t('common.unlimited')
  // Append a bundled cross-network allowance (e.g. "+ 20 off-net") when the plan is
  // unlimited on-net but also includes a finite quota to other networks.
  const off = offNetCount(features, kind)
  if (off) label += ' ' + t('offer.plusOffNet').replace('{n}', off)
  return label
}

/** Calls allowance label — scope-aware when unlimited (e.g. «Unlimited (Djezzy)»). */
export function formatCalls(o: OfferLike, t?: TFn): string {
  if (o.voiceMinutes !== -1) return formatMinutes(o.voiceMinutes, t)
  return scopedUnlimited(offerFeatures(o), 'calls', o.operator?.name, t)
}

/** SMS allowance label — scope-aware when unlimited. */
export function formatSmsScoped(o: OfferLike, t?: TFn): string {
  if (o.smsCount !== -1) return formatSms(o.smsCount, t)
  return scopedUnlimited(offerFeatures(o), 'sms', o.operator?.name, t)
}

/**
 * The recharge/airtime credit an offer includes, if any (e.g. "300 DA credit",
 * "International credit included"). Read from the scraped feature list and surfaced
 * on the offer card. Returns null when the offer grants no credit.
 */
export function offerCredit(o: OfferLike): string | null {
  return offerFeatures(o).find(f => /cr[éèe]dit/i.test(f)) ?? null
}

export function formatValidity(days: number, t?: TFn): string {
  if (!t) {
    if (days === 1) return '24h'
    if (days === 7) return '1 week'
    if (days === 14) return '2 weeks'
    if (days === 30) return '1 month'
    if (days === 90) return '3 months'
    if (days === 365) return '1 year'
    if (days < 30) return `${days} days`
    return `${Math.round(days / 30)} months`
  }
  if (days === 1) return t('common.validity.24h')
  if (days === 7) return t('common.validity.1week')
  if (days === 14) return t('common.validity.2weeks')
  if (days === 30) return t('common.validity.1month')
  if (days === 90) return t('common.validity.3months')
  if (days === 365) return t('common.validity.1year')
  if (days < 30) return `${days} ${t('common.days')}`
  return `${Math.round(days / 30)} ${t('common.months')}`
}

export function getOperatorColor(slug: string): string {
  const colors: Record<string, string> = {
    djezzy: '#E30613',
    ooredoo: '#E20074',
    mobilis: '#00A651',
  }
  return colors[slug] || '#6366f1'
}

export function getOperatorGradient(slug: string): string {
  const gradients: Record<string, string> = {
    djezzy: 'from-red-600 to-red-800',
    ooredoo: 'from-pink-600 to-purple-700',
    mobilis: 'from-green-600 to-emerald-700',
  }
  return gradients[slug] || 'from-indigo-600 to-purple-700'
}

export function parseFeatures(featuresJson: string): string[] {
  try {
    return JSON.parse(featuresJson) as string[]
  } catch {
    return []
  }
}

export function getPricePerGB(priceDA: number, dataGB: number): number {
  if (dataGB === 0) return 0 // unlimited
  return Math.round(priceDA / dataGB)
}

export const OPERATOR_LOGOS: Record<string, string> = {
  djezzy:  '/logos/djezzy.svg',
  ooredoo: '/logos/ooredoo.svg',
  mobilis: '/logos/mobilis.svg',
}

export const COVERAGE_URLS: Record<string, string> = {
  djezzy:  'https://www.djezzy.dz/couverture-reseau/',
  ooredoo: 'https://www.ooredoo.dz/particuliers/assistance/carte-de-couverture/',
  mobilis: 'https://www.mobilis.dz/couverture/',
}

export const FEATURE_ICONS: Record<string, string> = {
  streaming: 'play', anaflix: 'play', shahid: 'play', youtube: 'play',
  'réseaux sociaux': 'share', facebook: 'share', tiktok: 'share', instagram: 'share', social: 'share',
  nuit: 'moon', 'bonus nuit': 'moon',
  roaming: 'globe',
  'illimité': 'infinity',
}

export const RANK_COLORS = ['#F59E0B', '#94A3B8', '#CD7C3E']
export const RANK_GRADIENTS = [
  'linear-gradient(135deg, #F59E0B 0%, #D97706 100%)',
  'linear-gradient(135deg, #CBD5E1 0%, #94A3B8 100%)',
  'linear-gradient(135deg, #CD7C3E 0%, #A16207 100%)',
]
export const RANK_BG = [
  'rgba(245,158,11,0.10)',
  'rgba(148,163,184,0.06)',
  'rgba(205,124,62,0.08)',
]

/**
 * Returns the clean brand/family name of an offer, stripping redundant price,
 * data-size, and period suffixes that are already shown separately on the card.
 * Examples: "Djezzy LEGEND 1000" → "Djezzy LEGEND"
 *           "DjezzyNet Daily 15 DA" → "DjezzyNet Daily"
 *           "Djezzy 3ayla 3 Months" → "Djezzy 3ayla"
 */
export function cleanOfferName(name: string): string {
  return name
    .replace(/\s+\d[\d\s,.]*\s*(DA|DZD)\s*$/i, '')
    .replace(/\s+\d[\d,.]*\s*(GB|MB)\s*$/i, '')
    .replace(/\s+\d+\s+(months?|mois|years?|ans?|semaines?|weeks?|days?|jours?)\s*$/i, '')
    .replace(/\s+(annual|annuel|annually)\s*$/i, '')
    .replace(/\s+\d+(\s+\w+)?\s*$/, '')
    .trim()
}

export function getNetworkStyle(network: string) {
  const is5G = network.includes('5G')
  return {
    background: is5G ? 'rgba(139,92,246,0.12)' : 'var(--accent-muted)',
    border: `1px solid ${is5G ? 'rgba(139,92,246,0.28)' : 'var(--accent-border)'}`,
    color: is5G ? '#a78bfa' : 'var(--accent)',
  }
}
