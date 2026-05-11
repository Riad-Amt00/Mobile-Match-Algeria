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
      const s = search.toLowerCase()
      const orConditions: any[] = [
        { name: { contains: search } },
        { operator: { name: { contains: search } } },
        { features: { contains: search } },
        { network: { contains: search } },
      ]

      // For multi-word queries, also search each word individually in name + features
      const words = s.split(/\s+/).filter(w => w.length > 2)
      for (const word of words) {
        orConditions.push({ name: { contains: word } })
        orConditions.push({ features: { contains: word } })
      }

      // French → English feature aliases (features are stored in English)
      if (/appel|appels/i.test(s))         orConditions.push({ features: { contains: 'call' } })
      if (/voix/i.test(s))                 orConditions.push({ features: { contains: 'call' } })
      if (/forfait/i.test(s))              orConditions.push({ name: { contains: 'forfait' } })
      if (/r[eé]seau social|social/i.test(s)) orConditions.push({ features: { contains: 'social' } })
      if (/facebook|fb/i.test(s))          orConditions.push({ features: { contains: 'Facebook' } })
      if (/whatsapp/i.test(s))             orConditions.push({ features: { contains: 'WhatsApp' } })
      if (/youtube/i.test(s))              orConditions.push({ features: { contains: 'YouTube' } })

      // Keyword → structured field mappings (French + English)
      const isUnlimited = /illimit[eé]|unlimited|gratuit|free|infini/i.test(s)
      const isCalls     = /appel|call|voix|voice|minute|\bmin\b/i.test(s)
      const isSms       = /\bsms\b|texto|message/i.test(s)
      // Note: dataGB never uses -1; only voiceMinutes and smsCount do
      if (isUnlimited && isCalls) orConditions.push({ voiceMinutes: -1 })
      if (isUnlimited && isSms)   orConditions.push({ smsCount: -1 })
      if (isUnlimited && !isCalls && !isSms) {
        orConditions.push({ voiceMinutes: -1 }, { smsCount: -1 })
      }
      if (/prépay[eé]|prepaid|recharge/i.test(s)) orConditions.push({ type: 'PREPAID' })
      if (/postpay[eé]|postpaid|abonnement/i.test(s)) orConditions.push({ type: 'POSTPAID' })
      where.OR = orConditions
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
