import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { sendVerificationEmail } from '@/lib/email'
import { rateLimit, getRateLimitKey } from '@/lib/rate-limit'
import { z } from 'zod'

const verifySchema = z.object({
  email: z.string().email(),
  code: z.string().length(6),
})

const resendSchema = z.object({
  email: z.string().email(),
  resend: z.literal(true),
})

export async function POST(req: NextRequest) {
  if (!rateLimit(getRateLimitKey(req, 'verify'), 10, 15 * 60 * 1000)) {
    return NextResponse.json({ error: 'Too many requests. Try again later.' }, { status: 429 })
  }

  try {
    const body = await req.json()

    // Handle resend request
    if (body.resend === true) {
      const parsed = resendSchema.safeParse(body)
      if (!parsed.success) return NextResponse.json({ error: 'Invalid request' }, { status: 400 })

      const { email } = parsed.data
      const user = await db.user.findUnique({ where: { email } })
      if (!user || user.emailVerified) {
        return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
      }

      const code = Math.floor(100000 + Math.random() * 900000).toString()
      const expires = new Date(Date.now() + 3 * 60 * 1000)
      await db.verificationToken.deleteMany({ where: { identifier: email } })
      await db.verificationToken.create({ data: { identifier: email, token: code, expires } })
      await sendVerificationEmail(email, code)

      return NextResponse.json({ sent: true })
    }

    // Handle verification
    const parsed = verifySchema.safeParse(body)
    if (!parsed.success) return NextResponse.json({ error: 'Invalid code format' }, { status: 400 })

    const { email, code } = parsed.data

    const token = await db.verificationToken.findFirst({ where: { identifier: email } })

    if (!token) {
      return NextResponse.json({ error: 'No verification code found. Please request a new one.' }, { status: 400 })
    }

    if (new Date() > token.expires) {
      await db.verificationToken.deleteMany({ where: { identifier: email } })
      return NextResponse.json({ error: 'Code expired. Request a new one.' }, { status: 400 })
    }

    if (token.token !== code) {
      return NextResponse.json({ error: 'Incorrect code. Please try again.' }, { status: 400 })
    }

    await db.user.update({ where: { email }, data: { emailVerified: new Date() } })
    await db.verificationToken.deleteMany({ where: { identifier: email } })

    return NextResponse.json({ verified: true })
  } catch (error: any) {
    console.error('Verify email error:', error)
    return NextResponse.json({ error: 'Verification failed. Please try again.' }, { status: 500 })
  }
}
