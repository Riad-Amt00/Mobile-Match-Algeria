import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { db } from '@/lib/db'

export async function GET(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })

  const profile = await db.userProfile.findUnique({
    where: { userId: session.user.id },
  })

  return NextResponse.json({ profile })
}

export async function PUT(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })

  try {
    const body = await req.json()
    const { monthlyBudget, dataUsageGB, voiceMinutes, smsCount, preferredType, preferredNet, preferredOperator, priorities } = body

    // Ranked priorities arrive as a string array; stored comma-separated.
    const prioritiesStr = Array.isArray(priorities)
      ? priorities.filter(Boolean).slice(0, 3).join(',')
      : typeof priorities === 'string'
        ? priorities
        : undefined

    const data = { monthlyBudget, dataUsageGB, voiceMinutes, smsCount, preferredType, preferredNet, preferredOperator,
      ...(prioritiesStr !== undefined ? { priorities: prioritiesStr } : {}) }

    const profile = await db.userProfile.upsert({
      where: { userId: session.user.id },
      update: data,
      create: { userId: session.user.id, ...data },
    })

    return NextResponse.json({ profile })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
