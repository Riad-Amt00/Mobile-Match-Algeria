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
      where.OR = [
        { name: { contains: search } },
        { operator: { name: { contains: search } } },
      ]
    }

    const offers = await db.offer.findMany({
      where,
      include: { operator: true },
      orderBy: [{ isFeatured: 'desc' }, { priceDA: 'asc' }],
    })

    return NextResponse.json({ offers, total: offers.length })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
