import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import { z } from 'zod'

const schema = z.object({ code: z.string().min(1) })

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await req.json()
  const parsed = schema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
  }

  const adminCode = process.env.ADMIN_ACCESS_CODE
  if (!adminCode || parsed.data.code !== adminCode) {
    return NextResponse.json({ error: 'Invalid access code' }, { status: 403 })
  }

  await db.user.update({
    where: { id: session.user.id },
    data: { role: 'ADMIN' },
  })

  return NextResponse.json({ promoted: true })
}
