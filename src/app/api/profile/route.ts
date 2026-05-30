import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { auth } from '@/lib/auth'
import { db } from '@/lib/db'

// All fields optional — the profile is upserted, so a partial update is valid.
const profileSchema = z.object({
  monthlyBudget: z.coerce.number().min(0).optional(),
  dataUsageGB: z.coerce.number().min(0).optional(),
  voiceMinutes: z.coerce.number().optional(),
  smsCount: z.coerce.number().optional(),
  preferredType: z.string().optional(),
  preferredNet: z.string().optional(),
  preferredOperator: z.string().optional(),
  priorities: z.union([z.array(z.string()), z.string()]).optional(),
})

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
    const parsed = profileSchema.safeParse(await req.json())
    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid profile data' }, { status: 400 })
    }
    const { monthlyBudget, dataUsageGB, voiceMinutes, smsCount, preferredType, preferredNet, preferredOperator, priorities } = parsed.data

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
