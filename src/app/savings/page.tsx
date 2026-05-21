'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { motion } from 'framer-motion'
import { PiggyBank, Wifi, Phone, MessageSquare, TrendingDown, ArrowRight, Loader2, Signal } from 'lucide-react'
import { formatDA, OPERATOR_LOGOS, cleanOfferName } from '@/lib/utils'
import { useLang } from '@/lib/lang-context'

interface BestPlan {
  offer: any
  monthlySaving: number
  annualSaving: number
  reductionPct: number
}

export default function SavingsPage() {
  const { t } = useLang()
  const [bill, setBill] = useState(3000)
  const [dataGB, setDataGB] = useState(20)
  // Calls and SMS are binary in the catalogue (DB stores -1 or 0). Toggle pills,
  // identical to the /recommend page so the UX is consistent across both pages.
  const [voiceMinutes, setVoiceMinutes] = useState(0) // 0 = no preference, -1 = unlimited
  const [smsCount, setSmsCount] = useState(0)         // 0 = no preference, -1 = unlimited
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<BestPlan | null>(null)
  const [status, setStatus] = useState<'idle' | 'saving' | 'optimal' | 'nomatch'>('idle')

  const calculate = useCallback(async (b: number, d: number, v: number, s: number) => {
    setLoading(true)
    try {
      const res = await fetch('/api/recommendations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ budget: b, dataGB: d, voiceMinutes: v, smsCount: s }),
      })
      const data = await res.json()
      const best = data.recommendations?.[0]
      if (!best) {
        setResult(null)
        setStatus('nomatch')
        return
      }
      const monthlySaving = Math.max(0, b - best.offer.priceDA)
      if (monthlySaving <= 0) {
        setResult(null)
        setStatus('optimal')
        return
      }
      setResult({
        offer: best.offer,
        monthlySaving,
        annualSaving: monthlySaving * 12,
        reductionPct: Math.round((monthlySaving / b) * 100),
      })
      setStatus('saving')
    } catch {
      setResult(null)
      setStatus('nomatch')
    } finally {
      setLoading(false)
    }
  }, [])

  // Debounced recalculation on any input change
  useEffect(() => {
    const id = setTimeout(() => calculate(bill, dataGB, voiceMinutes, smsCount), 400)
    return () => clearTimeout(id)
  }, [bill, dataGB, voiceMinutes, smsCount, calculate])

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-page)', padding: '2.5rem 1.5rem 4rem' }}>
      <div style={{ maxWidth: 720, margin: '0 auto' }}>

        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: '2.5rem' }}>
          <div style={{
            width: 56, height: 56, borderRadius: 16, margin: '0 auto 1rem',
            background: 'var(--accent-muted)', border: '1px solid var(--accent-border)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <PiggyBank size={28} style={{ color: 'var(--accent)' }} />
          </div>
          <h1 className="section-title" style={{ marginBottom: 8 }}>
            {t('savings.title')} <span style={{ color: 'var(--accent)' }}>{t('savings.titleHighlight')}</span>
          </h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: 14, maxWidth: 460, margin: '0 auto' }}>
            {t('savings.subtitle')}
          </p>
        </div>

        {/* Input card */}
        <div className="card" style={{ padding: '1.75rem', marginBottom: '1.5rem' }}>
          {/* Current bill */}
          <div style={{ marginBottom: '1.5rem' }}>
            <label style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-secondary)', display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
              <span>{t('savings.currentBill')}</span>
              <strong style={{ color: 'var(--accent)', fontSize: 15 }}>{formatDA(bill)}</strong>
            </label>
            <input type="range" min={200} max={10000} step={100} value={bill}
              onChange={e => setBill(+e.target.value)}
              style={{ width: '100%', '--fill': `${((bill - 200) / 9800 * 100).toFixed(1)}%` } as React.CSSProperties} />
          </div>

          {/* Data need */}
          <div style={{ marginBottom: '1.5rem' }}>
            <label style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-secondary)', display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}><Wifi size={14} /> {t('savings.dataNeed')}</span>
              <strong style={{ color: 'var(--text-primary)', fontSize: 15 }}>{dataGB} GB</strong>
            </label>
            <input type="range" min={0} max={150} step={1} value={dataGB}
              onChange={e => setDataGB(+e.target.value)}
              style={{ width: '100%', '--fill': `${(dataGB / 150 * 100).toFixed(1)}%` } as React.CSSProperties} />
          </div>

          {/* Calls preference — binary toggle, mirrors /recommend */}
          <div style={{ marginBottom: '1.5rem' }}>
            <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.05em', display: 'flex', alignItems: 'center', gap: 5 }}>
              <Phone size={12} /> {t('recommend.priority.calls')}
            </div>
            <div style={{ display: 'flex', gap: 6 }}>
              {[{ v: 0, label: t('common.noPreference') }, { v: -1, label: t('common.unlimited') }].map(o => (
                <button
                  key={o.v}
                  onClick={() => setVoiceMinutes(o.v)}
                  className={`filter-pill ${voiceMinutes === o.v ? 'active' : ''}`}
                  style={{ fontSize: 12 }}
                  type="button"
                >
                  {o.label}
                </button>
              ))}
            </div>
          </div>

          {/* SMS preference — binary toggle, mirrors /recommend */}
          <div>
            <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.05em', display: 'flex', alignItems: 'center', gap: 5 }}>
              <MessageSquare size={12} /> {t('recommend.priority.sms')}
            </div>
            <div style={{ display: 'flex', gap: 6 }}>
              {[{ v: 0, label: t('common.noPreference') }, { v: -1, label: t('common.unlimited') }].map(o => (
                <button
                  key={o.v}
                  onClick={() => setSmsCount(o.v)}
                  className={`filter-pill ${smsCount === o.v ? 'active' : ''}`}
                  style={{ fontSize: 12 }}
                  type="button"
                >
                  {o.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Result */}
        {loading && (
          <div style={{ textAlign: 'center', padding: '2rem' }}>
            <Loader2 size={28} style={{ animation: 'spin 1s linear infinite', color: 'var(--accent)' }} />
          </div>
        )}

        {!loading && status === 'saving' && result && (
          <motion.div
            key={result.offer.id}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
            className="card"
            style={{ padding: '2rem', textAlign: 'center', border: '2px solid var(--accent-border)' }}
          >
            <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: 0.6, marginBottom: 8 }}>
              {t('savings.resultTitle')}
            </div>
            <div style={{ fontSize: '2.75rem', fontWeight: 900, color: 'var(--color-success)', lineHeight: 1.1 }}>
              {formatDA(result.annualSaving)}
            </div>
            <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: '1.25rem' }}>{t('savings.perYear')}</div>

            <div style={{ display: 'flex', justifyContent: 'center', gap: '1.5rem', flexWrap: 'wrap', marginBottom: '1.5rem' }}>
              <div>
                <div style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--text-primary)' }}>{formatDA(result.monthlySaving)}</div>
                <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{t('savings.perMonth')}</div>
              </div>
              <div>
                <div style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--color-success)', display: 'flex', alignItems: 'center', gap: 4 }}>
                  <TrendingDown size={18} /> {result.reductionPct}%
                </div>
                <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{t('savings.reduction')}</div>
              </div>
            </div>

            {/* Recommended plan */}
            <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: 0.6, marginBottom: 10 }}>
              {t('savings.bestPlan')}
            </div>
            <Link href={`/offers/${result.offer.id}`} style={{ textDecoration: 'none' }}>
              <div style={{
                display: 'flex', alignItems: 'center', gap: 12, padding: '1rem',
                background: 'var(--bg-subtle)', border: '1px solid var(--border-base)',
                borderRadius: 'var(--radius-md)', textAlign: 'left',
              }}>
                <div style={{
                  width: 40, height: 40, borderRadius: 10, flexShrink: 0, background: 'var(--bg-elevated)',
                  border: '1px solid var(--border-base)', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden',
                }}>
                  {OPERATOR_LOGOS[result.offer.operator?.slug]
                    ? <img src={OPERATOR_LOGOS[result.offer.operator.slug]} alt={result.offer.operator.name} style={{ width: '75%', height: '75%', objectFit: 'contain' }} />
                    : <Signal size={18} color="var(--text-muted)" />}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>{result.offer.operator?.name}</div>
                  <div style={{ fontSize: 14, fontWeight: 800, color: 'var(--text-primary)' }}>{cleanOfferName(result.offer.name)}</div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: 16, fontWeight: 900, color: 'var(--accent)' }}>{formatDA(result.offer.priceDA)}</div>
                  <div style={{ fontSize: 11, color: 'var(--accent)', display: 'flex', alignItems: 'center', gap: 3, justifyContent: 'flex-end' }}>
                    {t('savings.viewPlan')} <ArrowRight size={11} />
                  </div>
                </div>
              </div>
            </Link>
          </motion.div>
        )}

        {!loading && status === 'optimal' && (
          <div className="card" style={{ padding: '2rem', textAlign: 'center' }}>
            <p style={{ fontSize: 14, color: 'var(--text-secondary)' }}>{t('savings.alreadyOptimal')}</p>
          </div>
        )}

        {!loading && status === 'nomatch' && (
          <div className="card" style={{ padding: '2rem', textAlign: 'center' }}>
            <p style={{ fontSize: 14, color: 'var(--text-secondary)' }}>{t('savings.noMatch')}</p>
          </div>
        )}
      </div>
    </div>
  )
}
