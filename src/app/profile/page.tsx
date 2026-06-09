'use client'

import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { ArrowLeft, User, Wifi, Phone, Save, LogOut, Bell, Target, Loader2, Settings, MessageSquare, Check, Trash2, CheckCircle, DollarSign } from 'lucide-react'
import { signOut, useSession } from 'next-auth/react'
import { formatDA } from '@/lib/utils'
import { useLang } from '@/lib/lang-context'
import { useToast } from '@/components/toast'

export default function ProfilePage() {
  const { t, lang } = useLang()
  const { data: session, status } = useSession()
  const router = useRouter()
  const { error: toastError } = useToast()
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [budget, setBudget] = useState(2000)
  const [dataGB, setDataGB] = useState(20)
  // Calls / SMS are binary in the catalogue (unlimited or none): 0 = "Any", -1 = "Unlimited"
  const [voice, setVoice] = useState(0)
  const [sms, setSms] = useState(0)
  const [type, setType] = useState('any')
  const [network, setNetwork] = useState('any')
  const [operator, setOperator] = useState('any')
  const [profileLoaded, setProfileLoaded] = useState(false)
  const [notifications, setNotifications] = useState<any[]>([])
  const [notifLoading, setNotifLoading] = useState(true)

  useEffect(() => {
    if (status === 'unauthenticated') router.push('/login')
  }, [status, router])

  useEffect(() => {
    if (status !== 'authenticated') return
    fetch('/api/profile')
      .then(r => r.json())
      .then(d => {
        if (d.profile) {
          if (d.profile.monthlyBudget)  setBudget(d.profile.monthlyBudget)
          if (d.profile.dataUsageGB)    setDataGB(d.profile.dataUsageGB)
          setVoice(d.profile.voiceMinutes === -1 ? -1 : 0)
          setSms(d.profile.smsCount === -1 ? -1 : 0)
          if (d.profile.preferredType)     setType(d.profile.preferredType)
          if (d.profile.preferredNet)      setNetwork(d.profile.preferredNet)
          if (d.profile.preferredOperator) setOperator(d.profile.preferredOperator)
        }
        setProfileLoaded(true)
      })
      .catch(() => setProfileLoaded(true))

    fetch('/api/notifications')
      .then(r => r.json())
      .then(d => setNotifications(d.notifications || []))
      .catch(() => {})
      .finally(() => setNotifLoading(false))
  }, [status])

  async function saveProfile() {
    setSaving(true)
    try {
      const res = await fetch('/api/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ monthlyBudget: budget, dataUsageGB: dataGB, voiceMinutes: voice, smsCount: sms, preferredType: type, preferredNet: network, preferredOperator: operator }),
      })
      if (!res.ok) throw new Error('save failed')
      setSaved(true)
      setTimeout(() => setSaved(false), 3000)
    } catch {
      toastError(t('error.saveFailed'))
    } finally {
      setSaving(false)
    }
  }

  async function markAllRead() {
    try {
      await fetch('/api/notifications', { method: 'PATCH' })
      setNotifications(prev => prev.map(n => ({ ...n, isRead: true })))
    } catch {}
  }

  async function deleteNotif(id: string) {
    try {
      await fetch('/api/notifications', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id }),
      })
      setNotifications(prev => prev.filter(n => n.id !== id))
    } catch {}
  }

  if (status === 'loading' || !profileLoaded) {
    return (
      <div style={{ minHeight: '100vh', background: 'var(--bg-page)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Loader2 size={32} style={{ animation: 'spin 1s linear infinite', color: 'var(--accent)' }} />
      </div>
    )
  }

  const rf = (v: number, mn: number, mx: number) =>
    ({ width: '100%', '--fill': `${((v - mn) / (mx - mn) * 100).toFixed(1)}%` } as React.CSSProperties)

  const unreadCount = notifications.filter(n => !n.isRead).length

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: 'easeOut' }}
      style={{ minHeight: '100vh', background: 'var(--bg-page)', padding: '2rem 1.5rem' }}
    >
      <div style={{ maxWidth: 820, margin: '0 auto' }}>
        <Link href="/offers" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, color: 'var(--text-secondary)', textDecoration: 'none', fontSize: 14, marginBottom: '2rem' }}>
          <ArrowLeft size={16} /> {t('common.back')}
        </Link>

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '2rem', flexWrap: 'wrap', gap: '1rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <div style={{
              width: 54, height: 54, borderRadius: '50%',
              background: 'var(--accent-muted)', border: '1px solid var(--accent-border)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 22, fontWeight: 900, color: 'var(--accent)',
            }}>
              {session?.user?.name?.[0]?.toUpperCase() || 'U'}
            </div>
            <div>
              <h1 style={{ fontSize: '1.375rem', fontWeight: 800, color: 'var(--text-primary)' }}>{session?.user?.name || 'User'}</h1>
              <p style={{ color: 'var(--text-secondary)', fontSize: 13 }}>{session?.user?.email}</p>
            </div>
          </div>
          <button
            onClick={() => signOut({ callbackUrl: '/' })}
            style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '0.5rem 1rem', borderRadius: 8, background: 'var(--color-error-muted)', border: '1px solid var(--color-error-border)', color: 'var(--color-error)', cursor: 'pointer', fontSize: 13, fontWeight: 600, fontFamily: 'inherit' }}
          >
            <LogOut size={14} /> {t('nav.signOut')}
          </button>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(330px, 1fr))', gap: '1.5rem' }}>
          {/* Usage profile */}
          <div className="card" style={{ padding: '1.5rem' }}>
            <h2 style={{ fontSize: '1rem', fontWeight: 800, marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: 8, color: 'var(--text-primary)' }}>
              <Settings size={16} style={{ color: 'var(--accent)' }} /> {t('profile.usageProfile')}
            </h2>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              {/* Budget */}
              <div>
                <label style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, fontWeight: 600, marginBottom: 8, color: 'var(--text-primary)' }}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}><DollarSign size={13} /> {t('profile.monthlyBudget')}</span>
                  <span style={{ color: 'var(--accent)' }}>{formatDA(budget)}</span>
                </label>
                <input type="range" min={100} max={8000} step={100} value={budget} onChange={e => setBudget(+e.target.value)} style={rf(budget, 100, 8000)} />
              </div>

              {/* Data */}
              <div>
                <label style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, fontWeight: 600, marginBottom: 8, color: 'var(--text-primary)' }}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}><Wifi size={13} /> {t('profile.dataMonth')}</span>
                  <span style={{ color: 'var(--accent)' }}>{dataGB} GB</span>
                </label>
                <input type="range" min={0} max={200} step={1} value={dataGB} onChange={e => setDataGB(+e.target.value)} style={rf(dataGB, 0, 200)} />
              </div>

              {/* Operator */}
              <div>
                <label style={{ fontSize: 13, fontWeight: 600, display: 'block', marginBottom: 8, color: 'var(--text-primary)' }}>{t('recommend.operator')}</label>
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                  {[{ id: 'any', label: t('type.any') }, { id: 'djezzy', label: 'Djezzy' }, { id: 'ooredoo', label: 'Ooredoo' }, { id: 'mobilis', label: 'Mobilis' }].map(o => (
                    <button key={o.id} onClick={() => setOperator(o.id)} className={`filter-pill ${operator === o.id ? 'active' : ''}`} style={{ fontSize: 12 }}>{o.label}</button>
                  ))}
                </div>
              </div>

              {/* Plan type */}
              <div>
                <label style={{ fontSize: 13, fontWeight: 600, display: 'block', marginBottom: 8, color: 'var(--text-primary)' }}>{t('profile.preferredType')}</label>
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                  {[{ id: 'any', label: t('type.any') }, { id: 'PREPAID', label: t('type.prepaid') }, { id: 'POSTPAID', label: t('type.postpaid') }, { id: 'DATA_ONLY', label: t('type.dataOnly') }].map(opt => (
                    <button key={opt.id} onClick={() => setType(opt.id)} className={`filter-pill ${type === opt.id ? 'active' : ''}`} style={{ fontSize: 12 }}>{opt.label}</button>
                  ))}
                </div>
              </div>

              {/* Network */}
              <div>
                <label style={{ fontSize: 13, fontWeight: 600, display: 'block', marginBottom: 8, color: 'var(--text-primary)' }}>{t('profile.preferredNet')}</label>
                <div style={{ display: 'flex', gap: 6 }}>
                  {[{ id: 'any', label: t('type.any') }, { id: '4G', label: '4G' }, { id: '5G', label: '5G' }].map(n => (
                    <button key={n.id} onClick={() => setNetwork(n.id)} className={`filter-pill ${network === n.id ? 'active' : ''}`} style={{ fontSize: 12 }}>{n.label}</button>
                  ))}
                </div>
              </div>

              {/* Calls — binary: Any / Unlimited */}
              <div>
                <label style={{ fontSize: 13, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8, color: 'var(--text-primary)' }}>
                  <Phone size={13} /> {t('recommend.priority.calls')}
                </label>
                <div style={{ display: 'flex', gap: 6 }}>
                  {[{ v: 0, label: t('common.noPreference') }, { v: -1, label: t('common.unlimited') }].map(o => (
                    <button key={o.v} onClick={() => setVoice(o.v)} className={`filter-pill ${voice === o.v ? 'active' : ''}`} style={{ fontSize: 12 }}>{o.label}</button>
                  ))}
                </div>
              </div>

              {/* SMS — binary: Any / Unlimited */}
              <div>
                <label style={{ fontSize: 13, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8, color: 'var(--text-primary)' }}>
                  <MessageSquare size={13} /> {t('recommend.priority.sms')}
                </label>
                <div style={{ display: 'flex', gap: 6 }}>
                  {[{ v: 0, label: t('common.noPreference') }, { v: -1, label: t('common.unlimited') }].map(o => (
                    <button key={o.v} onClick={() => setSms(o.v)} className={`filter-pill ${sms === o.v ? 'active' : ''}`} style={{ fontSize: 12 }}>{o.label}</button>
                  ))}
                </div>
              </div>

              <button onClick={saveProfile} disabled={saving} className="btn-primary" style={{
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, padding: '0.75rem', borderRadius: 'var(--radius-md)',
                ...(saved ? { background: 'var(--color-success)', borderColor: 'var(--color-success)' } : {}),
              }}>
                {saving
                  ? <Loader2 size={15} style={{ animation: 'spin 1s linear infinite' }} />
                  : saved
                    ? <CheckCircle size={15} />
                    : <Save size={15} />}
                {saved ? t('profile.saved') : t('profile.save')}
              </button>

              <Link href="/recommend" className="btn-secondary" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, padding: '0.75rem', textDecoration: 'none', fontSize: 13 }}>
                <Target size={14} /> {t('profile.getRecommend')}
              </Link>
            </div>
          </div>

          {/* Notifications */}
          <div className="card" style={{ padding: '1.5rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem' }}>
              <h2 style={{ fontSize: '1rem', fontWeight: 800, display: 'flex', alignItems: 'center', gap: 8, color: 'var(--text-primary)' }}>
                <Bell size={16} style={{ color: 'var(--accent)' }} /> {t('profile.notifications')}
                {unreadCount > 0 && (
                  <span style={{ fontSize: 11, fontWeight: 700, padding: '1px 7px', borderRadius: 'var(--radius-full)', background: 'var(--accent-muted)', color: 'var(--accent)' }}>
                    {unreadCount}
                  </span>
                )}
              </h2>
              {unreadCount > 0 && (
                <button onClick={markAllRead} style={{ background: 'none', border: 'none', color: 'var(--accent)', fontSize: 11, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4, fontFamily: 'inherit' }}>
                  <Check size={11} /> {t('profile.markAllRead')}
                </button>
              )}
            </div>

            {notifLoading ? (
              <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-secondary)' }}>
                <Loader2 size={24} style={{ animation: 'spin 1s linear infinite', display: 'block', margin: '0 auto 0.75rem', color: 'var(--accent)' }} />
                {t('profile.loading')}
              </div>
            ) : notifications.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-secondary)', fontSize: 14 }}>
                <Bell size={32} style={{ color: 'var(--text-muted)', marginBottom: '0.75rem', display: 'block', margin: '0 auto 0.75rem' }} />
                <p>{t('profile.noNotif')}</p>
                <p style={{ fontSize: 12, marginTop: 4, color: 'var(--text-muted)' }}>{t('profile.noNotifDesc')}</p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {notifications.slice(0, 10).map((n: any) => (
                  <div key={n.id} style={{
                    padding: '0.75rem', borderRadius: 'var(--radius-md)',
                    background: n.isRead ? 'var(--bg-subtle)' : 'var(--accent-muted)',
                    border: `1px solid ${n.isRead ? 'var(--border-subtle)' : 'var(--accent-border)'}`,
                    display: 'flex', gap: 8, alignItems: 'flex-start',
                  }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 13, fontWeight: n.isRead ? 500 : 700, color: 'var(--text-primary)' }}>{n.title}</div>
                      <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 2 }}>{n.message}</div>
                      <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>
                        {new Date(n.createdAt).toLocaleDateString(lang === 'ar' ? 'ar-DZ' : lang === 'fr' ? 'fr-DZ' : 'en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                      </div>
                    </div>
                    <button onClick={() => deleteNotif(n.id)} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: 4, borderRadius: 4, display: 'flex', flexShrink: 0 }}>
                      <Trash2 size={12} />
                    </button>
                  </div>
                ))}
              </div>
            )}

          </div>
        </div>

      </div>
    </motion.div>
  )
}
