'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { ArrowLeft, User, Wifi, Phone, MessageSquare, Save, LogOut, Bell, BookmarkCheck, Loader2 } from 'lucide-react'
import { signOut, useSession } from 'next-auth/react'
import { formatDA } from '@/lib/utils'

export default function ProfilePage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [budget, setBudget] = useState(2000)
  const [dataGB, setDataGB] = useState(20)
  const [voice, setVoice] = useState(100)
  const [sms, setSms] = useState(50)
  const [type, setType] = useState('any')
  const [notifications, setNotifications] = useState<any[]>([])

  useEffect(() => {
    if (status === 'unauthenticated') router.push('/login')
  }, [status, router])

  useEffect(() => {
    if (status === 'authenticated') {
      fetch('/api/notifications').then(r => r.json()).then(d => setNotifications(d.notifications || []))
    }
  }, [status])

  async function saveProfile() {
    setSaving(true)
    try {
      await fetch('/api/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ monthlyBudget: budget, dataUsageGB: dataGB, voiceMinutes: voice, smsCount: sms, preferredType: type }),
      })
      setSaved(true)
      setTimeout(() => setSaved(false), 3000)
    } finally {
      setSaving(false)
    }
  }

  if (status === 'loading') {
    return (
      <div style={{ minHeight: '100vh', background: 'var(--bg-dark)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Loader2 size={32} style={{ animation: 'spin 1s linear infinite', color: '#4f7fff' }} />
      </div>
    )
  }

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-dark)', padding: '2rem 1.5rem' }}>
      <div style={{ maxWidth: 760, margin: '0 auto' }}>
        <Link href="/" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, color: 'var(--text-secondary)', textDecoration: 'none', fontSize: 14, marginBottom: '2rem' }}>
          <ArrowLeft size={16} /> Accueil
        </Link>

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '2rem', flexWrap: 'wrap', gap: '1rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <div style={{ width: 52, height: 52, borderRadius: '50%', background: 'linear-gradient(135deg, #4f7fff, #7c3aed)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22, fontWeight: 800, color: 'white' }}>
              {session?.user?.name?.[0]?.toUpperCase() || 'U'}
            </div>
            <div>
              <h1 style={{ fontSize: '1.375rem', fontWeight: 800 }}>{session?.user?.name || 'Utilisateur'}</h1>
              <p style={{ color: 'var(--text-secondary)', fontSize: 13 }}>{session?.user?.email}</p>
            </div>
          </div>
          <button
            onClick={() => signOut({ callbackUrl: '/' })}
            style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '0.5rem 1rem', borderRadius: 8, background: 'rgba(248,113,113,0.1)', border: '1px solid rgba(248,113,113,0.25)', color: '#f87171', cursor: 'pointer', fontSize: 13, fontWeight: 600 }}
          >
            <LogOut size={14} /> Déconnexion
          </button>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1.5rem' }}>
          {/* Profile settings */}
          <div className="glass" style={{ borderRadius: 16, padding: '1.5rem' }}>
            <h2 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: 8 }}>
              <User size={16} style={{ color: '#6b93ff' }} /> Mon profil de consommation
            </h2>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              {/* Budget */}
              <div>
                <label style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, fontWeight: 600, marginBottom: 8 }}>
                  <span>💰 Budget mensuel</span>
                  <span style={{ color: '#6b93ff' }}>{formatDA(budget)}</span>
                </label>
                <input type="range" min={100} max={8000} step={100} value={budget} onChange={e => setBudget(+e.target.value)} style={{ width: '100%', accentColor: '#4f7fff' }} />
              </div>

              {/* Data */}
              <div>
                <label style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, fontWeight: 600, marginBottom: 8 }}>
                  <span><Wifi size={13} style={{ display: 'inline', marginRight: 4 }} />Data / mois</span>
                  <span style={{ color: '#6b93ff' }}>{dataGB} GB</span>
                </label>
                <input type="range" min={0} max={200} step={1} value={dataGB} onChange={e => setDataGB(+e.target.value)} style={{ width: '100%', accentColor: '#4f7fff' }} />
              </div>

              {/* Voice */}
              <div>
                <label style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, fontWeight: 600, marginBottom: 8 }}>
                  <span><Phone size={13} style={{ display: 'inline', marginRight: 4 }} />Minutes d'appels</span>
                  <span style={{ color: '#6b93ff' }}>{voice >= 500 ? 'Illimité' : `${voice} min`}</span>
                </label>
                <input type="range" min={0} max={500} step={10} value={voice} onChange={e => setVoice(+e.target.value)} style={{ width: '100%', accentColor: '#4f7fff' }} />
              </div>

              {/* Type */}
              <div>
                <label style={{ fontSize: 13, fontWeight: 600, display: 'block', marginBottom: 8 }}>Type d'offre préféré</label>
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                  {[{ id: 'any', label: 'Tous' }, { id: 'PREPAID', label: 'Prépayé' }, { id: 'POSTPAID', label: 'Postpayé' }, { id: 'DATA_ONLY', label: 'Internet' }].map(t => (
                    <button key={t.id} onClick={() => setType(t.id)} className={`filter-pill ${type === t.id ? 'active' : ''}`} style={{ fontSize: 12 }}>{t.label}</button>
                  ))}
                </div>
              </div>

              <button onClick={saveProfile} disabled={saving} className="btn-primary" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, padding: '0.75rem', borderRadius: 10 }}>
                {saving ? <Loader2 size={15} style={{ animation: 'spin 1s linear infinite' }} /> : <Save size={15} />}
                {saved ? '✅ Enregistré!' : 'Enregistrer'}
              </button>
            </div>
          </div>

          {/* Notifications */}
          <div className="glass" style={{ borderRadius: 16, padding: '1.5rem' }}>
            <h2 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '1.25rem', display: 'flex', alignItems: 'center', gap: 8 }}>
              <Bell size={16} style={{ color: '#6b93ff' }} /> Notifications récentes
            </h2>
            {notifications.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-secondary)', fontSize: 14 }}>
                <Bell size={32} style={{ opacity: 0.3, marginBottom: '0.75rem' }} />
                <p>Aucune notification pour le moment</p>
                <p style={{ fontSize: 12, marginTop: 4 }}>Vous serez notifié des nouvelles offres</p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {notifications.slice(0, 8).map((n: any) => (
                  <div key={n.id} style={{ padding: '0.75rem', borderRadius: 10, background: n.isRead ? 'rgba(255,255,255,0.03)' : 'rgba(79,127,255,0.08)', border: `1px solid ${n.isRead ? 'var(--border)' : 'rgba(79,127,255,0.2)'}` }}>
                    <div style={{ fontSize: 13, fontWeight: 600 }}>{n.title}</div>
                    <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 2 }}>{n.message}</div>
                    <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginTop: 4, opacity: 0.6 }}>
                      {new Date(n.createdAt).toLocaleDateString('fr-DZ')}
                    </div>
                  </div>
                ))}
              </div>
            )}

            <Link href="/recommend" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, marginTop: '1.5rem', padding: '0.75rem', borderRadius: 10, background: 'linear-gradient(135deg, #4f7fff, #7c3aed)', color: 'white', textDecoration: 'none', fontSize: 13, fontWeight: 600 }}>
              <BookmarkCheck size={14} /> Voir mes recommandations
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
