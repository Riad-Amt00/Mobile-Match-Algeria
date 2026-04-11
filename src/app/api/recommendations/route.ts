import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { recommendOffers } from '@/lib/recommendation'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { budget, dataGB, voiceMinutes, smsCount, type, network } = body

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
      voiceMinutes: parseInt(voiceMinutes || '0'),
      smsCount: parseInt(smsCount || '0'),
      type: type || 'any',
      network: network || 'any',
    }

    const recommendations = recommendOffers(allOffers, needs, 3)

    return NextResponse.json({ recommendations, needs })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
