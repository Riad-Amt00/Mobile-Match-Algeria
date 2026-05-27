import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

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
      s = s.replace(/(\d+(?:[.,]\d+)?)\s*(gb|go|giga|gigas)\b/g, (_m, n: string) => {
        const gb = parseFloat(n.replace(',', '.'))
        AND.push({ OR: [{ dataGB: -1 }, { dataGB: { gte: gb * 0.7, lte: gb * 3 } }] })
        return ' '
      })
      // Price: "1000da", "500 dinars" → within ±30% of the stated price
      s = s.replace(/(\d+)\s*(da|dzd|dinars?|dj)\b/g, (_m, n: string) => {
        const p = parseInt(n)
        AND.push({ priceDA: { gte: Math.round(p * 0.7), lte: Math.round(p * 1.3) } })
        return ' '
      })
      // SMS: "10 sms", "100sms" → at least N SMS (or unlimited)
      s = s.replace(/(\d+)\s*sms\b/g, (_m, n: string) => {
        AND.push({ OR: [{ smsCount: -1 }, { smsCount: { gte: parseInt(n) } }] })
        return ' '
      })
      // Minutes: "100 min", "200 minutes" → at least N minutes (or unlimited)
      s = s.replace(/(\d+)\s*(minutes?|mins?|mn)\b/g, (_m, n: string) => {
        AND.push({ OR: [{ voiceMinutes: -1 }, { voiceMinutes: { gte: parseInt(n) } }] })
        return ' '
      })
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
      // Remaining free-text words — each must appear in name or features (AND).
      // French terms are mapped to the English text stored in the DB.
      const ALIAS: Record<string, string> = {
        appel: 'call', appels: 'call', voix: 'call',
        texto: 'sms', message: 'sms', messages: 'sms',
        réseaux: 'social', réseau: 'social', sociaux: 'social',
        gratuit: 'free', gratuite: 'free', gratuits: 'free', gratuites: 'free',
        données: 'data',
      }
      for (const word of s.split(/\s+/).map(w => w.trim()).filter(w => w.length >= 2)) {
        const term = ALIAS[word] || word
        AND.push({ OR: [
          { name: { contains: term } },
          { features: { contains: term } },
          { operator: { name: { contains: term } } },
        ] })
      }

      if (AND.length > 0) where.AND = AND
    }

    const page  = Math.max(1, parseInt(searchParams.get('page')  ?? '1'))
    const limit = Math.min(48, parseInt(searchParams.get('limit') ?? '24'))
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
