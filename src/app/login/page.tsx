'use client'

import { useState } from 'react'
import Link from 'next/link'
import { signIn } from 'next-auth/react'
import { useRouter, useSearchParams } from 'next/navigation'
import { ArrowLeft, Mail, Lock, Eye, EyeOff, Loader2, Smartphone, CheckCircle } from 'lucide-react'
import { useLang } from '@/lib/lang-context'

export default function LoginPage() {
  const { t } = useLang()
  const router = useRouter()
  const params = useSearchParams()
  const registered = params.get('registered') === '1'

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPass, setShowPass] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')
    try {
      const res = await signIn('credentials', { email, password, redirect: false })
      if (res?.error) {
        setError(t('login.errorCreds'))
        return
      }
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
      <div style={{ width: '100%', maxWidth: 420 }}>
        <Link href="/" style={{
          display: 'inline-flex', alignItems: 'center', gap: 6,
          color: 'var(--text-muted)', textDecoration: 'none', fontSize: 13,
          fontWeight: 500, marginBottom: '2rem',
          transition: 'color 0.15s',
        }}>
          <ArrowLeft size={15} /> {t('login.back')}
        </Link>

        <div style={{
          background: 'var(--bg-card)', borderRadius: 16,
          border: '1px solid var(--border-base)',
          boxShadow: 'var(--shadow-elevated)',
          padding: '2.25rem',
        }}>
          {/* Logo */}
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
              {t('login.title')}
            </h1>
            <p style={{ color: 'var(--text-secondary)', fontSize: 14 }}>
              {t('login.subtitle')}
            </p>
          </div>

          {registered && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '0.75rem 1rem', borderRadius: 10, background: 'var(--color-success-muted)', border: '1px solid var(--color-success-border)', color: 'var(--color-success)', fontSize: 13, fontWeight: 600, marginBottom: '1.25rem' }}>
              <CheckCircle size={15} /> {t('login.registered')}
            </div>
          )}

          <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
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
                  placeholder="••••••••"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  required
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
                color: '#DC2626', display: 'flex', alignItems: 'center', gap: 7,
              }}>
                <span style={{ fontSize: 15 }}>⚠</span> {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              style={{
                padding: '0.875rem', fontSize: 15, fontWeight: 700, borderRadius: 10,
                marginTop: 4, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                background: loading ? 'var(--accent-hover)' : 'var(--accent)',
                color: 'white', border: 'none', cursor: loading ? 'wait' : 'pointer',
                fontFamily: 'inherit', transition: 'background 0.15s',
                boxShadow: 'var(--btn-primary-shadow)',
              }}>
              {loading ? <><Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} /> {t('login.signingIn')}</> : t('login.submit')}
            </button>

            <p style={{ textAlign: 'center', fontSize: 13, color: 'var(--text-secondary)', margin: 0 }}>
              {t('login.noAccount')}{' '}
              <Link href="/register" style={{ color: 'var(--accent)', textDecoration: 'none', fontWeight: 600 }}>
                {t('login.createFree')}
              </Link>
            </p>
          </form>
        </div>
      </div>
    </div>
  )
}
