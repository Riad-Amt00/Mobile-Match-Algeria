import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { recommendOffers } from '@/lib/recommendation'
import { rateLimit, getRateLimitKey } from '@/lib/rate-limit'

export async function POST(req: NextRequest) {
  if (!await rateLimit(getRateLimitKey(req, 'recommendations'), 60, 60 * 1000)) {
    return NextResponse.json({ error: 'Too many requests. Try again later.' }, { status: 429 })
  }

  try {
    const body = await req.json()
    const { budget, dataGB, voiceMinutes, smsCount, type, network, operator, priorities } = body

    if (!budget || budget <= 0) {
      return NextResponse.json({ error: 'Invalid budget value' }, { status: 400 })
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
      operator: operator || 'any',
    }

    const recommendations = recommendOffers(
      allOffers, needs, 3,
      Array.isArray(priorities) ? priorities : []
    )

    return NextResponse.json({ recommendations, needs })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
