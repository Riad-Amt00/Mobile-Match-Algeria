import { NextResponse } from 'next/server'
import { db } from '@/lib/db'

export const dynamic = 'force-dynamic'
export const revalidate = 0

export async function GET() {
  try {
    const [totalOffers, operators, recentScrape] = await Promise.all([
      db.offer.count({ where: { isActive: true } }),
      db.operator.findMany({
        include: {
          _count: { select: { offers: { where: { isActive: true } } } },
        },
      }),
      db.scrapeLog.findFirst({
        where: { status: 'SUCCESS' },
        orderBy: { completedAt: 'desc' },
      }),
    ])

    const priceStats = await db.offer.aggregate({
      where: { isActive: true },
      _avg: { priceDA: true },
      _min: { priceDA: true },
      _max: { priceDA: true },
    })

    // Highest finite data volume in the catalogue (the -1 "unlimited" sentinel is
    // the smallest value, so _max returns the largest real GB figure). Used by the
    // recommend / offers sliders to size their ceilings dynamically.
    const dataStats = await db.offer.aggregate({
      where: { isActive: true },
      _max: { dataGB: true },
    })

    return NextResponse.json({
      totalOffers,
      avgPrice: Math.round(priceStats._avg.priceDA ?? 0),
      minPrice: priceStats._min.priceDA ?? 0,
      maxPrice: priceStats._max.priceDA ?? 0,
      maxData: dataStats._max.dataGB ?? 0,
      operators: operators.map(op => ({
        name: op.name,
        slug: op.slug,
        offerCount: op._count.offers,
        color: op.primaryColor,
      })),
      lastUpdated: recentScrape?.completedAt ?? null,
    })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
