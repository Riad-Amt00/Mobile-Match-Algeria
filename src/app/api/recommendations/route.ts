import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { db } from '@/lib/db'
import { recommendOffers } from '@/lib/recommendation'
import { rateLimit, getRateLimitKey } from '@/lib/rate-limit'

// Validate the request body. coerce.number accepts a number or a numeric string;
// the unlimited sentinel (-1) for calls/SMS passes through unchanged.
const recommendSchema = z.object({
  budget: z.coerce.number().positive(),
  dataGB: z.coerce.number().min(0).default(0),
  voiceMinutes: z.coerce.number().default(0),
  smsCount: z.coerce.number().default(0),
  type: z.string().default('any'),
  network: z.string().default('any'),
  operator: z.string().default('any'),
})

export async function POST(req: NextRequest) {
  if (!await rateLimit(getRateLimitKey(req, 'recommendations'), 60, 60 * 1000)) {
    return NextResponse.json({ error: 'Too many requests. Try again later.' }, { status: 429 })
  }

  try {
    const parsed = recommendSchema.safeParse(await req.json())
    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid request: a positive budget is required.' }, { status: 400 })
    }
    const { budget, dataGB, voiceMinutes, smsCount, type, network, operator } = parsed.data

    const allOffers = await db.offer.findMany({
      where: { isActive: true },
      include: { operator: true },
    })

    const needs = { budget, dataGB, voiceMinutes, smsCount, type, network, operator }
    const recommendations = recommendOffers(allOffers, needs, 3)

    return NextResponse.json({ recommendations, needs })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
