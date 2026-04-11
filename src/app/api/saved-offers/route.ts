import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { db } from '@/lib/db'

// GET /api/saved-offers — list saved offer IDs for current user
export async function GET() {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ savedIds: [] })

  const saved = await db.savedOffer.findMany({
    where: { userId: session.user.id },
    select: { offerId: true, savedAt: true, offer: { include: { operator: true } } },
    orderBy: { savedAt: 'desc' },
  })

  return NextResponse.json({
    savedIds: saved.map(s => s.offerId),
    savedOffers: saved.map(s => s.offer),
  })
}

// POST /api/saved-offers — toggle save/unsave
export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })
  }

  const { offerId } = await req.json()
  if (!offerId) return NextResponse.json({ error: 'offerId requis' }, { status: 400 })

  const existing = await db.savedOffer.findUnique({
    where: { userId_offerId: { userId: session.user.id, offerId } },
  })

  if (existing) {
    await db.savedOffer.delete({ where: { id: existing.id } })
    return NextResponse.json({ saved: false })
  } else {
    await db.savedOffer.create({ data: { userId: session.user.id, offerId } })
    return NextResponse.json({ saved: true })
  }
}
