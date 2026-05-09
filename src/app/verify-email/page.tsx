'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { signIn } from 'next-auth/react'

export default function VerifyEmailPage() {
  const router = useRouter()
  const params = useSearchParams()
  const email = params.get('email') ?? ''
  const password = params.get('pw') ?? ''

  const [digits, setDigits] = useState(['', '', '', '', '', ''])
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [countdown, setCountdown] = useState(180) // 3 minutes
  const [resendCooldown, setResendCooldown] = useState(60)
  const [canResend, setCanResend] = useState(false)
  const refs = useRef<(HTMLInputElement | null)[]>([])

  // Main 3-minute countdown
  useEffect(() => {
    if (countdown <= 0) return
    const t = setTimeout(() => setCountdown((c) => c - 1), 1000)
    return () => clearTimeout(t)
  }, [countdown])

  // Resend cooldown
  useEffect(() => {
    if (resendCooldown <= 0) { setCanResend(true); return }
    const t = setTimeout(() => setResendCooldown((c) => c - 1), 1000)
    return () => clearTimeout(t)
  }, [resendCooldown])

  const fmt = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`

  const handleDigit = (i: number, val: string) => {
    const d = val.replace(/\D/g, '').slice(-1)
    const next = [...digits]
    next[i] = d
    setDigits(next)
    setError('')
    if (d && i < 5) refs.current[i + 1]?.focus()
  }

  const handleKeyDown = (i: number, e: React.KeyboardEvent) => {
    if (e.key === 'Backspace' && !digits[i] && i > 0) {
      refs.current[i - 1]?.focus()
    }
  }

  const handlePaste = (e: React.ClipboardEvent) => {
    const text = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6)
    if (text.length === 6) {
      setDigits(text.split(''))
      refs.current[5]?.focus()
    }
  }

  const submit = useCallback(async (code: string) => {
    if (code.length < 6) return
    setLoading(true)
    setError('')
    try {
      const res = await fetch('/api/auth/verify-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, code }),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.error); setLoading(false); return }

      setSuccess(true)
      if (password) {
        const result = await signIn('credentials', { email, password, redirect: false })
        if (result?.ok) { router.push('/offers'); return }
      }
      router.push('/login?verified=1')
    } catch {
      setError('Something went wrong. Please try again.')
      setLoading(false)
    }
  }, [email, password, router])

  useEffect(() => {
    const code = digits.join('')
    if (code.length === 6) submit(code)
  }, [digits, submit])

  const resend = async () => {
    if (!canResend) return
    setCanResend(false)
    setResendCooldown(60)
    setCountdown(180)
    setDigits(['', '', '', '', '', ''])
    setError('')
    await fetch('/api/auth/verify-email', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, resend: true }),
    })
    refs.current[0]?.focus()
  }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg-page)', padding: '24px' }}>
      <div style={{ width: '100%', maxWidth: 440, background: 'var(--bg-card)', border: '1px solid var(--border-base)', borderRadius: 16, padding: '40px 36px', boxShadow: 'var(--shadow-elevated)' }}>

        {/* Icon */}
        <div style={{ textAlign: 'center', marginBottom: 24 }}>
          <div style={{ width: 56, height: 56, borderRadius: 16, background: 'var(--accent-muted)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', marginBottom: 16 }}>
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="2" y="4" width="20" height="16" rx="2"/><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/>
            </svg>
          </div>
          <h1 style={{ fontSize: 22, fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>Check your email</h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: 14, marginTop: 8 }}>
            We sent a 6-digit code to<br />
            <strong style={{ color: 'var(--text-primary)' }}>{email}</strong>
          </p>
        </div>

        {/* Countdown */}
        <div style={{ textAlign: 'center', marginBottom: 24 }}>
          <span style={{ fontSize: 13, color: countdown <= 30 ? '#ef4444' : 'var(--text-muted)', fontWeight: 500 }}>
            {countdown > 0 ? `Code expires in ${fmt(countdown)}` : 'Code expired — request a new one'}
          </span>
        </div>

        {/* OTP boxes */}
        <div style={{ display: 'flex', gap: 10, justifyContent: 'center', marginBottom: 20 }} onPaste={handlePaste}>
          {digits.map((d, i) => (
            <input
              key={i}
              ref={(el) => { refs.current[i] = el }}
              type="text"
              inputMode="numeric"
              maxLength={1}
              value={d}
              onChange={(e) => handleDigit(i, e.target.value)}
              onKeyDown={(e) => handleKeyDown(i, e)}
              autoFocus={i === 0}
              style={{
                width: 52, height: 60, textAlign: 'center', fontSize: 24, fontWeight: 700,
                border: `2px solid ${error ? '#ef4444' : d ? 'var(--accent)' : 'var(--border-base)'}`,
                borderRadius: 10, background: 'var(--bg-input)', color: 'var(--text-primary)',
                outline: 'none', transition: 'border-color 0.15s',
              }}
            />
          ))}
        </div>

        {error && (
          <div style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 8, padding: '10px 14px', marginBottom: 16, color: '#ef4444', fontSize: 14, textAlign: 'center' }}>
            {error}
          </div>
        )}

        {success && (
          <div style={{ background: 'rgba(34,197,94,0.08)', border: '1px solid rgba(34,197,94,0.3)', borderRadius: 8, padding: '10px 14px', marginBottom: 16, color: '#16a34a', fontSize: 14, textAlign: 'center' }}>
            ✓ Verified! Signing you in…
          </div>
        )}

        {loading && !success && (
          <p style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: 14 }}>Verifying…</p>
        )}

        {/* Resend */}
        <div style={{ textAlign: 'center', marginTop: 20, fontSize: 14, color: 'var(--text-secondary)' }}>
          Didn&apos;t receive it?{' '}
          <button
            onClick={resend}
            disabled={!canResend}
            style={{ background: 'none', border: 'none', cursor: canResend ? 'pointer' : 'not-allowed', color: canResend ? 'var(--accent)' : 'var(--text-muted)', fontWeight: 600, padding: 0, fontSize: 14 }}
          >
            {canResend ? 'Resend code' : `Resend in ${resendCooldown}s`}
          </button>
        </div>

        <div style={{ textAlign: 'center', marginTop: 20 }}>
          <a href="/register" style={{ fontSize: 13, color: 'var(--text-muted)' }}>← Back to registration</a>
        </div>
      </div>
    </div>
  )
}
