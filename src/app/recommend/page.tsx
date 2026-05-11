'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import Link from 'next/link'
import { useSession } from 'next-auth/react'
import { motion } from 'framer-motion'
import {
  Zap, Wifi, Phone, TrendingUp, CheckCircle, AlertCircle, ArrowLeft,
  Target, BarChart2, MessageSquare, Lock, Save, Loader2, Signal,
} from 'lucide-react'

import { formatDA, formatData, formatMinutes, RANK_GRADIENTS, RANK_COLORS, cleanOfferName } from '@/lib/utils'
import { useLang } from '@/lib/lang-context'

interface ReasonToken { key: string; params?: Record<string, string | number> }
interface Recommendation {
  offer: any
  score: number
  savings: number
  matchReasons: ReasonToken[]
  mismatches: ReasonToken[]
}

const RANK_LABELS = ['🥇', '🥈', '🥉']
const RANK_BORDER = ['#F59E0B', '#94A3B8', '#CD7C3E']

function matchLabel(score: number, t: (k: any) => string) {
  if (score >= 80) return t('recommend.matchExcellent')
  if (score >= 60) return t('recommend.matchGood')
  if (score >= 40) return t('recommend.matchFair')
  return t('recommend.matchWeak')
}

function scoreColor(score: number) {
  if (score >= 80) return 'var(--color-success)'
  if (score >= 60) return 'var(--accent)'
  if (score >= 40) return '#F59E0B'
  return 'var(--text-muted)'
}

export default function RecommendPage() {
  const { t, tInterp } = useLang()
  const { data: session, status } = useSession()

  const [budget, setBudget] = useState(2000)
  const [dataGB, setDataGB] = useState(20)
  const [voiceMinutes, setVoiceMinutes] = useState(100)
  const [smsCount, setSmsCount] = useState(50)
  const [type, setType] = useState('any')
  const [network, setNetwork] = useState('any')

  const [results, setResults] = useState<Recommendation[]>([])
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [saveOk, setSaveOk] = useState(false)
  const [initialLoaded, setInitialLoaded] = useState(false)
  const [priority, setPriority] = useState<'data' | 'price' | 'calls' | 'network' | ''>('')
  const [budgetStrict, setBudgetStrict] = useState(false)

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const rf = (v: number, mn: number, mx: number) =>
    ({ width: '100%', '--fill': `${((v - mn) / (mx - mn) * 100).toFixed(1)}%` } as React.CSSProperties)

  const typeOptions = [
    { id: 'any', label: t('type.any') },
    { id: 'PREPAID', label: t('type.prepaid') },
    { id: 'POSTPAID', label: t('type.postpaid') },
    { id: 'DATA_ONLY', label: t('type.dataOnly') },
  ]

  const fetchRecommendations = useCallback(async (
    b: number, d: number, v: number, s: number, ty: string, net: string, prio = '', strict = false
  ) => {
    setLoading(true)
    try {
      const res = await fetch('/api/recommendations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ budget: b, dataGB: d, voiceMinutes: v >= 500 ? -1 : v, smsCount: s >= 500 ? -1 : s, type: ty, network: net, priority: prio, budgetStrict: strict }),
      })
      const data = await res.json()
      setResults(data.recommendations || [])
    } catch {
      setResults([])
    } finally {
      setLoading(false)
    }
  }, [])

  // Load profile on mount, then auto-fetch results
  useEffect(() => {
    if (status !== 'authenticated') return
    fetch('/api/profile')
      .then(r => r.json())
      .then(d => {
        const p = d.profile
        const b = p?.monthlyBudget ?? 2000
        const dg = p?.dataUsageGB ?? 20
        const v = p?.voiceMinutes ?? 100
        const s = p?.smsCount ?? 50
        const ty = p?.preferredType ?? 'any'
        const net = p?.preferredNet ?? 'any'
        setBudget(b); setDataGB(dg); setVoiceMinutes(v)
        setSmsCount(s); setType(ty); setNetwork(net)
        setInitialLoaded(true)
        fetchRecommendations(b, dg, v, s, ty, net, '', false)
      })
      .catch(() => { setInitialLoaded(true); fetchRecommendations(2000, 20, 100, 50, 'any', 'any', '', false) })
  }, [status, fetchRecommendations])

  // Auto-update when sliders change (debounced 700ms) — also saves profile silently
  function onSliderChange(
    b: number, d: number, v: number, s: number, ty: string, net: string, prio = '', strict = false
  ) {
    if (!initialLoaded) return
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => {
      fetchRecommendations(b, d, v, s, ty, net, prio, strict)
      fetch('/api/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ monthlyBudget: b, dataUsageGB: d, voiceMinutes: v, smsCount: s, preferredType: ty, preferredNet: net }),
      }).catch(() => {})
    }, 700)
  }

  async function saveProfile() {
    setSaving(true)
    try {
      await fetch('/api/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ monthlyBudget: budget, dataUsageGB: dataGB, voiceMinutes, smsCount, preferredType: type, preferredNet: network }),
      })
      await fetchRecommendations(budget, dataGB, voiceMinutes, smsCount, type, network, priority, budgetStrict)
      setSaveOk(true)
      setTimeout(() => setSaveOk(false), 2500)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-page)', padding: '2rem 1.5rem 4rem' }}>
      <div style={{ maxWidth: 860, margin: '0 auto' }}>

        <Link href="/offers" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, color: 'var(--text-secondary)', textDecoration: 'none', fontSize: 14, marginBottom: '2rem' }}>
          <ArrowLeft size={16} /> {t('recommend.back')}
        </Link>

        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <div style={{ width: 56, height: 56, borderRadius: 16, margin: '0 auto 1rem', background: 'var(--accent-muted)', border: '1px solid var(--accent-border)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Target size={26} color="var(--accent)" />
          </div>
          <h1 className="section-title" style={{ marginBottom: 4 }}>{t('recommend.title')}</h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: 14 }}>{t('recommend.rankedBy')}</p>
        </div>

        {/* Auth gate */}
        {status === 'loading' && (
          <div style={{ textAlign: 'center', padding: '4rem 1rem' }}>
            <div style={{ width: 36, height: 36, border: '3px solid var(--accent-muted)', borderTopColor: 'var(--accent)', borderRadius: '50%', animation: 'spin 0.8s linear infinite', margin: '0 auto' }} />
          </div>
        )}

        {status === 'unauthenticated' && (
          <div className="card" style={{ padding: '3rem 2rem', textAlign: 'center' }}>
            <Lock size={40} style={{ color: 'var(--text-muted)', margin: '0 auto 1rem', display: 'block' }} />
            <h2 style={{ fontSize: '1.375rem', fontWeight: 800, marginBottom: 10, color: 'var(--text-primary)' }}>{t('recommend.signInTitle')}</h2>
            <p style={{ color: 'var(--text-secondary)', fontSize: 14, lineHeight: 1.7, maxWidth: 420, margin: '0 auto 2rem' }}>{t('recommend.signInDesc')}</p>
            <div style={{ display: 'flex', gap: 10, justifyContent: 'center', flexWrap: 'wrap' }}>
              <Link href="/login" className="btn-primary" style={{ padding: '0.75rem 1.5rem', textDecoration: 'none', borderRadius: 10 }}>{t('recommend.signIn')}</Link>
              <Link href="/register" className="btn-secondary" style={{ padding: '0.75rem 1.5rem', textDecoration: 'none', borderRadius: 10 }}>{t('recommend.createAccount')}</Link>
            </div>
          </div>
        )}

        {status === 'authenticated' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>

            {/* ── Profile sliders ── */}
            <div className="card" style={{ padding: '1.75rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem', flexWrap: 'wrap', gap: 10 }}>
                <h2 style={{ fontSize: '1rem', fontWeight: 800, display: 'flex', alignItems: 'center', gap: 8, color: 'var(--text-primary)', margin: 0 }}>
                  <Zap size={16} style={{ color: 'var(--accent)' }} /> {t('recommend.usageProfile')}
                </h2>
                <button
                  onClick={saveProfile}
                  disabled={saving}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 6,
                    padding: '0.5rem 1.125rem', borderRadius: 8, cursor: saving ? 'wait' : 'pointer',
                    background: saveOk ? 'var(--color-success-muted)' : 'var(--accent)',
                    border: saveOk ? '1px solid var(--color-success-border)' : 'none',
                    color: saveOk ? 'var(--color-success)' : 'white',
                    fontSize: 13, fontWeight: 700, fontFamily: 'inherit',
                    transition: 'all 0.2s',
                  }}
                >
                  {saving
                    ? <Loader2 size={13} style={{ animation: 'spin 1s linear infinite' }} />
                    : saveOk
                      ? <CheckCircle size={13} />
                      : <Save size={13} />}
                  {saving ? '…' : saveOk ? t('profile.saved') : t('profile.save')}
                </button>
              </div>

              {/* Priority elicitation */}
              <div style={{ marginBottom: '1rem', padding: '0.875rem 1rem', background: 'var(--bg-subtle)', borderRadius: 10, border: '1px solid var(--border-subtle)' }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 8 }}>
                  {t('recommend.topPriority')}
                </div>
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 8 }}>
                  {([
                    { id: 'data',    label: t('recommend.priority.data'),    icon: <Wifi size={11} /> },
                    { id: 'price',   label: t('recommend.priority.price'),   icon: <TrendingUp size={11} /> },
                    { id: 'calls',   label: t('recommend.priority.calls'),   icon: <Phone size={11} /> },
                    { id: 'network', label: t('recommend.priority.network'), icon: <Signal size={11} /> },
                  ] as const).map(opt => (
                    <button key={opt.id}
                      type="button"
                      onClick={() => {
                        const next = (priority === opt.id ? '' : opt.id) as typeof priority
                        setPriority(next)
                        onSliderChange(budget, dataGB, voiceMinutes, smsCount, type, network, next, budgetStrict)
                      }}
                      style={{
                        display: 'flex', alignItems: 'center', gap: 4,
                        padding: '4px 12px', borderRadius: 20, cursor: 'pointer',
                        fontSize: 12, fontWeight: 600, fontFamily: 'inherit',
                        background: priority === opt.id ? 'var(--accent)' : 'var(--bg-elevated)',
                        color: priority === opt.id ? '#fff' : 'var(--text-secondary)',
                        border: priority === opt.id ? 'none' : '1px solid var(--border-base)',
                        transition: 'all 0.15s',
                      }}>
                      {opt.icon} {opt.label}
                    </button>
                  ))}
                </div>
                <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap' }}>
                  <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    {t('recommend.budgetMode')}:
                  </span>
                  {([
                    { val: false, label: t('recommend.budget.flexible') },
                    { val: true,  label: t('recommend.budget.strict') },
                  ] as const).map(opt => (
                    <button key={String(opt.val)}
                      type="button"
                      onClick={() => {
                        setBudgetStrict(opt.val)
                        onSliderChange(budget, dataGB, voiceMinutes, smsCount, type, network, priority, opt.val)
                      }}
                      style={{
                        padding: '3px 10px', borderRadius: 20, cursor: 'pointer',
                        fontSize: 11, fontWeight: 600, fontFamily: 'inherit',
                        background: budgetStrict === opt.val ? 'var(--accent-muted)' : 'var(--bg-elevated)',
                        color: budgetStrict === opt.val ? 'var(--accent)' : 'var(--text-secondary)',
                        border: budgetStrict === opt.val ? '1px solid var(--accent-border)' : '1px solid var(--border-base)',
                        transition: 'all 0.15s',
                      }}>
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.25rem' }}>
                {/* Budget */}
                <div>
                  <label style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, fontWeight: 600, marginBottom: 8, color: 'var(--text-primary)' }}>
                    <span>{t('recommend.monthlyBudget')}</span>
                    <span style={{ color: 'var(--accent)' }}>{formatDA(budget)}</span>
                  </label>
                  <input type="range" min={100} max={8000} step={100} value={budget}
                    onChange={e => { const v = +e.target.value; setBudget(v); onSliderChange(v, dataGB, voiceMinutes, smsCount, type, network, priority, budgetStrict) }}
                    style={rf(budget, 100, 8000)} />
                </div>

                {/* Data */}
                <div>
                  <label style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, fontWeight: 600, marginBottom: 8, color: 'var(--text-primary)' }}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}><Wifi size={13} /> {t('recommend.monthlyData')}</span>
                    <span style={{ color: 'var(--accent)' }}>{dataGB} GB</span>
                  </label>
                  <input type="range" min={0} max={200} step={1} value={dataGB}
                    onChange={e => { const v = +e.target.value; setDataGB(v); onSliderChange(budget, v, voiceMinutes, smsCount, type, network, priority, budgetStrict) }}
                    style={rf(dataGB, 0, 200)} />
                </div>

                {/* Voice */}
                <div>
                  <label style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, fontWeight: 600, marginBottom: 8, color: 'var(--text-primary)' }}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}><Phone size={13} /> {t('recommend.callMinutes')}</span>
                    <span style={{ color: 'var(--accent)' }}>{voiceMinutes >= 500 ? t('common.unlimited') : `${voiceMinutes} ${t('common.min')}`}</span>
                  </label>
                  <input type="range" min={0} max={500} step={10} value={voiceMinutes}
                    onChange={e => { const v = +e.target.value; setVoiceMinutes(v); onSliderChange(budget, dataGB, v, smsCount, type, network, priority, budgetStrict) }}
                    style={rf(voiceMinutes, 0, 500)} />
                </div>

                {/* SMS */}
                <div>
                  <label style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, fontWeight: 600, marginBottom: 8, color: 'var(--text-primary)' }}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}><MessageSquare size={13} /> {t('recommend.smsMonth')}</span>
                    <span style={{ color: 'var(--accent)' }}>{smsCount >= 500 ? t('common.unlimited') : `${smsCount}`}</span>
                  </label>
                  <input type="range" min={0} max={500} step={10} value={smsCount}
                    onChange={e => { const v = +e.target.value; setSmsCount(v); onSliderChange(budget, dataGB, voiceMinutes, v, type, network, priority, budgetStrict) }}
                    style={rf(smsCount, 0, 500)} />
                </div>
              </div>

              {/* Type + Network */}
              <div style={{ display: 'flex', gap: '1.5rem', marginTop: '1.25rem', flexWrap: 'wrap' }}>
                <div>
                  <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{t('recommend.preferredType')}</div>
                  <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                    {typeOptions.map(opt => (
                      <button key={opt.id} onClick={() => { setType(opt.id); onSliderChange(budget, dataGB, voiceMinutes, smsCount, opt.id, network, priority, budgetStrict) }}
                        className={`filter-pill ${type === opt.id ? 'active' : ''}`} style={{ fontSize: 12 }}>
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{t('recommend.reqNetwork')}</div>
                  <div style={{ display: 'flex', gap: 6 }}>
                    {[{ id: 'any', label: t('type.any') }, { id: '4G', label: '4G' }, { id: '5G', label: '5G' }].map(n => (
                      <button key={n.id} onClick={() => { setNetwork(n.id); onSliderChange(budget, dataGB, voiceMinutes, smsCount, type, n.id, priority, budgetStrict) }}
                        className={`filter-pill ${network === n.id ? 'active' : ''}`} style={{ fontSize: 12 }}>
                        {n.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

            </div>

            {/* ── Results ── */}
            <div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem' }}>
                <h2 style={{ fontSize: '1rem', fontWeight: 800, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: 8 }}>
                  {t('recommend.top3')} <span style={{ color: 'var(--accent)' }}>{t('recommend.top3Accent')}</span>
                </h2>
                {loading && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: 'var(--text-muted)', fontSize: 12 }}>
                    <Loader2 size={13} style={{ animation: 'spin 1s linear infinite' }} /> {t('recommend.analyzing')}
                  </div>
                )}
              </div>

              {!initialLoaded ? (
                <div style={{ textAlign: 'center', padding: '3rem' }}>
                  <div style={{ width: 36, height: 36, border: '3px solid var(--accent-muted)', borderTopColor: 'var(--accent)', borderRadius: '50%', animation: 'spin 0.8s linear infinite', margin: '0 auto' }} />
                </div>
              ) : results.length === 0 && !loading ? (
                <div className="card" style={{ padding: '3rem', textAlign: 'center' }}>
                  <Target size={40} style={{ color: 'var(--text-muted)', marginBottom: '1rem', display: 'block', margin: '0 auto 1rem' }} />
                  <p style={{ color: 'var(--text-secondary)' }}>{t('recommend.noResults')}</p>
                </div>
              ) : (
                <motion.div
                  style={{ display: 'flex', flexDirection: 'column', gap: '1rem', opacity: loading ? 0.5 : 1, transition: 'opacity 0.2s' }}
                  variants={{ hidden: {}, visible: { transition: { staggerChildren: 0.08 } } }}
                  initial="hidden"
                  animate="visible"
                >
                  {results.map((rec, i) => (
                    <motion.div key={i}
                      variants={{ hidden: { opacity: 0, y: 16 }, visible: { opacity: 1, y: 0, transition: { duration: 0.3, ease: 'easeOut' } } }}
                    >
                      <div style={{
                        background: 'var(--bg-card)',
                        border: `1px solid var(--border-base)`,
                        borderLeft: `4px solid ${RANK_BORDER[i] ?? 'var(--border-base)'}`,
                        borderRadius: 'var(--radius-xl)',
                        overflow: 'hidden',
                        boxShadow: `var(--shadow-sm), 0 0 0 0 ${RANK_COLORS[i] ?? 'transparent'}`,
                        transition: 'box-shadow 0.2s, transform 0.2s',
                      }}
                        onMouseEnter={e => { (e.currentTarget as HTMLElement).style.transform = 'translateY(-3px)'; (e.currentTarget as HTMLElement).style.boxShadow = `var(--shadow-md), 0 0 12px ${(RANK_COLORS[i] ?? '#818CF8')}30` }}
                        onMouseLeave={e => { (e.currentTarget as HTMLElement).style.transform = ''; (e.currentTarget as HTMLElement).style.boxShadow = 'var(--shadow-sm)' }}
                      >
                        {/* Rank color bar */}
                        <div style={{ height: 4, background: RANK_GRADIENTS[i] ?? 'var(--border-base)' }} />

                        <div style={{ padding: '1.25rem 1.5rem', display: 'flex', gap: '1.25rem', alignItems: 'flex-start' }}>
                          {/* Rank badge */}
                          <div style={{ textAlign: 'center', flexShrink: 0, minWidth: 52 }}>
                            <div style={{
                              width: 42, height: 42, borderRadius: '50%',
                              background: RANK_GRADIENTS[i] ?? 'var(--bg-elevated)',
                              display: 'flex', alignItems: 'center', justifyContent: 'center',
                              margin: '0 auto 6px',
                              fontSize: 18,
                              boxShadow: `0 3px 10px ${RANK_COLORS[i] ?? '#818CF8'}50`,
                            }}>
                              {RANK_LABELS[i] ?? `#${i + 1}`}
                            </div>
                            <div style={{ fontSize: '1.125rem', fontWeight: 800, color: 'var(--text-primary)', lineHeight: 1 }}>{rec.score}%</div>
                            <div style={{ fontSize: 10, fontWeight: 700, color: scoreColor(rec.score), textTransform: 'uppercase', letterSpacing: 0.5 }}>{matchLabel(rec.score, t)}</div>
                          </div>

                          {/* Offer info */}
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8, flexWrap: 'wrap' }}>
                              <span style={{ fontSize: 11, fontWeight: 600, padding: '2px 8px', borderRadius: 'var(--radius-full)', background: 'var(--bg-subtle)', border: '1px solid var(--border-base)', color: 'var(--text-secondary)' }}>
                                {rec.offer?.operator?.name}
                              </span>
                              <h3 style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>
                                {rec.offer?.name ? cleanOfferName(rec.offer.name) : ''}
                              </h3>
                            </div>

                            <div style={{ display: 'flex', gap: '1.25rem', marginBottom: '0.75rem', flexWrap: 'wrap', alignItems: 'center' }}>
                              <span style={{ fontSize: '1.375rem', fontWeight: 900, color: 'var(--text-primary)' }}>{formatDA(rec.offer?.priceDA)}</span>
                              <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', flexWrap: 'wrap' }}>
                                <span style={{ fontSize: 13, color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: 4 }}>
                                  <Wifi size={12} /> {formatData(rec.offer?.dataGB, t)}
                                </span>
                                <span style={{ fontSize: 13, color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: 4 }}>
                                  <Phone size={12} /> {formatMinutes(rec.offer?.voiceMinutes, t)}
                                </span>
                              </div>
                            </div>

                            {/* Score bar */}
                            <div className="progress-bar" style={{ marginBottom: '0.75rem' }}>
                              <div className="progress-fill" style={{ width: `${rec.score}%`, background: RANK_GRADIENTS[i] ?? 'var(--accent)' }} />
                            </div>

                            {/* Match reasons */}
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                              {rec.matchReasons.slice(0, 3).map((r, ri) => (
                                <div key={ri} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: 'var(--text-secondary)' }}>
                                  <CheckCircle size={12} style={{ color: 'var(--color-success)', flexShrink: 0 }} /> {tInterp(r.key, r.params)}
                                </div>
                              ))}
                              {rec.mismatches.slice(0, 2).map((m, mi) => (
                                <div key={mi} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: 'var(--text-muted)' }}>
                                  <AlertCircle size={12} style={{ flexShrink: 0 }} /> {tInterp(m.key, m.params)}
                                </div>
                              ))}
                            </div>

                            {rec.savings > 0 && (
                              <div style={{ marginTop: '0.75rem', fontSize: 12, color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 5 }}>
                                <TrendingUp size={12} />
                                {t('recommend.savesBefore')}{formatDA(rec.savings * 12)}{t('recommend.savesAfter')}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </motion.div>
              )}

              {results.length > 0 && results[0].score < 50 && (
                <div style={{
                  marginTop: '0.75rem', padding: '0.75rem 1rem', borderRadius: 10,
                  background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.25)',
                  fontSize: 13, color: 'var(--text-secondary)',
                  display: 'flex', alignItems: 'center', gap: 8,
                }}>
                  <AlertCircle size={14} style={{ color: '#F59E0B', flexShrink: 0 }} />
                  {t('recommend.lowMatchWarning')}
                </div>
              )}

              {results.length >= 2 && (
                <Link
                  href={`/compare?ids=${results.map(r => r.offer.id).join(',')}&from=recommend`}
                  className="btn-primary"
                  style={{ display: 'inline-flex', alignItems: 'center', gap: 6, marginTop: '1.5rem', textDecoration: 'none', padding: '0.75rem 1.5rem', borderRadius: 10 }}
                >
                  <BarChart2 size={14} /> {t('recommend.compareSideBySide')}
                </Link>
              )}
            </div>

          </div>
        )}

      </div>
    </div>
  )
}
