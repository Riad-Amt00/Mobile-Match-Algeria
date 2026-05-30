import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { auth } from '@/lib/auth'
import { db } from '@/lib/db'

const toggleSchema = z.object({ offerId: z.string().min(1) })

// GET /api/saved-offers — list saved offer IDs for current user
export async function GET() {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ savedIds: [] })

  const saved = await db.savedOffer.findMany({
    where: { userId: session.user.id },
    select: { offerId: true, savedAt: true, offer: { include: { operator: true } } },
    orderBy: { savedAt: 'desc' },
  })

  const activeSaved = saved.filter(s => s.offer?.isActive !== false)

  return NextResponse.json({
    savedIds: activeSaved.map(s => s.offerId),
    savedOffers: activeSaved.map(s => s.offer),
  })
}

// POST /api/saved-offers — toggle save/unsave
export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
  }

  const parsed = toggleSchema.safeParse(await req.json())
  if (!parsed.success) return NextResponse.json({ error: 'offerId is required' }, { status: 400 })
  const { offerId } = parsed.data

  const offerExists = await db.offer.findUnique({ where: { id: offerId }, select: { id: true } })
  if (!offerExists) return NextResponse.json({ error: 'Offer not found' }, { status: 404 })

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
