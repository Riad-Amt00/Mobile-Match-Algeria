'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useSession } from 'next-auth/react'
import { motion, type Variants } from 'framer-motion'
import {
  Zap, Wifi, Phone, TrendingUp, CheckCircle, AlertCircle, ArrowLeft,
  Target, BarChart2, MessageSquare, SlidersHorizontal, ChevronDown, Lock,
  Feather, GraduationCap, Flame, Briefcase,
} from 'lucide-react'

import { formatDA, formatData, formatMinutes, RANK_GRADIENTS, RANK_COLORS, cleanOfferName } from '@/lib/utils'
import { useLang } from '@/lib/lang-context'
import type { TKey } from '@/lib/i18n'

interface Recommendation {
  offer: any
  score: number
  savings: number
  matchReasons: string[]
  mismatches: string[]
}

const PRESET_BASE = [
  { id: 'light',    icon: <Feather size={15} />,       budget: 500,  dataGB: 5,   voiceMinutes: 50,  smsCount: 20 },
  { id: 'student',  icon: <GraduationCap size={15} />, budget: 1000, dataGB: 20,  voiceMinutes: 100, smsCount: 50 },
  { id: 'heavy',    icon: <Flame size={15} />,          budget: 2500, dataGB: 60,  voiceMinutes: 300, smsCount: 100 },
  { id: 'business', icon: <Briefcase size={15} />,      budget: 4000, dataGB: 100, voiceMinutes: 500, smsCount: 200 },
]

const resultsVariants: Variants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.08 } },
}
const resultItemVariants: Variants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.35, ease: 'easeOut' } },
}

export default function RecommendPage() {
  const { t } = useLang()
  const { data: session, status } = useSession()
  const [step, setStep] = useState(1)
  const [budget, setBudget] = useState(2000)
  const [dataGB, setDataGB] = useState(20)
  const [voiceMinutes, setVoiceMinutes] = useState(100)
  const [smsCount, setSmsCount] = useState(50)
  const [type, setType] = useState('any')
  const [network, setNetwork] = useState('any')
  const [loading, setLoading] = useState(false)
  const [results, setResults] = useState<Recommendation[]>([])
  const [profileReady, setProfileReady] = useState(false)
  const [showAdjust, setShowAdjust] = useState(false)

  const presets = PRESET_BASE.map(p => ({
    ...p,
    label: t(`recommend.preset.${p.id}` as TKey),
    desc: t(`recommend.preset.${p.id}Desc` as TKey),
  }))

  const typeOptions = [
    { id: 'any',       label: t('type.any') },
    { id: 'PREPAID',   label: t('type.prepaid') },
    { id: 'POSTPAID',  label: t('type.postpaid') },
    { id: 'DATA_ONLY', label: t('type.dataOnly') },
  ]

  useEffect(() => {
    try {
      const saved = sessionStorage.getItem('recommend_results')
      const savedStep = sessionStorage.getItem('recommend_step')
      if (saved && savedStep === '2') {
        setResults(JSON.parse(saved))
        setStep(2)
      }
    } catch {}
  }, [])

  const rf = (v: number, mn: number, mx: number) =>
    ({ width: '100%', '--fill': `${((v - mn) / (mx - mn) * 100).toFixed(1)}%` } as React.CSSProperties)

  useEffect(() => {
    if (status !== 'authenticated') return
    fetch('/api/profile')
      .then(r => r.json())
      .then(d => {
        if (!d.profile) return
        const p = d.profile
        if (p.monthlyBudget)        setBudget(p.monthlyBudget)
        if (p.dataUsageGB)          setDataGB(p.dataUsageGB)
        if (p.voiceMinutes != null) setVoiceMinutes(p.voiceMinutes)
        if (p.smsCount != null)     setSmsCount(p.smsCount)
        if (p.preferredType)        setType(p.preferredType)
        if (p.preferredNet)         setNetwork(p.preferredNet)
        setProfileReady(true)
      })
      .catch(() => {})
  }, [status])

  useEffect(() => {
    if (profileReady && step === 1) handleSubmit()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profileReady])

  function applyPreset(preset: typeof PRESET_BASE[0]) {
    setBudget(preset.budget)
    setDataGB(preset.dataGB)
    setVoiceMinutes(preset.voiceMinutes)
    setSmsCount(preset.smsCount)
  }

  async function handleSubmit() {
    setLoading(true)
    try {
      const [recRes] = await Promise.all([
        fetch('/api/recommendations', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ budget, dataGB, voiceMinutes, smsCount, type, network }),
        }),
        fetch('/api/profile', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            monthlyBudget: budget,
            dataUsageGB: dataGB,
            voiceMinutes,
            smsCount,
            preferredType: type,
            preferredNet: network,
          }),
        }),
      ])
      const data = await recRes.json()
      const recs = data.recommendations || []
      setResults(recs)
      setStep(2)
      try {
        sessionStorage.setItem('recommend_results', JSON.stringify(recs))
        sessionStorage.setItem('recommend_step', '2')
      } catch {}
    } catch {
      setResults([])
      setStep(2)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-page)', padding: '2rem 1.5rem' }}>
      <div style={{ maxWidth: 740, margin: '0 auto' }}>

        <Link href="/offers" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, color: 'var(--text-secondary)', textDecoration: 'none', fontSize: 14, marginBottom: '2rem' }}>
          <ArrowLeft size={16} /> {t('recommend.back')}
        </Link>

        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: '2.5rem' }}>
          <div style={{
            width: 60, height: 60, borderRadius: 18, margin: '0 auto 1rem',
            background: 'var(--accent-muted)', border: '1px solid var(--accent-border)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <Target size={28} color="var(--accent)" />
          </div>
          <h1 className="section-title" style={{ marginBottom: 0 }}>
            {t('recommend.title')}
          </h1>
        </div>

        {/* Loading */}
        {status === 'loading' && (
          <div style={{ textAlign: 'center', padding: '4rem 1rem' }}>
            <div style={{ width: 36, height: 36, border: '3px solid var(--accent-muted)', borderTopColor: 'var(--accent)', borderRadius: '50%', animation: 'spin 0.8s linear infinite', margin: '0 auto' }} />
          </div>
        )}

        {/* Login gate */}
        {status === 'unauthenticated' && (
          <div className="card" style={{ padding: '3rem 2rem', textAlign: 'center' }}>
            <Lock size={40} style={{ color: 'var(--text-muted)', margin: '0 auto 1rem', display: 'block' }} />
            <h2 style={{ fontSize: '1.375rem', fontWeight: 800, marginBottom: 10, color: 'var(--text-primary)' }}>{t('recommend.signInTitle')}</h2>
            <p style={{ color: 'var(--text-secondary)', fontSize: 14, lineHeight: 1.7, maxWidth: 420, margin: '0 auto 2rem' }}>
              {t('recommend.signInDesc')}
            </p>
            <div style={{ display: 'flex', gap: 10, justifyContent: 'center', flexWrap: 'wrap' }}>
              <Link href="/login" className="btn-primary" style={{ padding: '0.75rem 1.5rem', textDecoration: 'none', borderRadius: 10 }}>
                {t('recommend.signIn')}
              </Link>
              <Link href="/register" className="btn-secondary" style={{ padding: '0.75rem 1.5rem', textDecoration: 'none', borderRadius: 10 }}>
                {t('recommend.createAccount')}
              </Link>
            </div>
          </div>
        )}

        {/* Step indicator */}
        {status === 'authenticated' && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: '2rem', justifyContent: 'center' }}>
            {[{ n: 1, label: t('recommend.step1') }, { n: 2, label: t('recommend.step2') }].map((s, si) => (
              <div key={s.n} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <div style={{
                  width: 30, height: 30, borderRadius: '50%',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 13, fontWeight: 800,
                  background: step >= s.n ? 'var(--accent)' : 'transparent',
                  color: step >= s.n ? 'white' : 'var(--text-secondary)',
                  border: step >= s.n ? '2px solid var(--accent)' : '2px solid var(--border-strong)',
                  transition: 'all 0.2s',
                }}>
                  {s.n}
                </div>
                <span style={{ fontSize: 13, fontWeight: 600, color: step >= s.n ? 'var(--text-primary)' : 'var(--text-secondary)' }}>{s.label}</span>
                {si < 1 && <div style={{ width: 40, height: 2, borderRadius: 1, background: step > s.n ? 'var(--accent)' : 'var(--border-strong)', transition: 'background 0.2s' }} />}
              </div>
            ))}
          </div>
        )}

        {/* Step 1: Profile form */}
        {status === 'authenticated' && step === 1 && (
          <div className="card" style={{ padding: '2rem' }}>

            {/* Presets */}
            <div style={{ marginBottom: '2rem' }}>
              <label style={{ fontSize: 14, fontWeight: 700, display: 'block', marginBottom: 10, color: 'var(--text-primary)' }}>
                {t('recommend.quickPresets')}
              </label>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 10 }}>
                {presets.map(p => (
                  <button
                    key={p.id}
                    onClick={() => applyPreset(p)}
                    style={{
                      padding: '1rem', borderRadius: 'var(--radius-lg)', textAlign: 'left',
                      background: 'var(--bg-card)', border: '1px solid var(--border-base)',
                      cursor: 'pointer', color: 'var(--text-primary)', fontFamily: 'inherit',
                      boxShadow: 'var(--shadow-sm)',
                      transition: 'border-color 0.15s, transform 0.15s, box-shadow 0.15s',
                    }}
                    onMouseEnter={e => {
                      e.currentTarget.style.borderColor = 'var(--accent-border)'
                      e.currentTarget.style.transform = 'translateY(-2px)'
                      e.currentTarget.style.boxShadow = 'var(--shadow-md)'
                    }}
                    onMouseLeave={e => {
                      e.currentTarget.style.borderColor = 'var(--border-base)'
                      e.currentTarget.style.transform = 'translateY(0)'
                      e.currentTarget.style.boxShadow = 'var(--shadow-sm)'
                    }}
                  >
                    <div style={{
                      width: 36, height: 36, borderRadius: 10, marginBottom: 8,
                      background: 'var(--accent-muted)', border: '1px solid var(--accent-border)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      color: 'var(--accent)',
                    }}>
                      {p.icon}
                    </div>
                    <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 4, color: 'var(--text-primary)' }}>{p.label}</div>
                    <div style={{ fontSize: 11, color: 'var(--text-secondary)', lineHeight: 1.4 }}>{p.desc}</div>
                  </button>
                ))}
              </div>
            </div>

            <h2 style={{ fontSize: '1.125rem', fontWeight: 800, marginBottom: '1.75rem', display: 'flex', alignItems: 'center', gap: 8, color: 'var(--text-primary)' }}>
              <Zap size={18} style={{ color: 'var(--accent)' }} /> {t('recommend.usageProfile')}
            </h2>

            {/* Budget */}
            <div style={{ marginBottom: '1.75rem' }}>
              <label style={{ display: 'flex', justifyContent: 'space-between', fontSize: 14, fontWeight: 600, marginBottom: 10, color: 'var(--text-primary)' }}>
                <span>{t('recommend.monthlyBudget')}</span>
                <span style={{ color: 'var(--accent)' }}>{formatDA(budget)}</span>
              </label>
              <input type="range" min={100} max={8000} step={100} value={budget} onChange={e => setBudget(+e.target.value)} style={rf(budget, 100, 8000)} />
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>
                <span>100 DA</span><span>8,000 DA</span>
              </div>
            </div>

            {/* Data */}
            <div style={{ marginBottom: '1.75rem' }}>
              <label style={{ display: 'flex', justifyContent: 'space-between', fontSize: 14, fontWeight: 600, marginBottom: 10, color: 'var(--text-primary)' }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}><Wifi size={14} /> {t('recommend.monthlyData')}</span>
                <span style={{ color: 'var(--accent)' }}>{dataGB} GB</span>
              </label>
              <input type="range" min={0} max={200} step={1} value={dataGB} onChange={e => setDataGB(+e.target.value)} style={rf(dataGB, 0, 200)} />
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>
                <span>{t('common.low')}</span><span>200 GB</span>
              </div>
            </div>

            {/* Voice */}
            <div style={{ marginBottom: '1.75rem' }}>
              <label style={{ display: 'flex', justifyContent: 'space-between', fontSize: 14, fontWeight: 600, marginBottom: 10, color: 'var(--text-primary)' }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}><Phone size={14} /> {t('recommend.callMinutes')}</span>
                <span style={{ color: 'var(--accent)' }}>{voiceMinutes >= 500 ? t('common.unlimited') : `${voiceMinutes} ${t('common.min')}`}</span>
              </label>
              <input type="range" min={0} max={500} step={10} value={voiceMinutes} onChange={e => setVoiceMinutes(+e.target.value)} style={rf(voiceMinutes, 0, 500)} />
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>
                <span>{t('common.low')}</span><span>{t('common.unlimited')}</span>
              </div>
            </div>

            {/* SMS */}
            <div style={{ marginBottom: '1.75rem' }}>
              <label style={{ display: 'flex', justifyContent: 'space-between', fontSize: 14, fontWeight: 600, marginBottom: 10, color: 'var(--text-primary)' }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}><MessageSquare size={14} /> {t('recommend.smsMonth')}</span>
                <span style={{ color: 'var(--accent)' }}>{smsCount >= 500 ? t('common.unlimited') : `${smsCount}`}</span>
              </label>
              <input type="range" min={0} max={500} step={10} value={smsCount} onChange={e => setSmsCount(+e.target.value)} style={rf(smsCount, 0, 500)} />
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>
                <span>{t('common.low')}</span><span>{t('common.unlimited')}</span>
              </div>
            </div>

            {/* Type */}
            <div style={{ marginBottom: '1.75rem' }}>
              <label style={{ fontSize: 14, fontWeight: 600, display: 'block', marginBottom: 10, color: 'var(--text-primary)' }}>{t('recommend.preferredType')}</label>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                {typeOptions.map(opt => (
                  <button key={opt.id} onClick={() => setType(opt.id)} className={`filter-pill ${type === opt.id ? 'active' : ''}`}>{opt.label}</button>
                ))}
              </div>
            </div>

            {/* Network */}
            <div style={{ marginBottom: '2rem' }}>
              <label style={{ fontSize: 14, fontWeight: 600, display: 'block', marginBottom: 10, color: 'var(--text-primary)' }}>{t('recommend.reqNetwork')}</label>
              <div style={{ display: 'flex', gap: 8 }}>
                {[{ id: 'any', label: t('type.any') }, { id: '4G', label: '4G' }, { id: '5G', label: '5G' }].map(n => (
                  <button key={n.id} onClick={() => setNetwork(n.id)} className={`filter-pill ${network === n.id ? 'active' : ''}`}>{n.label}</button>
                ))}
              </div>
            </div>

            <button onClick={handleSubmit} disabled={loading} className="btn-primary" style={{ width: '100%', padding: '0.9375rem', fontSize: 16, borderRadius: 'var(--radius-lg)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
              {loading
                ? <><div style={{ width: 16, height: 16, border: '2px solid rgba(255,255,255,0.4)', borderTopColor: 'white', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} /> {t('recommend.analyzing')}</>
                : <><Target size={16} /> {t('recommend.findBest')}</>}
            </button>
          </div>
        )}

        {/* Step 2: Results */}
        {status === 'authenticated' && step === 2 && (
          <div>
            {/* Adjust criteria */}
            <div className="card" style={{ marginBottom: '1.5rem', overflow: 'hidden' }}>
              <button
                onClick={() => setShowAdjust(!showAdjust)}
                style={{ width: '100%', padding: '0.875rem 1.25rem', background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontFamily: 'inherit' }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <SlidersHorizontal size={15} style={{ color: 'var(--accent)' }} />
                  <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)' }}>{t('recommend.adjustPanel')}</span>
                  <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                    {formatDA(budget)} · {dataGB} GB · {voiceMinutes >= 500 ? t('recommend.unlimitedCalls') : `${voiceMinutes} ${t('common.min')}`}
                  </span>
                </div>
                <ChevronDown size={15} style={{ color: 'var(--text-secondary)', transform: showAdjust ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }} />
              </button>

              {showAdjust && (
                <div style={{ padding: '0 1.25rem 1.25rem', borderTop: '1px solid var(--border-base)' }}>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1.25rem', marginTop: '1.25rem' }}>
                    {[
                      { label: t('recommend.monthlyBudget'), value: formatDA(budget), slider: <input type="range" min={100} max={8000} step={100} value={budget} onChange={e => setBudget(+e.target.value)} style={rf(budget, 100, 8000)} /> },
                      { label: t('offer.data'),              value: `${dataGB} GB`,    slider: <input type="range" min={0} max={200} step={1} value={dataGB} onChange={e => setDataGB(+e.target.value)} style={rf(dataGB, 0, 200)} /> },
                      { label: t('offer.calls'),             value: voiceMinutes >= 500 ? t('common.unlimited') : `${voiceMinutes} ${t('common.min')}`, slider: <input type="range" min={0} max={500} step={10} value={voiceMinutes} onChange={e => setVoiceMinutes(+e.target.value)} style={rf(voiceMinutes, 0, 500)} /> },
                      { label: t('offer.sms'),               value: smsCount >= 500 ? t('common.unlimited') : String(smsCount), slider: <input type="range" min={0} max={500} step={10} value={smsCount} onChange={e => setSmsCount(+e.target.value)} style={rf(smsCount, 0, 500)} /> },
                    ].map(item => (
                      <div key={item.label}>
                        <label style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, fontWeight: 600, marginBottom: 8, color: 'var(--text-primary)' }}>
                          <span>{item.label}</span>
                          <span style={{ color: 'var(--accent)' }}>{item.value}</span>
                        </label>
                        {item.slider}
                      </div>
                    ))}
                  </div>
                  <div style={{ display: 'flex', gap: 8, marginTop: '1rem', flexWrap: 'wrap' }}>
                    {typeOptions.map(opt => (
                      <button key={opt.id} onClick={() => setType(opt.id)} className={`filter-pill ${type === opt.id ? 'active' : ''}`} style={{ fontSize: 12 }}>
                        {opt.label}
                      </button>
                    ))}
                    <div style={{ width: '100%', height: 0 }} />
                    {[{ id: 'any', label: t('type.any') }, { id: '4G', label: '4G' }, { id: '5G', label: '5G' }].map(n => (
                      <button key={n.id} onClick={() => setNetwork(n.id)} className={`filter-pill ${network === n.id ? 'active' : ''}`} style={{ fontSize: 12 }}>
                        {n.label}
                      </button>
                    ))}
                  </div>
                  <button onClick={() => { handleSubmit(); setShowAdjust(false) }} disabled={loading} className="btn-primary" style={{ marginTop: '1rem', width: '100%', borderRadius: 'var(--radius-md)', padding: '0.75rem', fontSize: 14, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                    {loading
                      ? <><div style={{ width: 14, height: 14, border: '2px solid rgba(255,255,255,0.3)', borderTopColor: 'white', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} /> {t('recommend.updating')}</>
                      : <><Target size={14} /> {t('recommend.updateResults')}</>}
                  </button>
                </div>
              )}
            </div>

            <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
              <h2 className="section-title" style={{ fontSize: '1.5rem' }}>
                {t('recommend.top3')} <span style={{ color: 'var(--accent)' }}>{t('recommend.top3Accent')}</span>
              </h2>
              <p style={{ color: 'var(--text-secondary)', fontSize: 14, marginTop: 6 }}>
                {t('recommend.rankedBy')}
              </p>
            </div>

            {results.length === 0 ? (
              <div className="card" style={{ padding: '3rem', textAlign: 'center' }}>
                <Target size={40} style={{ color: 'var(--text-muted)', marginBottom: '1rem', display: 'block', margin: '0 auto 1rem' }} />
                <p style={{ color: 'var(--text-secondary)', marginBottom: '1rem' }}>
                  {t('recommend.noResults')}
                </p>
                <button onClick={() => setStep(1)} className="btn-primary">{t('recommend.adjustCriteria')}</button>
              </div>
            ) : (
              <motion.div
                style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}
                variants={resultsVariants}
                initial="hidden"
                animate="visible"
              >
                {results.map((rec, i) => {
                  return (
                    <motion.div key={i} variants={resultItemVariants}>
                      <div className="offer-card" style={{ padding: '1.5rem' }}>
                        <div style={{ height: 6, background: 'var(--border-base)', borderRadius: 'var(--radius-lg) var(--radius-lg) 0 0', margin: '-1.5rem -1.5rem 1.5rem', marginTop: -16 }} />
                        <div style={{ display: 'flex', gap: '1.25rem', alignItems: 'flex-start' }}>

                          {/* Rank & score */}
                          <div style={{ textAlign: 'center', flexShrink: 0, minWidth: 56 }}>
                            <div style={{
                              width: 40, height: 40, borderRadius: '50%',
                              background: RANK_GRADIENTS[i],
                              display: 'flex', alignItems: 'center', justifyContent: 'center',
                              margin: '0 auto 8px', fontSize: 16, fontWeight: 900, color: 'white',
                              boxShadow: `0 3px 10px ${RANK_COLORS[i]}50`,
                            }}>
                              {i + 1}
                            </div>
                            <div style={{ fontSize: '1.125rem', fontWeight: 800, color: 'var(--text-primary)' }}>
                              {rec.score}%
                            </div>
                            <div style={{ fontSize: 10, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: 0.5 }}>{t('recommend.match')}</div>
                          </div>

                          {/* Offer info */}
                          <div style={{ flex: 1 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8, flexWrap: 'wrap' }}>
                              <span style={{ fontSize: 11, fontWeight: 600, padding: '2px 8px', borderRadius: 'var(--radius-full)', background: 'var(--bg-subtle)', border: '1px solid var(--border-base)', color: 'var(--text-secondary)' }}>
                                {rec.offer?.operator?.name}
                              </span>
                              <h3 style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--text-primary)' }}>{rec.offer?.name ? cleanOfferName(rec.offer.name) : ''}</h3>
                            </div>

                            <div style={{ display: 'flex', gap: '1.5rem', marginBottom: '0.875rem', flexWrap: 'wrap', alignItems: 'center' }}>
                              <span style={{ fontSize: '1.5rem', fontWeight: 900, color: 'var(--text-primary)' }}>{formatDA(rec.offer?.priceDA)}</span>
                              <div style={{ display: 'flex', gap: '0.875rem', alignItems: 'center', flexWrap: 'wrap' }}>
                                <span style={{ fontSize: 13, color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: 4 }}>
                                  <Wifi size={12} /> {formatData(rec.offer?.dataGB, t)}
                                </span>
                                <span style={{ fontSize: 13, color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: 4 }}>
                                  <Phone size={12} /> {formatMinutes(rec.offer?.voiceMinutes, t)}
                                </span>
                              </div>
                            </div>

                            <div className="progress-bar" style={{ marginBottom: '0.875rem' }}>
                              <div className="progress-fill" style={{ width: `${rec.score}%`, background: 'var(--accent)' }} />
                            </div>

                            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                              {rec.matchReasons.slice(0, 3).map((r, ri) => (
                                <div key={ri} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: 'var(--text-secondary)' }}>
                                  <CheckCircle size={12} style={{ color: 'var(--text-muted)', flexShrink: 0 }} /> {r}
                                </div>
                              ))}
                              {rec.mismatches.slice(0, 2).map((m, mi) => (
                                <div key={mi} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: 'var(--text-muted)' }}>
                                  <AlertCircle size={12} style={{ flexShrink: 0 }} /> {m}
                                </div>
                              ))}
                            </div>

                            {rec.savings > 0 && (
                              <div style={{ marginTop: '0.875rem', fontSize: 12, color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 5 }}>
                                <TrendingUp size={12} />
                                {t('recommend.savesBefore')}{formatDA(rec.savings * 12)}{t('recommend.savesAfter')}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  )
                })}
              </motion.div>
            )}

            <div style={{ display: 'flex', gap: 10, marginTop: '2rem' }}>
              <button onClick={() => {
                setStep(1)
                setProfileReady(false)
                try { sessionStorage.removeItem('recommend_results'); sessionStorage.removeItem('recommend_step') } catch {}
              }} className="btn-secondary" style={{ flex: 1, borderRadius: 'var(--radius-lg)', padding: '0.875rem' }}>
                ← {t('recommend.adjustCriteria')}
              </button>
              {results.length >= 2 && (
                <Link href={`/compare?ids=${results.map(r => r.offer.id).join(',')}&from=recommend`} className="btn-primary" style={{ flex: 1, borderRadius: 'var(--radius-lg)', padding: '0.875rem', textDecoration: 'none', textAlign: 'center', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
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
