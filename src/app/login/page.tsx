'use client'

import { useState } from 'react'
import Link from 'next/link'
import { signIn } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { ArrowLeft, Mail, Lock, Eye, EyeOff, Loader2, Zap } from 'lucide-react'

export default function LoginPage() {
  const router = useRouter()
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
      if (res?.error) { setError('Incorrect email or password'); return }
      router.push('/')
      router.refresh()
    } catch {
      setError('Network error. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{
      minHeight: '100vh', background: 'var(--bg-dark)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '2rem 1.5rem',
      position: 'relative', overflow: 'hidden',
    }}>
      {/* Background glow */}
      <div style={{
        position: 'absolute', top: '30%', left: '50%', transform: 'translateX(-50%)',
        width: 600, height: 600, borderRadius: '50%',
        background: 'radial-gradient(circle, rgba(124,58,237,0.08) 0%, transparent 70%)',
        pointerEvents: 'none',
      }}/>

      <div style={{ width: '100%', maxWidth: 420, position: 'relative' }}>
        <Link href="/" style={{
          display: 'inline-flex', alignItems: 'center', gap: 6,
          color: 'var(--text-secondary)', textDecoration: 'none', fontSize: 14, marginBottom: '2rem',
        }}>
          <ArrowLeft size={16}/> Back to home
        </Link>

        <div className="glass" style={{ borderRadius: 24, padding: '2.5rem' }}>
          {/* Logo */}
          <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
            <div style={{
              width: 56, height: 56, borderRadius: 16, margin: '0 auto 1rem',
              background: 'linear-gradient(135deg, #4f7fff, #7c3aed)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <Zap size={24} color="white"/>
            </div>
            <h1 style={{ fontSize: '1.625rem', fontWeight: 800, marginBottom: 6 }}>Sign in</h1>
            <p style={{ color: 'var(--text-secondary)', fontSize: 14 }}>Access your MobileMatch account</p>
          </div>

          {/* Demo credentials hint */}
          <div style={{ padding: '0.75rem 1rem', borderRadius: 10, background: 'rgba(79,127,255,0.07)', border: '1px solid rgba(79,127,255,0.2)', fontSize: 12, color: 'var(--text-secondary)', marginBottom: '1.5rem', lineHeight: 1.6 }}>
            <strong style={{ color: '#6b93ff' }}>Demo accounts:</strong><br/>
            👤 demo@mobilematch.dz / user123456<br/>
            🛡️ admin@mobilematch.dz / admin123456
          </div>

          <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div>
              <label style={{ fontSize: 13, fontWeight: 600, display: 'block', marginBottom: 6 }}>Email address</label>
              <div style={{ position: 'relative' }}>
                <Mail size={16} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-secondary)' }}/>
                <input
                  type="email" id="login-email" placeholder="your@email.com" value={email}
                  onChange={e => setEmail(e.target.value)} required
                  className="input-field" style={{ paddingLeft: 40 }}
                />
              </div>
            </div>

            <div>
              <label style={{ fontSize: 13, fontWeight: 600, display: 'block', marginBottom: 6 }}>Password</label>
              <div style={{ position: 'relative' }}>
                <Lock size={16} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-secondary)' }}/>
                <input
                  type={showPass ? 'text' : 'password'} id="login-password" placeholder="••••••••" value={password}
                  onChange={e => setPassword(e.target.value)} required
                  className="input-field" style={{ paddingLeft: 40, paddingRight: 40 }}
                />
                <button type="button" onClick={() => setShowPass(!showPass)}
                  style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)', display: 'flex' }}>
                  {showPass ? <EyeOff size={16}/> : <Eye size={16}/>}
                </button>
              </div>
            </div>

            {error && (
              <div style={{ padding: '0.75rem', borderRadius: 8, fontSize: 13, background: 'rgba(248,113,113,0.1)', border: '1px solid rgba(248,113,113,0.25)', color: '#f87171' }}>
                ⚠️ {error}
              </div>
            )}

            <button type="submit" id="login-submit" disabled={loading} className="btn-primary"
              style={{ padding: '0.875rem', fontSize: 15, borderRadius: 12, marginTop: 4, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
              {loading ? <><Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }}/> Signing in...</> : 'Sign in'}
            </button>

            <p style={{ textAlign: 'center', fontSize: 13, color: 'var(--text-secondary)' }}>
              Don't have an account?{' '}
              <Link href="/register" style={{ color: '#6b93ff', textDecoration: 'none', fontWeight: 600 }}>
                Create one for free
              </Link>
            </p>
          </form>
        </div>
      </div>
    </div>
  )
}
