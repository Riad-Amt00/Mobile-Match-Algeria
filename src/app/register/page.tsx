'use client'

import { useState } from 'react'
import Link from 'next/link'
import { ArrowLeft, Mail, Lock, User, Eye, EyeOff, Loader2, Smartphone } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { signIn } from 'next-auth/react'
import { useLang } from '@/lib/lang-context'

export default function RegisterPage() {
  const { t } = useLang()
  const router = useRouter()
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPass, setShowPass] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleRegister(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')
    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, password }),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.error || t('register.failedError')); return }

      const result = await signIn('credentials', { email, password, redirect: false })
      if (result?.error) { router.push('/login?registered=1'); return }
      router.push('/offers')
      router.refresh()
    } catch {
      setError(t('login.errorNet'))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{
      minHeight: '100vh', background: 'var(--bg-page)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '2rem 1.5rem',
    }}>
      <div style={{ width: '100%', maxWidth: 440 }}>
        <Link href="/" style={{
          display: 'inline-flex', alignItems: 'center', gap: 6,
          color: 'var(--text-muted)', textDecoration: 'none', fontSize: 13,
          fontWeight: 500, marginBottom: '2rem',
        }}>
          <ArrowLeft size={15} /> {t('login.back')}
        </Link>

        <div style={{
          background: 'var(--bg-card)', borderRadius: 16,
          border: '1px solid var(--border-base)',
          boxShadow: 'var(--shadow-elevated)',
          padding: '2.25rem',
        }}>
          <div style={{ textAlign: 'center', marginBottom: '1.75rem' }}>
            <div style={{
              width: 52, height: 52, borderRadius: 14, margin: '0 auto 1rem',
              background: 'var(--accent)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: 'var(--shadow-accent)',
            }}>
              <Smartphone size={22} color="white" />
            </div>
            <h1 style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--text-primary)', marginBottom: 6, letterSpacing: '-0.02em' }}>
              {t('register.title')}
            </h1>
            <p style={{ color: 'var(--text-secondary)', fontSize: 14 }}>
              {t('register.subtitle')}
            </p>
          </div>

          <form onSubmit={handleRegister} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div>
              <label style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', display: 'block', marginBottom: 6 }}>
                {t('register.name')}
              </label>
              <div style={{ position: 'relative' }}>
                <User size={15} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                <input
                  type="text"
                  placeholder={t('register.namePh')}
                  value={name}
                  onChange={e => setName(e.target.value)}
                  required
                  className="input-field"
                  style={{ paddingLeft: 40 }}
                />
              </div>
            </div>

            <div>
              <label style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', display: 'block', marginBottom: 6 }}>
                {t('login.email')}
              </label>
              <div style={{ position: 'relative' }}>
                <Mail size={15} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                <input
                  type="email"
                  placeholder="your@email.com"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  required
                  className="input-field"
                  style={{ paddingLeft: 40 }}
                />
              </div>
            </div>

            <div>
              <label style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', display: 'block', marginBottom: 6 }}>
                {t('login.password')}
              </label>
              <div style={{ position: 'relative' }}>
                <Lock size={15} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                <input
                  type={showPass ? 'text' : 'password'}
                  placeholder={t('register.pwPh')}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  required
                  minLength={8}
                  className="input-field"
                  style={{ paddingLeft: 40, paddingRight: 40 }}
                />
                <button
                  type="button"
                  onClick={() => setShowPass(!showPass)}
                  style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', display: 'flex' }}>
                  {showPass ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
            </div>

            {error && (
              <div style={{
                padding: '0.75rem 1rem', borderRadius: 9, fontSize: 13,
                background: 'rgba(239,68,68,0.07)', border: '1px solid rgba(239,68,68,0.25)',
                color: '#DC2626',
              }}>
                ⚠ {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              style={{
                padding: '0.875rem', fontSize: 15, fontWeight: 700, borderRadius: 10,
                marginTop: 4, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                background: 'var(--accent)', color: 'white', border: 'none',
                cursor: loading ? 'wait' : 'pointer',
                fontFamily: 'inherit', transition: 'background 0.15s',
                boxShadow: 'var(--btn-primary-shadow)',
                opacity: loading ? 0.85 : 1,
              }}>
              {loading
                ? <><Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} /> {t('register.creating')}</>
                : t('register.submit')}
            </button>

            <p style={{ textAlign: 'center', fontSize: 13, color: 'var(--text-secondary)', margin: 0 }}>
              {t('register.hasAccount')}{' '}
              <Link href="/login" style={{ color: 'var(--accent)', textDecoration: 'none', fontWeight: 600 }}>
                {t('register.signIn')}
              </Link>
            </p>
          </form>
        </div>
      </div>
    </div>
  )
}
