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
