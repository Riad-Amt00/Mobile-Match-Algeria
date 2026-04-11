import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

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

export function formatDA(amount: number): string {
  return new Intl.NumberFormat('fr-DZ').format(amount) + ' DA'
}

export function formatData(gb: number): string {
  if (gb === 0) return 'Illimité'
  if (gb < 1) return `${Math.round(gb * 1000)} MB`
  return `${gb} GB`
}

export function formatMinutes(min: number | null | undefined): string {
  if (min === null || min === undefined) return 'N/A'
  if (min === -1) return 'Illimité'
  if (min === 0) return 'Aucun'
  return `${min} min`
}

export function formatSms(sms: number | null | undefined): string {
  if (sms === null || sms === undefined) return 'N/A'
  if (sms === -1) return 'Illimité'
  if (sms === 0) return 'Aucun'
  return `${sms} SMS`
}

export function formatValidity(days: number): string {
  if (days === 1) return '24h'
  if (days === 7) return '1 semaine'
  if (days === 14) return '2 semaines'
  if (days === 30) return '1 mois'
  if (days === 90) return '3 mois'
  if (days === 365) return '1 an'
  if (days < 30) return `${days} jours`
  return `${Math.round(days / 30)} mois`
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
