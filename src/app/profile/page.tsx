'use client'

import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { ArrowLeft, User, Wifi, Phone, Save, LogOut, Bell, Target, Loader2, Settings, MessageSquare, Check, Trash2, CheckCircle, DollarSign, ShieldCheck } from 'lucide-react'
import { signOut, useSession } from 'next-auth/react'
import { formatDA } from '@/lib/utils'
import { useLang } from '@/lib/lang-context'

export default function ProfilePage() {
  const { t } = useLang()
  const { data: session, status } = useSession()
  const router = useRouter()
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [budget, setBudget] = useState(2000)
  const [dataGB, setDataGB] = useState(20)
  const [voice, setVoice] = useState(100)
  const [sms, setSms] = useState(50)
  const [type, setType] = useState('any')
  const [network, setNetwork] = useState('any')
  const [profileLoaded, setProfileLoaded] = useState(false)
  const [notifications, setNotifications] = useState<any[]>([])
  const [notifLoading, setNotifLoading] = useState(true)
  const [adminCode, setAdminCode] = useState('')
  const [adminError, setAdminError] = useState('')
  const [adminSuccess, setAdminSuccess] = useState(false)
  const [adminLoading, setAdminLoading] = useState(false)

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
          if (d.profile.voiceMinutes != null) setVoice(d.profile.voiceMinutes)
          if (d.profile.smsCount != null)     setSms(d.profile.smsCount)
          if (d.profile.preferredType)  setType(d.profile.preferredType)
          if (d.profile.preferredNet)   setNetwork(d.profile.preferredNet)
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
      await fetch('/api/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ monthlyBudget: budget, dataUsageGB: dataGB, voiceMinutes: voice, smsCount: sms, preferredType: type, preferredNet: network }),
      })
      setSaved(true)
      setTimeout(() => setSaved(false), 3000)
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

  async function claimAdmin() {
    setAdminLoading(true)
    setAdminError('')
    try {
      const res = await fetch('/api/admin/claim', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: adminCode }),
      })
      const data = await res.json()
      if (!res.ok) { setAdminError(data.error); return }
      setAdminSuccess(true)
      setTimeout(() => signOut({ callbackUrl: '/login?promoted=1' }), 1500)
    } finally {
      setAdminLoading(false)
    }
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

              {/* Voice */}
              <div>
                <label style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, fontWeight: 600, marginBottom: 8, color: 'var(--text-primary)' }}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}><Phone size={13} /> {t('profile.callMinutes')}</span>
                  <span style={{ color: 'var(--accent)' }}>{voice >= 500 ? t('common.unlimited') : `${voice} ${t('common.min')}`}</span>
                </label>
                <input type="range" min={0} max={500} step={10} value={voice} onChange={e => setVoice(+e.target.value)} style={rf(voice, 0, 500)} />
              </div>

              {/* SMS */}
              <div>
                <label style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, fontWeight: 600, marginBottom: 8, color: 'var(--text-primary)' }}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}><MessageSquare size={13} /> {t('profile.smsMonth')}</span>
                  <span style={{ color: 'var(--accent)' }}>{sms >= 500 ? t('common.unlimited') : `${sms}`}</span>
                </label>
                <input type="range" min={0} max={500} step={10} value={sms} onChange={e => setSms(+e.target.value)} style={rf(sms, 0, 500)} />
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
                        {new Date(n.createdAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
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

          {/* Admin Access */}
          {(session?.user as any)?.role !== 'ADMIN' && (
            <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-base)', borderRadius: 12, padding: '1.5rem', marginTop: '1.5rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
                <ShieldCheck size={18} color="var(--accent)" />
                <h2 style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>Admin Access</h2>
              </div>
              <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 16 }}>
                Enter the admin access code to elevate your account to administrator level. You will be signed out and need to sign back in.
              </p>
              {adminSuccess ? (
                <div style={{ color: '#16a34a', fontSize: 14, fontWeight: 600 }}>✓ Access granted — signing you out…</div>
              ) : (
                <div style={{ display: 'flex', gap: 8 }}>
                  <input
                    type="password"
                    placeholder="Enter admin access code"
                    value={adminCode}
                    onChange={(e) => { setAdminCode(e.target.value); setAdminError('') }}
                    style={{ flex: 1, padding: '10px 14px', borderRadius: 8, border: '1px solid var(--border-base)', background: 'var(--bg-input)', color: 'var(--text-primary)', fontSize: 14, outline: 'none' }}
                  />
                  <button
                    onClick={claimAdmin}
                    disabled={adminLoading || !adminCode}
                    style={{ padding: '10px 20px', borderRadius: 8, background: 'var(--accent)', color: '#fff', border: 'none', cursor: adminLoading || !adminCode ? 'not-allowed' : 'pointer', fontWeight: 600, fontSize: 14, opacity: !adminCode ? 0.6 : 1 }}
                  >
                    {adminLoading ? '…' : 'Claim'}
                  </button>
                </div>
              )}
              {adminError && <p style={{ color: '#ef4444', fontSize: 13, marginTop: 8 }}>{adminError}</p>}
            </div>
          )}

      </div>
    </motion.div>
  )
}
