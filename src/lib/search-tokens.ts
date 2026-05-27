/**
 * Client-side search-query tokenizer — mirrors the parser inside
 * `/api/offers` (the GET handler's `if (search)` block). Its job is presentation
 * only: it produces a list of structured tokens so the UI can show the user
 * "here is what your query was interpreted as" — same logic the API uses to
 * build the actual DB query, but returned as display tokens instead of Prisma
 * `where` clauses.
 *
 * Keep the regexes here in sync with the ones in
 * `src/app/api/offers/route.ts`.
 */

export type SearchToken =
  | { kind: 'data';      value: number }
  | { kind: 'price';     value: number }
  | { kind: 'network';   value: '3G' | '4G' | '5G' }
  | { kind: 'unlimited' }
  | { kind: 'operator';  value: 'djezzy' | 'ooredoo' | 'mobilis' }
  | { kind: 'type';      value: 'PREPAID' | 'POSTPAID' }
  | { kind: 'text';      value: string }

export function parseSearchTokens(query: string): SearchToken[] {
  let s = query.toLowerCase().trim()
  const tokens: SearchToken[] = []

  s = s.replace(/(\d+(?:[.,]\d+)?)\s*(gb|go|giga|gigas)\b/g, (_m, n: string) => {
    tokens.push({ kind: 'data', value: parseFloat(n.replace(',', '.')) })
    return ' '
  })
  s = s.replace(/(\d+)\s*(da|dzd|dinars?|dj)\b/g, (_m, n: string) => {
    tokens.push({ kind: 'price', value: parseInt(n) })
    return ' '
  })
  // Note: numeric "10 sms" / "100 min" tokens are intentionally NOT parsed —
  // the catalogue stores calls and SMS as binary (-1 unlimited / 0 none), so a
  // numeric match would always be empty. The "unlimited" keyword below covers
  // the only meaningful case.
  s = s.replace(/\b([345])\s*g\b/g, (_m, g: string) => {
    tokens.push({ kind: 'network', value: `${g}G` as '3G' | '4G' | '5G' })
    return ' '
  })
  if (/unlimited|illimit|infini/.test(s)) {
    s = s.replace(/unlimited|illimit[a-zà-ÿ]*|infini[a-zà-ÿ]*/g, ' ')
    tokens.push({ kind: 'unlimited' })
  }
  for (const op of ['djezzy', 'ooredoo', 'mobilis'] as const) {
    if (s.includes(op)) {
      tokens.push({ kind: 'operator', value: op })
      s = s.split(op).join(' ')
    }
  }
  if (/pr[ée]pay|prepaid|recharge/.test(s)) {
    s = s.replace(/pr[ée]pay[a-zà-ÿ]*|prepaid|recharges?/g, ' ')
    tokens.push({ kind: 'type', value: 'PREPAID' })
  }
  if (/postpay|postpaid|abonnement/.test(s)) {
    s = s.replace(/postpay[a-zà-ÿ]*|postpaid|abonnements?/g, ' ')
    tokens.push({ kind: 'type', value: 'POSTPAID' })
  }
  for (const word of s.split(/\s+/).map(w => w.trim()).filter(w => w.length >= 2)) {
    tokens.push({ kind: 'text', value: word })
  }
  return tokens
}
