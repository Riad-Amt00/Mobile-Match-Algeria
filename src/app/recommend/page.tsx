'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { useSession } from 'next-auth/react'
import { motion } from 'framer-motion'
import {
  Zap, Wifi, Phone, TrendingDown, CheckCircle, AlertCircle, ArrowLeft,
  Target, BarChart2, MessageSquare, Lock, Loader2,
} from 'lucide-react'

import { formatDA, formatData, formatMinutes, RANK_GRADIENTS, RANK_COLORS, cleanOfferName, OPERATOR_LOGOS } from '@/lib/utils'
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

export default function RecommendPage() {
  const { t, tInterp } = useLang()
  const { data: session, status } = useSession()

  const [budget, setBudget] = useState(2000)
  const [dataGB, setDataGB] = useState(20)
  // Slider ceilings — sized from the real catalogue maxima so the budget hard
  // ceiling and the data target can reach the most expensive / largest offers.
  const [budgetMax, setBudgetMax] = useState(15000)
  const [dataMax, setDataMax] = useState(400)
  // Calls / SMS are binary in the catalogue (unlimited or none) — 0 = "Any", -1 = "Unlimited"
  const [voiceMinutes, setVoiceMinutes] = useState(0)
  const [smsCount, setSmsCount] = useState(0)
  const [type, setType] = useState('any')
  const [network, setNetwork] = useState('any')
  const [operator, setOperator] = useState('any')

  const [results, setResults] = useState<Recommendation[]>([])
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [initialLoaded, setInitialLoaded] = useState(false)
  // Results are shown only after the user explicitly runs the recommendation; any
  // settings change hides them again — no live auto-update, no response races.
  const [showResults, setShowResults] = useState(false)

  const rf = (v: number, mn: number, mx: number) =>
    ({ width: '100%', '--fill': `${((v - mn) / Math.max(1, mx - mn) * 100).toFixed(1)}%` } as React.CSSProperties)

  // Size the budget / data slider ceilings from the real catalogue maxima.
  useEffect(() => {
    fetch('/api/stats').then(r => r.json()).then(d => {
      if (d?.maxPrice) setBudgetMax(Math.ceil(d.maxPrice / 1000) * 1000)
      if (d?.maxData)  setDataMax(Math.max(10, Math.ceil(d.maxData / 10) * 10))
    }).catch(() => {})
  }, [])

  const typeOptions = [
    { id: 'any', label: t('type.any') },
    { id: 'PREPAID', label: t('type.prepaid') },
    { id: 'POSTPAID', label: t('type.postpaid') },
    { id: 'DATA_ONLY', label: t('type.dataOnly') },
  ]

  const fetchRecommendations = useCallback(async (
    b: number, d: number, v: number, s: number, ty: string, net: string, op: string
  ) => {
    setLoading(true)
    try {
      const res = await fetch('/api/recommendations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ budget: b, dataGB: d, voiceMinutes: v, smsCount: s, type: ty, network: net, operator: op }),
      })
      if (res.status === 429) {
        // Rate limited — keep previous results rather than showing empty
        return
      }
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
        // Calls/SMS are binary toggles — only -1 (unlimited) is meaningful; anything else = Any (0)
        const v = p?.voiceMinutes === -1 ? -1 : 0
        const s = p?.smsCount === -1 ? -1 : 0
        const ty = p?.preferredType ?? 'any'
        const net = p?.preferredNet ?? 'any'
        const op = p?.preferredOperator ?? 'any'
        setBudget(b); setDataGB(dg); setVoiceMinutes(v)
        setSmsCount(s); setType(ty); setNetwork(net); setOperator(op)
        setInitialLoaded(true)
      })
      .catch(() => setInitialLoaded(true))
  }, [status, fetchRecommendations])

  // Any settings change invalidates the shown results — the user must re-run the
  // recommendation explicitly (see runRecommendations). This removes the old live
  // auto-update and the response-race it caused. Args kept so call sites need no change.
  function onSliderChange(
    _b?: number, _d?: number, _v?: number, _s?: number, _ty?: string, _net?: string, _pris?: string[]
  ) {
    setShowResults(false)
  }

  // Explicitly run the recommendation: persist the profile, fetch results, reveal them.
  async function runRecommendations() {
    setSaving(true)
    setShowResults(true)
    try {
      await fetch('/api/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ monthlyBudget: budget, dataUsageGB: dataGB, voiceMinutes, smsCount, preferredType: type, preferredNet: network, preferredOperator: operator }),
      })
      await fetchRecommendations(budget, dataGB, voiceMinutes, smsCount, type, network, operator)
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
              <h2 style={{ fontSize: '1rem', fontWeight: 800, display: 'flex', alignItems: 'center', gap: 8, color: 'var(--text-primary)', margin: '0 0 1.5rem' }}>
                <Zap size={16} style={{ color: 'var(--accent)' }} /> {t('recommend.usageProfile')}
              </h2>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.25rem' }}>
                {/* Budget */}
                <div>
                  <label style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, fontWeight: 600, marginBottom: 8, color: 'var(--text-primary)' }}>
                    <span>{t('recommend.monthlyBudget')}</span>
                    <span style={{ color: 'var(--accent)' }}>{formatDA(budget)}</span>
                  </label>
                  <input type="range" min={100} max={budgetMax} step={100} value={budget}
                    onChange={e => { const v = +e.target.value; setBudget(v); onSliderChange(v, dataGB, voiceMinutes, smsCount, type, network) }}
                    style={rf(budget, 100, budgetMax)} />
                </div>

                {/* Data */}
                <div>
                  <label style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, fontWeight: 600, marginBottom: 8, color: 'var(--text-primary)' }}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}><Wifi size={13} /> {t('recommend.monthlyData')}</span>
                    <span style={{ color: 'var(--accent)' }}>{dataGB} GB</span>
                  </label>
                  <input type="range" min={0} max={dataMax} step={1} value={dataGB}
                    onChange={e => { const v = +e.target.value; setDataGB(v); onSliderChange(budget, v, voiceMinutes, smsCount, type, network) }}
                    style={rf(dataGB, 0, dataMax)} />
                </div>

              </div>

              {/* Filters — categorical / binary constraints */}
              <div style={{ display: 'flex', gap: '1.5rem', marginTop: '1.25rem', flexWrap: 'wrap' }}>
                <div>
                  <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{t('recommend.operator')}</div>
                  <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                    {[{ id: 'any', label: t('type.any') }, { id: 'djezzy', label: 'Djezzy' }, { id: 'ooredoo', label: 'Ooredoo' }, { id: 'mobilis', label: 'Mobilis' }].map(o => (
                      <button key={o.id} onClick={() => { setOperator(o.id); onSliderChange() }}
                        className={`filter-pill ${operator === o.id ? 'active' : ''}`} style={{ fontSize: 12, display: 'flex', alignItems: 'center', gap: 6 }}>
                        {o.id !== 'any' && OPERATOR_LOGOS[o.id] && (
                          <img src={OPERATOR_LOGOS[o.id]} alt={o.label} style={{ width: 15, height: 15, objectFit: 'contain' }} />
                        )}
                        {o.label}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{t('recommend.preferredType')}</div>
                  <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                    {typeOptions.map(opt => (
                      <button key={opt.id} onClick={() => { setType(opt.id); onSliderChange(budget, dataGB, voiceMinutes, smsCount, opt.id, network) }}
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
                      <button key={n.id} onClick={() => { setNetwork(n.id); onSliderChange(budget, dataGB, voiceMinutes, smsCount, type, n.id) }}
                        className={`filter-pill ${network === n.id ? 'active' : ''}`} style={{ fontSize: 12 }}>
                        {n.label}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.05em', display: 'flex', alignItems: 'center', gap: 5 }}>
                    <Phone size={12} /> {t('recommend.priority.calls')}
                  </div>
                  <div style={{ display: 'flex', gap: 6 }}>
                    {[{ v: 0, label: t('common.noPreference') }, { v: -1, label: t('common.unlimited') }].map(o => (
                      <button key={o.v} onClick={() => { setVoiceMinutes(o.v); onSliderChange(budget, dataGB, o.v, smsCount, type, network) }}
                        className={`filter-pill ${voiceMinutes === o.v ? 'active' : ''}`} style={{ fontSize: 12 }}>
                        {o.label}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.05em', display: 'flex', alignItems: 'center', gap: 5 }}>
                    <MessageSquare size={12} /> {t('recommend.priority.sms')}
                  </div>
                  <div style={{ display: 'flex', gap: 6 }}>
                    {[{ v: 0, label: t('common.noPreference') }, { v: -1, label: t('common.unlimited') }].map(o => (
                      <button key={o.v} onClick={() => { setSmsCount(o.v); onSliderChange(budget, dataGB, voiceMinutes, o.v, type, network) }}
                        className={`filter-pill ${smsCount === o.v ? 'active' : ''}`} style={{ fontSize: 12 }}>
                        {o.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <button onClick={runRecommendations} disabled={saving} className="btn-primary" style={{
                width: '100%', marginTop: '1.5rem', display: 'flex', alignItems: 'center', justifyContent: 'center',
                gap: 8, padding: '0.85rem', borderRadius: 'var(--radius-md)', fontSize: 14, fontWeight: 700,
              }}>
                {saving
                  ? <Loader2 size={15} style={{ animation: 'spin 1s linear infinite' }} />
                  : <Target size={15} />}
                {t('recommend.getResults')}
              </button>

            </div>

            {/* ── Results ── (shown only after the user runs the recommendation) */}
            {showResults && (
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
                              margin: '0 auto',
                              fontSize: 18,
                              boxShadow: `0 3px 10px ${RANK_COLORS[i] ?? '#818CF8'}50`,
                            }}>
                              {RANK_LABELS[i] ?? `#${i + 1}`}
                            </div>
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
                              <div style={{
                                marginTop: '0.85rem',
                                padding: '0.65rem 0.85rem',
                                background: 'rgba(34,197,94,0.07)',
                                border: '1px solid rgba(34,197,94,0.20)',
                                borderRadius: 8,
                                display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap',
                              }}>
                                <TrendingDown size={15} style={{ color: 'var(--color-success)', flexShrink: 0 }} />
                                <span style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.45 }}>
                                  <strong style={{ color: 'var(--color-success)', fontSize: 14.5 }}>
                                    {formatDA(rec.savings * 12)}
                                  </strong>{' '}{t('savings.perYear')}
                                  <span style={{ color: 'var(--text-muted)' }}>
                                    {' · '}{formatDA(rec.savings)} {t('savings.perMonth')}
                                    {' · '}{Math.round((rec.savings / budget) * 100)}% {t('savings.reduction')}
                                  </span>
                                </span>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </motion.div>
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
            )}

          </div>
        )}

      </div>
    </div>
  )
}
