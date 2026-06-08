import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { searchOffersFts } from '@/lib/search-fts'

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const type = searchParams.get('type')       // PREPAID | POSTPAID | DATA_ONLY
    const operator = searchParams.get('operator') // djezzy | ooredoo | mobilis
    const minPrice = searchParams.get('minPrice')
    const maxPrice = searchParams.get('maxPrice')
    const minData = searchParams.get('minData')
    const network = searchParams.get('network')
    const featured = searchParams.get('featured')
    const search = searchParams.get('search')

    const ids = searchParams.get('ids')
    if (ids) {
      const idList = ids.split(',').filter(Boolean)
      if (idList.length > 0) {
        const offers = await db.offer.findMany({
          where: { id: { in: idList } },
          include: { operator: true },
        })
        return NextResponse.json({ offers, total: offers.length })
      }
    }

    const where: any = { isActive: true }

    if (type && type !== 'all') where.type = type
    if (operator && operator !== 'all') {
      where.operator = { slug: operator }
    }
    if (minPrice) where.priceDA = { ...where.priceDA, gte: parseFloat(minPrice) }
    if (maxPrice) where.priceDA = { ...where.priceDA, lte: parseFloat(maxPrice) }
    if (minData) where.dataGB = { gte: parseFloat(minData) }
    if (network && network !== 'all') where.network = { contains: network }
    if (featured === 'true') where.isFeatured = true
    if (search) {
      // ── Smart search: parse the query the way a user thinks. ────────────────
      // Structured tokens (data volume, price, SMS, minutes, network, operator,
      // plan type, "unlimited") are pulled out and matched against real columns;
      // whatever text remains must ALL appear in the name/features (AND).
      // Every extracted condition is ANDed, so "5gb djezzy" really means
      // "≥5 GB AND Djezzy", and "free internet" means "free AND internet".
      let s = search.toLowerCase().trim()
      const AND: any[] = []

      // Data volume: "5gb", "5 gb", "10go", "2giga" → plans around N GB,
      // OR unlimited (-1). Band 0.7×–3× so "5gb" finds ~5 GB plans, not every
      // 200 GB plan; unlimited covers any finite need so it always passes.
      // Mirrors how the SMS and minutes parsers handle their unlimited sentinel.
      // Megabytes first ("500mb", "500 mo", "512 mega"): the catalogue stores data
      // in GB, so convert (1 GB = 1024 MB). Must run before the GB rule so "mb"/"mo"
      // is not left for free-text search (which returned nothing for sub-GB plans).
      s = s.replace(/(\d+(?:[.,]\d+)?)\s*(mb|mo|mega|megas|m[ée]ga|m[ée]gas)\b/g, (_m, n: string) => {
        const gb = parseFloat(n.replace(',', '.')) / 1024
        AND.push({ OR: [{ dataGB: -1 }, { dataGB: { gte: gb * 0.7, lte: gb * 3 } }] })
        return ' '
      })
      s = s.replace(/(\d+(?:[.,]\d+)?)\s*(gb|go|giga|gigas)\b/g, (_m, n: string) => {
        const gb = parseFloat(n.replace(',', '.'))
        AND.push({ OR: [{ dataGB: -1 }, { dataGB: { gte: gb * 0.7, lte: gb * 3 } }] })
        return ' '
      })
      // A bare data unit with no number ("mb", "mo", "mega") → plans measured in
      // megabytes, i.e. under 1 GB — lets the user browse the small / sub-GB plans.
      s = s.replace(/\b(mb|mo|mega|megas|m[ée]ga|m[ée]gas|megabytes?|m[ée]gaoctets?)\b/g, () => {
        AND.push({ dataGB: { gt: 0, lt: 1 } })
        return ' '
      })
      // Price: "1000da", "500 dinars" → within ±30% of the stated price
      s = s.replace(/(\d+)\s*(da|dzd|dinars?|dj)\b/g, (_m, n: string) => {
        const p = parseInt(n)
        AND.push({ priceDA: { gte: Math.round(p * 0.7), lte: Math.round(p * 1.3) } })
        return ' '
      })
      // Note: calls and SMS are stored in the catalogue as binary (-1 unlimited
      // or 0 none), so numeric tokens like "100 min" or "10 sms" could not match
      // a meaningful row. Users express interest in unlimited calls / SMS via the
      // "unlimited" keyword block below.
      // Network: "4g", "5 g", "3g"
      s = s.replace(/\b([345])\s*g\b/g, (_m, g: string) => {
        AND.push({ network: { contains: `${g}G` } })
        return ' '
      })
      // "unlimited" / "illimité" → unlimited calls or SMS, or an unlimited feature
      if (/unlimited|illimit|infini/.test(s)) {
        s = s.replace(/unlimited|illimit[a-zà-ÿ]*|infini[a-zà-ÿ]*/g, ' ')
        AND.push({ OR: [{ voiceMinutes: -1 }, { smsCount: -1 }, { features: { contains: 'nlimited' } }] })
      }
      // Operator names
      for (const op of ['djezzy', 'ooredoo', 'mobilis']) {
        if (s.includes(op)) { AND.push({ operator: { slug: op } }); s = s.split(op).join(' ') }
      }
      // Plan type
      if (/pr[ée]pay|prepaid|recharge/.test(s)) {
        s = s.replace(/pr[ée]pay[a-zà-ÿ]*|prepaid|recharges?/g, ' '); AND.push({ type: 'PREPAID' })
      }
      if (/postpay|postpaid|abonnement/.test(s)) {
        s = s.replace(/postpay[a-zà-ÿ]*|postpaid|abonnements?/g, ' '); AND.push({ type: 'POSTPAID' })
      }
      // Remaining free-text words: routed to the SQLite FTS5 index. Each word
      // is mapped through a small French→English alias table (so "appel" hits
      // "call", "données" hits "data" — useful when a French user searches
      // against an English-leaning catalogue) and then sent to FTS5, which
      // gives prefix matching, BM25 relevance ranking, and Unicode-aware
      // tokenisation (accents are folded, so "illimite" matches "illimité").
      const ALIAS: Record<string, string> = {
        appel: 'call', appels: 'call', voix: 'call',
        texto: 'sms', message: 'sms', messages: 'sms',
        réseaux: 'social', réseau: 'social', sociaux: 'social',
        gratuit: 'free', gratuite: 'free', gratuits: 'free', gratuites: 'free',
        données: 'data',
      }
      const freeTextWords = s
        .split(/\s+/)
        .map(w => w.trim())
        .filter(w => w.length >= 2)
        .map(w => ALIAS[w] || w)

      if (freeTextWords.length > 0) {
        const ftsIds = await searchOffersFts(freeTextWords)
        if (ftsIds.length === 0) {
          // The free-text query found nothing — short-circuit so the response
          // is an empty list (rather than returning everything the structured
          // filters allow, which would silently ignore the user's text input).
          AND.push({ id: '__no_match__' })
        } else {
          AND.push({ id: { in: ftsIds } })
        }
      }

      if (AND.length > 0) where.AND = AND
    }

    const page  = Math.max(1, parseInt(searchParams.get('page')  ?? '1'))
    // Cap 500 (was 48) so the comparison picker can request the whole catalogue in
    // one call (?limit=500); the offers page still uses the 24 default for paging.
    const limit = Math.min(500, parseInt(searchParams.get('limit') ?? '24'))
    const skip  = (page - 1) * limit

    const [offers, total] = await Promise.all([
      db.offer.findMany({
        where,
        include: { operator: true },
        orderBy: [{ isFeatured: 'desc' }, { priceDA: 'asc' }],
        skip,
        take: limit,
      }),
      db.offer.count({ where }),
    ])

    return NextResponse.json({ offers, total, page, totalPages: Math.ceil(total / limit) })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
