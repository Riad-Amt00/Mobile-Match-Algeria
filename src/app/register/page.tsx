'use client'

import { useState } from 'react'
import Link from 'next/link'
import { ArrowLeft, Mail, Lock, User, Eye, EyeOff, Loader2 } from 'lucide-react'
import { useRouter } from 'next/navigation'

export default function RegisterPage() {
  const router = useRouter()
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPass, setShowPass] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)

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
      if (!res.ok) { setError(data.error || 'Erreur lors de l\'inscription'); return }
      setSuccess(true)
      setTimeout(() => router.push('/login'), 2000)
    } catch {
      setError('Erreur réseau. Réessayez.')
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
      {/* Background orb */}
      <div style={{
        position: 'absolute', top: '20%', left: '50%', transform: 'translateX(-50%)',
        width: 600, height: 600, borderRadius: '50%',
        background: 'radial-gradient(circle, rgba(79,127,255,0.06) 0%, transparent 70%)',
        pointerEvents: 'none',
      }}/>

      <div style={{ width: '100%', maxWidth: 420, position: 'relative' }}>
        <Link href="/" style={{
          display: 'inline-flex', alignItems: 'center', gap: 6,
          color: 'var(--text-secondary)', textDecoration: 'none', fontSize: 14, marginBottom: '2rem',
        }}>
          <ArrowLeft size={16}/> Accueil
        </Link>

        <div className="glass" style={{ borderRadius: 20, padding: '2.5rem' }}>
          {/* Logo */}
          <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
            <div style={{
              width: 52, height: 52, borderRadius: 14, margin: '0 auto 1rem',
              background: 'linear-gradient(135deg, #4f7fff, #7c3aed)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 24, fontWeight: 800, color: 'white',
            }}>M</div>
            <h1 style={{ fontSize: '1.5rem', fontWeight: 800, marginBottom: 4 }}>Créer un compte</h1>
            <p style={{ color: 'var(--text-secondary)', fontSize: 14 }}>Rejoignez Mobile Match Algeria</p>
          </div>

          {success ? (
            <div style={{
              textAlign: 'center', padding: '1.5rem',
              background: 'rgba(74,222,128,0.1)', border: '1px solid rgba(74,222,128,0.25)',
              borderRadius: 12, color: '#4ade80',
            }}>
              ✅ Compte créé avec succès! Redirection vers la connexion...
            </div>
          ) : (
            <form onSubmit={handleRegister} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {/* Name */}
              <div>
                <label style={{ fontSize: 13, fontWeight: 600, display: 'block', marginBottom: 6 }}>Nom complet</label>
                <div style={{ position: 'relative' }}>
                  <User size={16} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-secondary)' }}/>
                  <input type="text" placeholder="Ahmed Bensalem" value={name}
                    onChange={e => setName(e.target.value)} required
                    className="input-field" style={{ paddingLeft: 40 }}
                  />
                </div>
              </div>

              {/* Email */}
              <div>
                <label style={{ fontSize: 13, fontWeight: 600, display: 'block', marginBottom: 6 }}>Adresse email</label>
                <div style={{ position: 'relative' }}>
                  <Mail size={16} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-secondary)' }}/>
                  <input type="email" placeholder="ahmed@email.com" value={email}
                    onChange={e => setEmail(e.target.value)} required
                    className="input-field" style={{ paddingLeft: 40 }}
                  />
                </div>
              </div>

              {/* Password */}
              <div>
                <label style={{ fontSize: 13, fontWeight: 600, display: 'block', marginBottom: 6 }}>Mot de passe</label>
                <div style={{ position: 'relative' }}>
                  <Lock size={16} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-secondary)' }}/>
                  <input type={showPass ? 'text' : 'password'} placeholder="8+ caractères" value={password}
                    onChange={e => setPassword(e.target.value)} required minLength={8}
                    className="input-field" style={{ paddingLeft: 40, paddingRight: 40 }}
                  />
                  <button type="button" onClick={() => setShowPass(!showPass)}
                    style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)' }}>
                    {showPass ? <EyeOff size={16}/> : <Eye size={16}/>}
                  </button>
                </div>
              </div>

              {error && (
                <div style={{
                  padding: '0.75rem', borderRadius: 8, fontSize: 13,
                  background: 'rgba(248,113,113,0.1)', border: '1px solid rgba(248,113,113,0.25)',
                  color: '#f87171',
                }}>
                  ⚠️ {error}
                </div>
              )}

              <button type="submit" disabled={loading} className="btn-primary"
                style={{ padding: '0.875rem', fontSize: 15, borderRadius: 10, marginTop: 4, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                {loading ? <><Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }}/> Création...</> : 'Créer mon compte'}
              </button>

              <p style={{ textAlign: 'center', fontSize: 13, color: 'var(--text-secondary)' }}>
                Déjà un compte?{' '}
                <Link href="/login" style={{ color: '#6b93ff', textDecoration: 'none', fontWeight: 600 }}>
                  Se connecter
                </Link>
              </p>
            </form>
          )}
        </div>
      </div>
    </div>
  )
}
