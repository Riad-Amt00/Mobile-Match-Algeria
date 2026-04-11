'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Zap, Wifi, Phone, TrendingUp, CheckCircle, AlertCircle, ArrowLeft, Target, BarChart2 } from 'lucide-react'
import { formatDA, formatData, formatMinutes, getOperatorColor } from '@/lib/utils'

interface Recommendation {
  offer: any
  score: number
  savings: number
  matchReasons: string[]
  mismatches: string[]
}

export default function RecommendPage() {
  const [step, setStep] = useState(1)
  const [budget, setBudget] = useState(2000)
  const [dataGB, setDataGB] = useState(20)
  const [voiceMinutes, setVoiceMinutes] = useState(100)
  const [smsCount, setSmsCount] = useState(50)
  const [type, setType] = useState('any')
  const [network, setNetwork] = useState('any')
  const [loading, setLoading] = useState(false)
  const [results, setResults] = useState<Recommendation[]>([])

  async function handleSubmit() {
    setLoading(true)
    try {
      const res = await fetch('/api/recommendations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ budget, dataGB, voiceMinutes, smsCount, type, network }),
      })
      const data = await res.json()
      setResults(data.recommendations || [])
      setStep(2)
    } catch {
      setResults([])
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-dark)', padding: '2rem 1.5rem' }}>
      <div style={{ maxWidth: 740, margin: '0 auto' }}>

        <Link href="/" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, color: 'var(--text-secondary)', textDecoration: 'none', fontSize: 14, marginBottom: '2rem' }}>
          <ArrowLeft size={16}/> Back
        </Link>

        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: '2.5rem' }}>
          <div style={{ width: 60, height: 60, borderRadius: 18, margin: '0 auto 1rem', background: 'linear-gradient(135deg, #4f7fff, #7c3aed)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Target size={28} color="white"/>
          </div>
          <h1 style={{ fontSize: '2rem', fontWeight: 900, marginBottom: 8 }}>
            AI <span className="gradient-text">Recommendation</span> Engine
          </h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: 15 }}>
            Answer a few questions and get your{' '}
            <strong style={{ color: '#6b93ff' }}>3 best matched offers</strong> instantly
          </p>
        </div>

        {/* Step indicator */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: '2rem', justifyContent: 'center' }}>
          {[{ n: 1, label: 'Your profile' }, { n: 2, label: 'Results' }].map((s, si) => (
            <div key={s.n} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <div style={{ width: 28, height: 28, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 800, background: step >= s.n ? 'linear-gradient(135deg, #4f7fff, #7c3aed)' : 'rgba(255,255,255,0.06)', color: step >= s.n ? 'white' : 'var(--text-secondary)' }}>
                {s.n}
              </div>
              <span style={{ fontSize: 13, fontWeight: 600, color: step >= s.n ? 'var(--text-primary)' : 'var(--text-secondary)' }}>{s.label}</span>
              {si < 1 && <div style={{ width: 32, height: 1, background: step > s.n ? '#4f7fff' : 'var(--border)' }}/>}
            </div>
          ))}
        </div>

        {/* ── STEP 1: Profile form ── */}
        {step === 1 && (
          <div className="glass" style={{ borderRadius: 22, padding: '2rem' }}>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 800, marginBottom: '1.75rem', display: 'flex', alignItems: 'center', gap: 8 }}>
              <Zap size={18} style={{ color: '#6b93ff' }}/> Your usage profile
            </h2>

            {/* Budget */}
            <div style={{ marginBottom: '1.75rem' }}>
              <label style={{ display: 'flex', justifyContent: 'space-between', fontSize: 14, fontWeight: 600, marginBottom: 10 }}>
                <span>💰 Monthly budget</span>
                <span className="gradient-text">{formatDA(budget)}</span>
              </label>
              <input type="range" min={100} max={8000} step={100} value={budget}
                onChange={e => setBudget(+e.target.value)}
                style={{ width: '100%', accentColor: '#4f7fff' }}
              />
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: 'var(--text-secondary)', marginTop: 4 }}>
                <span>100 DA</span><span>8,000 DA</span>
              </div>
            </div>

            {/* Data */}
            <div style={{ marginBottom: '1.75rem' }}>
              <label style={{ display: 'flex', justifyContent: 'space-between', fontSize: 14, fontWeight: 600, marginBottom: 10 }}>
                <span><Wifi size={14} style={{ display: 'inline', marginRight: 6 }}/>Monthly data</span>
                <span className="gradient-text">{dataGB} GB</span>
              </label>
              <input type="range" min={0} max={200} step={1} value={dataGB}
                onChange={e => setDataGB(+e.target.value)}
                style={{ width: '100%', accentColor: '#4f7fff' }}
              />
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: 'var(--text-secondary)', marginTop: 4 }}>
                <span>Low</span><span>200 GB</span>
              </div>
            </div>

            {/* Voice */}
            <div style={{ marginBottom: '1.75rem' }}>
              <label style={{ display: 'flex', justifyContent: 'space-between', fontSize: 14, fontWeight: 600, marginBottom: 10 }}>
                <span><Phone size={14} style={{ display: 'inline', marginRight: 6 }}/>Call minutes / month</span>
                <span className="gradient-text">{voiceMinutes >= 500 ? 'Unlimited' : `${voiceMinutes} min`}</span>
              </label>
              <input type="range" min={0} max={500} step={10} value={voiceMinutes}
                onChange={e => setVoiceMinutes(+e.target.value)}
                style={{ width: '100%', accentColor: '#4f7fff' }}
              />
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: 'var(--text-secondary)', marginTop: 4 }}>
                <span>Low</span><span>Unlimited</span>
              </div>
            </div>

            {/* Type */}
            <div style={{ marginBottom: '1.75rem' }}>
              <label style={{ fontSize: 14, fontWeight: 600, display: 'block', marginBottom: 10 }}>
                Preferred plan type
              </label>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                {[
                  { id: 'any',       label: '✨ Any' },
                  { id: 'PREPAID',   label: '💳 Prepaid' },
                  { id: 'POSTPAID',  label: '📋 Postpaid' },
                  { id: 'DATA_ONLY', label: '🌐 Data only' },
                ].map(t => (
                  <button key={t.id} onClick={() => setType(t.id)}
                    className={`filter-pill ${type === t.id ? 'active' : ''}`}>
                    {t.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Network */}
            <div style={{ marginBottom: '2rem' }}>
              <label style={{ fontSize: 14, fontWeight: 600, display: 'block', marginBottom: 10 }}>
                Required network
              </label>
              <div style={{ display: 'flex', gap: 8 }}>
                {[
                  { id: 'any', label: '🔌 Any' },
                  { id: '4G',  label: '4G' },
                  { id: '5G',  label: '5G' },
                ].map(n => (
                  <button key={n.id} onClick={() => setNetwork(n.id)}
                    className={`filter-pill ${network === n.id ? 'active' : ''}`}>
                    {n.label}
                  </button>
                ))}
              </div>
            </div>

            <button
              onClick={handleSubmit}
              disabled={loading}
              className="btn-primary"
              style={{ width: '100%', padding: '0.9375rem', fontSize: 16, borderRadius: 14, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}
            >
              {loading ? (
                <><div style={{ width: 16, height: 16, border: '2px solid rgba(255,255,255,0.4)', borderTopColor: 'white', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }}/> Analyzing...</>
              ) : (
                <><Target size={16}/> Find my best offers</>
              )}
            </button>
          </div>
        )}

        {/* ── STEP 2: Results ── */}
        {step === 2 && (
          <div>
            <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
              <h2 style={{ fontSize: '1.625rem', fontWeight: 800 }}>
                Your <span className="gradient-text">top 3 matches</span>
              </h2>
              <p style={{ color: 'var(--text-secondary)', fontSize: 14, marginTop: 6 }}>
                Ranked by match score based on your profile
              </p>
            </div>

            {results.length === 0 ? (
              <div className="glass" style={{ padding: '3rem', textAlign: 'center', borderRadius: 18 }}>
                <Target size={40} style={{ opacity: 0.2, marginBottom: '1rem', display: 'block', margin: '0 auto 1rem' }}/>
                <p style={{ color: 'var(--text-secondary)', marginBottom: '1rem' }}>
                  No offers match your criteria. Try adjusting your budget or data requirements.
                </p>
                <button onClick={() => setStep(1)} className="btn-primary" style={{ borderRadius: 10 }}>
                  Adjust my criteria
                </button>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                {results.map((rec, i) => {
                  const opColor = getOperatorColor(rec.offer?.operator?.slug || '')
                  const medals  = ['🥇', '🥈', '🥉']
                  const scoreColor = rec.score >= 75 ? '#4ade80' : rec.score >= 50 ? '#f59e0b' : '#f87171'
                  return (
                    <div key={i} className="offer-card" style={{ padding: '1.5rem', borderTop: `3px solid ${opColor}` }}>
                      <div style={{ display: 'flex', gap: '1.25rem', alignItems: 'flex-start' }}>
                        {/* Medal & Score */}
                        <div style={{ textAlign: 'center', flexShrink: 0, minWidth: 58 }}>
                          <div style={{ fontSize: '2rem', lineHeight: 1 }}>{medals[i]}</div>
                          <div style={{ marginTop: 8, fontSize: '1.375rem', fontWeight: 900, color: scoreColor }}>
                            {rec.score}%
                          </div>
                          <div style={{ fontSize: 10, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: 0.5 }}>match</div>
                        </div>

                        {/* Offer info */}
                        <div style={{ flex: 1 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                            <span style={{ fontSize: 11, fontWeight: 700, padding: '2px 9px', borderRadius: 50, background: `${opColor}20`, border: `1px solid ${opColor}50`, color: opColor }}>
                              {rec.offer?.operator?.name}
                            </span>
                            <h3 style={{ fontSize: '1rem', fontWeight: 800 }}>{rec.offer?.name}</h3>
                          </div>

                          <div style={{ display: 'flex', gap: '1.5rem', marginBottom: '0.875rem', flexWrap: 'wrap', alignItems: 'center' }}>
                            <span style={{ fontSize: '1.5rem', fontWeight: 900 }}>{formatDA(rec.offer?.priceDA)}</span>
                            <div style={{ display: 'flex', gap: '0.875rem', alignItems: 'center', flexWrap: 'wrap' }}>
                              <span style={{ fontSize: 13, color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: 4 }}>
                                <Wifi size={12}/> {formatData(rec.offer?.dataGB)}
                              </span>
                              <span style={{ fontSize: 13, color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: 4 }}>
                                <Phone size={12}/> {formatMinutes(rec.offer?.voiceMinutes)}
                              </span>
                            </div>
                          </div>

                          {/* Score bar */}
                          <div className="progress-bar" style={{ marginBottom: '0.875rem' }}>
                            <div className="progress-fill" style={{ width: `${rec.score}%`, background: `linear-gradient(90deg, ${scoreColor}80, ${scoreColor})` }}/>
                          </div>

                          {/* Match reasons & mismatches */}
                          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                            {rec.matchReasons.slice(0, 2).map((r, ri) => (
                              <div key={ri} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: '#4ade80' }}>
                                <CheckCircle size={12}/> {r}
                              </div>
                            ))}
                            {rec.mismatches.slice(0, 1).map((m, mi) => (
                              <div key={mi} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: '#f87171' }}>
                                <AlertCircle size={12}/> {m}
                              </div>
                            ))}
                          </div>

                          {/* Savings */}
                          {rec.savings > 0 && (
                            <div style={{ marginTop: '0.875rem', display: 'inline-flex', alignItems: 'center', gap: 6, padding: '0.35rem 0.75rem', borderRadius: 8, background: 'rgba(74,222,128,0.1)', border: '1px solid rgba(74,222,128,0.25)', color: '#4ade80', fontSize: 12, fontWeight: 600 }}>
                              <TrendingUp size={12}/>
                              Potential annual savings: ~{formatDA(rec.savings * 12)}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}

            <div style={{ display: 'flex', gap: 10, marginTop: '2rem' }}>
              <button onClick={() => setStep(1)} className="btn-ghost" style={{ flex: 1, borderRadius: 12, padding: '0.875rem' }}>
                ← Adjust my criteria
              </button>
              <Link href="/compare" style={{ flex: 1, borderRadius: 12, padding: '0.875rem', fontSize: 14, fontWeight: 700, background: 'linear-gradient(135deg, #4f7fff, #7c3aed)', color: 'white', textDecoration: 'none', textAlign: 'center', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                <BarChart2 size={14}/> Compare side-by-side →
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
