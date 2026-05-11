import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import { recommendOffers } from '@/lib/recommendation'
import { rateLimit, getRateLimitKey } from '@/lib/rate-limit'

export async function POST(req: NextRequest) {
  if (!await rateLimit(getRateLimitKey(req, 'recommendations'), 10, 60 * 1000)) {
    return NextResponse.json({ error: 'Too many requests. Try again later.' }, { status: 429 })
  }

  try {
    const body = await req.json()
    const { budget, dataGB, voiceMinutes, smsCount, type, network, priority, budgetStrict } = body

    if (!budget || budget <= 0) {
      return NextResponse.json({ error: 'Invalid budget value' }, { status: 400 })
    }

    // Build operator affinity from the user's saved offers
    const session = await auth()
    const operatorAffinity: Record<string, number> = {}
    if (session?.user?.id) {
      const saved = await db.savedOffer.findMany({
        where: { userId: session.user.id },
        include: { offer: { select: { operatorId: true } } },
      })
      for (const s of saved) {
        if (s.offer?.operatorId) {
          operatorAffinity[s.offer.operatorId] = (operatorAffinity[s.offer.operatorId] ?? 0) + 1
        }
      }
    }

    const allOffers = await db.offer.findMany({
      where: { isActive: true },
      include: { operator: true },
    })

    const needs = {
      budget: parseFloat(budget),
      dataGB: parseFloat(dataGB || '0'),
      voiceMinutes: body.voiceMinutes === -1 ? -1 : parseInt(voiceMinutes || '0'),
      smsCount: body.smsCount === -1 ? -1 : parseInt(smsCount || '0'),
      type: type || 'any',
      network: network || 'any',
    }

    const recommendations = recommendOffers(allOffers, needs, 3, operatorAffinity, priority || '', !!budgetStrict)

    return NextResponse.json({ recommendations, needs })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
