'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { motion } from 'framer-motion'
import {
  ArrowLeft, X, Wifi, Phone, MessageSquare, Calendar, Plus, Zap,
  CreditCard, DollarSign, Signal, Building2, Trophy, BarChart3,
} from 'lucide-react'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, LabelList } from 'recharts'
import { formatDA, formatData, formatMinutes, formatCalls, formatSmsScoped, formatValidity, getNetworkStyle, OPERATOR_LOGOS, cleanOfferName, RANK_GRADIENTS, RANK_COLORS } from '@/lib/utils'
import { useLang } from '@/lib/lang-context'
import type { TKey } from '@/lib/i18n'

// One comparative bar chart — offers on the X axis, a single metric on the Y axis.
// Each offer keeps its own colour across all three charts so a bar can be traced
// back to the same plan at a glance. The best performer for the metric stays at
// full opacity while the rest are slightly dimmed.
function MiniChart({ title, data, betterWhen, colors }: {
  title: string
  data: { name: string; value: number; label: string }[]
  betterWhen: 'low' | 'high'
  colors: string[]
}) {
  const values = data.map(d => d.value)
  const best = betterWhen === 'low' ? Math.min(...values) : Math.max(...values)
  return (
    <div style={{ flex: 1, minWidth: 220 }}>
      <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-secondary)', textAlign: 'center', marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.5 }}>
        {title}
      </div>
      <ResponsiveContainer width="100%" height={180}>
        <BarChart data={data} margin={{ top: 22, right: 8, bottom: 4, left: 8 }}>
          <XAxis dataKey="name" tick={{ fontSize: 10, fill: 'var(--text-muted)' }} interval={0} />
          <YAxis hide domain={[0, 'dataMax']} />
          <Tooltip
            cursor={{ fill: 'var(--bg-subtle)' }}
            formatter={(_v: any, _n: any, p: any) => [p?.payload?.label ?? '', '']}
            contentStyle={{ fontSize: 12, borderRadius: 8, border: '1px solid var(--border-base)', background: 'var(--bg-elevated)' }}
            labelStyle={{ fontWeight: 700 }}
          />
          <Bar dataKey="value" radius={[4, 4, 0, 0]}>
            {data.map((d, i) => (
              <Cell key={i} fill={colors[i] ?? 'var(--accent)'} fillOpacity={d.value === best ? 1 : 0.5} />
            ))}
            <LabelList dataKey="label" position="top" style={{ fontSize: 10, fontWeight: 700, fill: 'var(--text-secondary)' }} />
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}

const RANK_LABELS = ['🥇', '🥈', '🥉']
const RANK_BORDER = ['#F59E0B', '#94A3B8', '#CD7C3E']

// Distinct per-slot colours for a normal (non-ranked) comparison — offer #1 / #2 / #3.
// In a recommendation comparison the ranking palette (gold/silver/bronze) is used instead.
const SLOT_COLORS = ['#6366F1', '#10B981', '#F43F5E']

function RankBadge({ index }: { index: number }) {
  return (
    <div style={{
      width: 28, height: 28, borderRadius: '50%',
      background: RANK_GRADIENTS[index] ?? 'var(--accent-muted)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontSize: 14, flexShrink: 0,
      boxShadow: `0 2px 8px ${RANK_COLORS[index] ?? '#818CF8'}50`,
    }}>
      {RANK_LABELS[index] ?? `#${index + 1}`}
    </div>
  )
}

interface Props {
  initialIds: string
  fromRecommend: boolean
  fromSaved?: boolean
}

export default function CompareContent({ initialIds, fromRecommend, fromSaved }: Props) {
  const { t } = useLang()
  const [offers, setOffers] = useState<any[]>([])
  const [allOffers, setAllOffers] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [picker, setPicker] = useState<{ slot: number; operator: string | null } | null>(null)
  // Monthly budget from the user's saved profile — only fetched when the user
  // arrives from /recommend, since that's the only context where the savings
  // chart is shown.
  const [budget, setBudget] = useState<number | null>(null)

  useEffect(() => {
    const ids = initialIds.split(',').filter(Boolean)
    setLoading(true)
    setOffers([])
    Promise.all([
      // limit=500 → the whole catalogue, so the picker lists every offer per
      // operator (the default 24-item page previously hid most of them).
      fetch('/api/offers?limit=500').then(r => r.json()),
      ids.length > 0
        ? fetch(`/api/offers?ids=${encodeURIComponent(initialIds)}`).then(r => r.json())
        : Promise.resolve({ offers: [] }),
    ]).then(([allData, selectedData]) => {
      setAllOffers(allData.offers || [])
      if ((selectedData.offers || []).length > 0) setOffers(selectedData.offers.slice(0, 3))
      setLoading(false)
    }).catch(() => setLoading(false))
  }, [initialIds])

  useEffect(() => {
    if (!fromRecommend) return
    fetch('/api/profile')
      .then(r => (r.ok ? r.json() : null))
      .then(d => {
        const b = d?.profile?.monthlyBudget
        if (typeof b === 'number' && b > 0) setBudget(b)
      })
      .catch(() => {})
  }, [fromRecommend])

  const addOffer = (id: string) => {
    if (offers.length >= 3) return
    const o = allOffers.find(o => o.id === id)
    if (o && !offers.find(s => s.id === id)) setOffers([...offers, o])
  }
  const removeOffer = (id: string) => setOffers(offers.filter(o => o.id !== id))

  const typeMap: Record<string, TKey> = { PREPAID: 'type.prepaid', POSTPAID: 'type.postpaid', DATA_ONLY: 'type.dataOnly' }

  const specs: { key: string; icon: any; label: string; format: (v: any, o?: any) => string }[] = [
    { key: 'type',         icon: <CreditCard size={16} />,    label: t('compare.type'),     format: (v: any) => t(typeMap[v as string] ?? 'type.standard') },
    { key: 'priceDA',      icon: <DollarSign size={16} />,    label: t('compare.price'),    format: (v: any) => formatDA(v) },
    { key: 'dataGB',       icon: <Wifi size={16} />,          label: t('compare.data'),     format: (v: any) => formatData(v, t) },
    { key: 'voiceMinutes', icon: <Phone size={16} />,         label: t('compare.calls'),    format: (_v: any, o: any) => formatCalls(o, t) },
    { key: 'smsCount',     icon: <MessageSquare size={16} />, label: t('compare.sms'),      format: (_v: any, o: any) => formatSmsScoped(o, t) },
    { key: 'validityDays', icon: <Calendar size={16} />,      label: t('compare.validity'), format: (v: any) => formatValidity(v, t) },
  ]

  // ── Comparative chart data (built when 2+ offers are selected) ──────────────
  const finiteData = offers.map((o: any) => o.dataGB).filter((d: number) => d > 0)
  const maxFiniteData = finiteData.length ? Math.max(...finiteData) : 50
  const chartName = (o: any) => cleanOfferName(o.name).slice(0, 14)

  const priceChart = offers.map((o: any) => ({
    name: chartName(o), value: o.priceDA, label: formatDA(o.priceDA),
  }))
  const dataChart = offers.map((o: any) => ({
    name: chartName(o),
    value: o.dataGB === -1 ? Math.round(maxFiniteData * 1.15) : o.dataGB,
    // formatData renders sub-1GB volumes as "256 MB" instead of "0.25618 GB".
    label: o.dataGB === -1 ? '∞' : formatData(o.dataGB, t),
  }))
  // Annual savings against the user's monthly budget — only built when the
  // comparison was launched from /recommend (so a budget is available) and
  // shows what each plan would save the user per year if they switched.
  const showSavingsChart = fromRecommend && budget !== null && offers.length >= 2
  const savingsChart = showSavingsChart
    ? offers.map((o: any) => {
        const annualSaving = Math.max(0, (budget! - o.priceDA) * 12)
        return { name: chartName(o), value: annualSaving, label: formatDA(annualSaving) }
      })
    : []
  // Ranked comparison → gold/silver/bronze; normal comparison → distinct per-slot hues.
  const chartColors = fromRecommend ? RANK_COLORS : SLOT_COLORS
  // Per-offer identity colour, reused to tint that offer's whole table column.
  const slotColor = (i: number) => (fromRecommend ? RANK_COLORS[i] : SLOT_COLORS[i]) ?? 'var(--accent)'

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', background: 'var(--bg-page)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ width: 36, height: 36, border: '3px solid var(--accent-muted)', borderTopColor: 'var(--accent)', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
      </div>
    )
  }

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-page)', padding: '2rem 1.5rem 4rem' }}>
      <div style={{ maxWidth: 1100, margin: '0 auto' }}>
        <Link
          href={fromRecommend ? '/recommend' : fromSaved ? '/saved' : '/offers'}
          style={{ display: 'inline-flex', alignItems: 'center', gap: 6, color: 'var(--text-muted)', textDecoration: 'none', fontSize: 13, marginBottom: '2rem' }}
        >
          <ArrowLeft size={14} /> {fromRecommend ? t('compare.backRecommend') : fromSaved ? t('compare.backSaved') : t('compare.back')}
        </Link>

        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: '2.5rem' }}>
          {fromRecommend && (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, marginBottom: '1rem', fontSize: 12, color: 'var(--text-muted)' }}>
              <Link href="/recommend" style={{ color: 'var(--accent)', textDecoration: 'none', fontWeight: 600 }}>{t('compare.breadcrumb')}</Link>
              <span>›</span>
              <span style={{ color: 'var(--text-secondary)' }}>{t('compare.breadcrumbCurrent')}</span>
            </div>
          )}
          <h1 className="section-title" style={{ marginBottom: 8 }}>
            {t('compare.title')} <span style={{ color: 'var(--accent)' }}>{t('compare.titleHighlight')}</span>
          </h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: 14 }}>
            {fromRecommend ? t('compare.subtitleRecommend') : t('compare.subtitleBrowse')}
          </p>
        </div>

        {/* Offer selection slots */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem', marginBottom: '2rem' }}>
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i}>
              {offers[i] ? (
                <div className="card" style={{
                  padding: '1.5rem', position: 'relative',
                  background: fromRecommend ? `${RANK_COLORS[i]}10` : 'var(--bg-card)',
                  border: fromRecommend ? `2px solid ${RANK_BORDER[i]}` : '1px solid var(--border-base)',
                  overflow: 'hidden',
                }}>
                  {/* Rank color top strip */}
                  {fromRecommend && (
                    <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 5, background: RANK_GRADIENTS[i] ?? 'var(--accent)' }} />
                  )}
                  {fromRecommend && (
                    <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '0.75rem', marginTop: '0.5rem' }}>
                      <RankBadge index={i} />
                    </div>
                  )}
                  <button onClick={() => removeOffer(offers[i].id)}
                    style={{ position: 'absolute', top: 12, right: 12, background: 'var(--bg-subtle)', border: '1px solid var(--border-base)', borderRadius: 8, cursor: 'pointer', padding: 6, color: 'var(--text-secondary)', display: 'flex', transition: 'all .15s' }}>
                    <X size={14} />
                  </button>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: '1rem', marginTop: fromRecommend ? '0.5rem' : 0 }}>
                    <div style={{
                      width: 40, height: 40, borderRadius: 'var(--radius-md)', flexShrink: 0,
                      background: 'var(--bg-subtle)', border: '1px solid var(--border-base)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden',
                    }}>
                      {OPERATOR_LOGOS[offers[i].operator.slug]
                        ? <img src={OPERATOR_LOGOS[offers[i].operator.slug]} alt={offers[i].operator.name} style={{ width: '75%', height: '75%', objectFit: 'contain', borderRadius: 4 }} />
                        : <Signal size={18} color="var(--text-muted)" />}
                    </div>
                    <div>
                      <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: 0.5 }}>
                        {offers[i].operator.name}
                      </div>
                      <div style={{ fontSize: 14, fontWeight: 800, lineHeight: 1.3, color: 'var(--text-primary)' }}>{cleanOfferName(offers[i].name)}</div>
                    </div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: 4 }}>
                    <span style={{ fontSize: '1.75rem', fontWeight: 900, color: 'var(--text-primary)' }}>
                      {offers[i].priceDA.toLocaleString('fr-DZ')}
                    </span>
                    <span style={{ fontSize: 14, color: 'var(--text-secondary)' }}>DA</span>
                    <span style={{ fontSize: 12, color: 'var(--text-muted)', marginLeft: 4 }}>/ {formatValidity(offers[i].validityDays, t)}</span>
                  </div>
                  <div style={{ display: 'flex', gap: 12, marginTop: 8 }}>
                    <span style={{ fontSize: 12, color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: 4 }}>
                      <Wifi size={11} /> {formatData(offers[i].dataGB, t)}
                    </span>
                    <span style={{ fontSize: 12, color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: 4 }}>
                      <Phone size={11} /> {formatMinutes(offers[i].voiceMinutes, t)}
                    </span>
                  </div>
                </div>
              ) : (
                <div style={{
                  background: 'var(--bg-subtle)', borderRadius: 'var(--radius-lg)', padding: '1.25rem',
                  border: '2px dashed var(--border-base)', minHeight: 160,
                }}>
                  {picker?.slot === i && picker.operator ? (
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 10 }}>
                        <button onClick={() => setPicker({ slot: i, operator: null })} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)', padding: 0, fontSize: 18, lineHeight: 1 }}>←</button>
                        <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: 0.5 }}>
                          {picker.operator.charAt(0).toUpperCase() + picker.operator.slice(1)}
                        </span>
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 6, maxHeight: 220, overflowY: 'auto' }}>
                        {allOffers.filter(o => o.operator.slug === picker.operator && !offers.find(s => s.id === o.id)).map(o => (
                          <button key={o.id} onClick={() => { addOffer(o.id); setPicker(null) }} style={{
                            background: 'var(--bg-subtle)', border: '1px solid var(--border-base)', borderRadius: 8,
                            padding: '0.5rem 0.75rem', cursor: 'pointer', textAlign: 'left', fontFamily: 'inherit',
                            transition: 'border-color 0.15s',
                          }}>
                            <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 2 }}>{cleanOfferName(o.name)}</div>
                            <div style={{ fontSize: 11, color: 'var(--text-secondary)', display: 'flex', gap: 8 }}>
                              <span>{formatDA(o.priceDA)}</span>
                              <span>·</span>
                              <span>{formatData(o.dataGB, t)}</span>
                              <span>·</span>
                              <span>{formatMinutes(o.voiceMinutes, t)}</span>
                            </div>
                          </button>
                        ))}
                        {allOffers.filter(o => o.operator.slug === picker.operator && !offers.find(s => s.id === o.id)).length === 0 && (
                          <p style={{ color: 'var(--text-muted)', fontSize: 12, textAlign: 'center', padding: '1rem 0' }}>{t('compare.noOffers')}</p>
                        )}
                      </div>
                    </div>
                  ) : picker?.slot === i ? (
                    <div>
                      <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 10, textAlign: 'center' }}>{t('compare.chooseOperator')}</div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                        {[
                          { slug: 'djezzy', name: 'Djezzy' },
                          { slug: 'ooredoo', name: 'Ooredoo' },
                          { slug: 'mobilis', name: 'Mobilis' },
                        ].map(op => (
                          <button key={op.slug} onClick={() => setPicker({ slot: i, operator: op.slug })} style={{
                            display: 'flex', alignItems: 'center', gap: 10,
                            background: 'var(--bg-subtle)', border: '1px solid var(--border-base)',
                            borderRadius: 'var(--radius-md)', padding: '0.6rem 0.875rem',
                            cursor: 'pointer', fontFamily: 'inherit', transition: 'border-color 0.15s',
                          }}>
                            <div style={{ width: 28, height: 28, borderRadius: 8, background: 'var(--bg-card)', border: '1px solid var(--border-base)', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
                              {OPERATOR_LOGOS[op.slug]
                                ? <img src={OPERATOR_LOGOS[op.slug]} alt={op.name} style={{ width: '75%', height: '75%', objectFit: 'contain' }} />
                                : <Signal size={14} color="var(--text-muted)" />}
                            </div>
                            <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>{op.name}</span>
                            <span style={{ marginLeft: 'auto', color: 'var(--text-muted)', fontSize: 14 }}>›</span>
                          </button>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 10, height: '100%', minHeight: 160 }}>
                      <div style={{ width: 44, height: 44, borderRadius: 'var(--radius-md)', background: 'var(--bg-subtle)', border: '1px solid var(--border-base)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <Plus size={20} style={{ color: 'var(--text-muted)' }} />
                      </div>
                      <div style={{ color: 'var(--text-secondary)', fontSize: 13, fontWeight: 500 }}>{t('compare.addPlan')} #{i + 1}</div>
                      <button onClick={() => setPicker({ slot: i, operator: null })} style={{
                        background: 'var(--accent-muted)', border: '1px solid var(--accent-border)',
                        borderRadius: 8, padding: '0.4rem 1rem', cursor: 'pointer', color: 'var(--accent)',
                        fontSize: 12, fontWeight: 600, fontFamily: 'inherit',
                      }}>
                        {t('compare.choosePlan')}
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Empty state */}
        {offers.length === 0 && (
          <div className="card" style={{ padding: '4rem 2rem', textAlign: 'center' }}>
            <BarChart3 size={40} style={{ color: 'var(--text-muted)', margin: '0 auto 1rem', display: 'block' }} />
            <h3 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: 8, color: 'var(--text-primary)' }}>{t('compare.noPlans')}</h3>
            <p style={{ color: 'var(--text-secondary)', fontSize: 14, marginBottom: '2rem', maxWidth: 380, margin: '0 auto 2rem' }}>
              {t('compare.noPlansDesc')}
            </p>
            <Link href="/offers" className="btn-primary" style={{ textDecoration: 'none', padding: '0.75rem 2rem', display: 'inline-block' }}>
              {t('compare.browseAll')}
            </Link>
          </div>
        )}

        {/* Comparative charts */}
        {offers.length >= 2 && (
          <div className="card" style={{ padding: '1.5rem', marginBottom: '1.5rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: '0.25rem' }}>
              <BarChart3 size={18} style={{ color: 'var(--accent)' }} />
              <h3 style={{ fontSize: 15, fontWeight: 800, color: 'var(--text-primary)' }}>{t('compare.chartTitle')}</h3>
            </div>
            <p style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: '1.25rem' }}>{t('compare.chartHint')}</p>
            <div style={{ display: 'flex', gap: '1.5rem', flexWrap: 'wrap' }}>
              <MiniChart title={t('compare.chartPrice')} data={priceChart} betterWhen="low" colors={chartColors} />
              <MiniChart title={t('compare.chartData')} data={dataChart} betterWhen="high" colors={chartColors} />
              {showSavingsChart && (
                <MiniChart title={t('compare.chartSavings')} data={savingsChart} betterWhen="high" colors={chartColors} />
              )}
            </div>
          </div>
        )}

        {/* Comparison table */}
        {offers.length >= 1 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>

            {/* Column header */}
            <div className="card" style={{ borderRadius: 'var(--radius-md)', overflow: 'hidden' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '140px repeat(3, 1fr)', alignItems: 'stretch' }}>
                <div style={{ padding: '0.875rem 1rem', borderRight: '1px solid var(--border-base)' }} />
                {Array.from({ length: 3 }).map((_, ci) => (
                  <div key={ci} style={{
                    padding: '0.875rem 1.25rem',
                    borderLeft: ci > 0 ? '1px solid var(--border-subtle)' : undefined,
                    borderBottom: offers[ci]
                      ? `5px solid ${slotColor(ci)}`
                      : '5px solid transparent',
                    background: offers[ci] ? `${slotColor(ci)}14` : undefined,
                  }}>
                    {offers[ci] ? (
                      <div>
                        {fromRecommend && (
                          <div style={{ marginBottom: 6 }}>
                            <RankBadge index={ci} />
                          </div>
                        )}
                        <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: 0.5 }}>
                          {offers[ci].operator.name}
                        </div>
                        <div style={{ fontSize: 13, fontWeight: 800, color: 'var(--text-primary)', marginTop: 2, lineHeight: 1.3 }}>
                          {cleanOfferName(offers[ci].name)}
                        </div>
                      </div>
                    ) : (
                      <span style={{ color: 'var(--text-muted)', fontSize: 13 }}>—</span>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Operator row */}
            <motion.div
              className="card"
              style={{ borderRadius: 'var(--radius-md)', overflow: 'hidden' }}
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.25, ease: 'easeOut', delay: 0 }}
            >
              <div style={{ display: 'grid', gridTemplateColumns: '140px repeat(3, 1fr)', alignItems: 'stretch' }}>
                <div style={{ padding: '1rem', display: 'flex', alignItems: 'center', gap: 8, borderRight: '1px solid var(--border-base)' }}>
                  <Building2 size={16} style={{ color: 'var(--text-secondary)' }} />
                  <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)' }}>{t('compare.operator')}</span>
                </div>
                {Array.from({ length: 3 }).map((_, ci) => (
                  <div key={ci} style={{ padding: '1rem 1.25rem', display: 'flex', alignItems: 'center', gap: 10, borderLeft: ci > 0 ? '1px solid var(--border-subtle)' : undefined, background: offers[ci] ? `${slotColor(ci)}14` : undefined }}>
                    {offers[ci] ? (
                      <>
                        <div style={{ width: 32, height: 32, borderRadius: 8, background: 'var(--bg-subtle)', border: '1px solid var(--border-base)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, overflow: 'hidden' }}>
                          {OPERATOR_LOGOS[offers[ci].operator.slug]
                            ? <img src={OPERATOR_LOGOS[offers[ci].operator.slug]} alt={offers[ci].operator.name} style={{ width: '75%', height: '75%', objectFit: 'contain', borderRadius: 4 }} />
                            : <Signal size={14} color="var(--text-muted)" />}
                        </div>
                        <div>
                          <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-secondary)' }}>{offers[ci].operator.name}</div>
                          <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 1 }}>{offers[ci].operator.slug}.dz</div>
                        </div>
                      </>
                    ) : <span style={{ color: 'var(--text-muted)' }}>—</span>}
                  </div>
                ))}
              </div>
            </motion.div>

            {/* Spec rows */}
            {specs.map((spec, si) => (
              <motion.div
                key={si}
                className="card"
                style={{
                  borderRadius: 'var(--radius-md)', overflow: 'hidden',
                  background: si % 2 === 1 ? 'var(--bg-elevated)' : 'var(--bg-card)',
                }}
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.25, ease: 'easeOut', delay: (si + 1) * 0.04 }}
              >
                <div style={{ display: 'grid', gridTemplateColumns: '140px repeat(3, 1fr)', alignItems: 'stretch' }}>
                  <div style={{ padding: '1rem', display: 'flex', alignItems: 'center', gap: 8, borderRight: '1px solid var(--border-base)' }}>
                    <span style={{ color: 'var(--text-secondary)' }}>{spec.icon}</span>
                    <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)' }}>{spec.label}</span>
                  </div>
                  {Array.from({ length: 3 }).map((_, ci) => (
                    <div key={ci} style={{
                      padding: '1rem 1.25rem',
                      display: 'flex', alignItems: 'center', gap: 8,
                      borderLeft: ci > 0 ? '1px solid var(--border-subtle)' : undefined,
                      background: offers[ci] ? `${slotColor(ci)}14` : undefined,
                    }}>
                      {offers[ci] ? (
                        <span style={{ fontSize: 15, fontWeight: 600, color: 'var(--text-primary)' }}>
                          {spec.format(offers[ci][spec.key], offers[ci])}
                        </span>
                      ) : (
                        <span style={{ color: 'var(--text-muted)', fontSize: 14 }}>—</span>
                      )}
                    </div>
                  ))}
                </div>
              </motion.div>
            ))}

            {/* Network row */}
            <motion.div
              className="card"
              style={{ borderRadius: 'var(--radius-md)', overflow: 'hidden' }}
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.25, ease: 'easeOut', delay: (specs.length + 1) * 0.04 }}
            >
              <div style={{ display: 'grid', gridTemplateColumns: '140px repeat(3, 1fr)', alignItems: 'stretch' }}>
                <div style={{ padding: '1rem', display: 'flex', alignItems: 'center', gap: 8, borderRight: '1px solid var(--border-base)' }}>
                  <Signal size={16} style={{ color: 'var(--text-secondary)' }} />
                  <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)' }}>{t('compare.network')}</span>
                </div>
                {Array.from({ length: 3 }).map((_, ci) => (
                  <div key={ci} style={{ padding: '1rem 1.25rem', display: 'flex', alignItems: 'center', gap: 6, borderLeft: ci > 0 ? '1px solid var(--border-subtle)' : undefined, background: offers[ci] ? `${slotColor(ci)}14` : undefined }}>
                    {offers[ci] ? (
                      <span style={{ fontSize: 13, fontWeight: 600, padding: '3px 10px', borderRadius: 'var(--radius-full)', ...getNetworkStyle(offers[ci].network), display: 'flex', alignItems: 'center', gap: 4 }}>
                        <Zap size={10} /> {offers[ci].network}
                      </span>
                    ) : <span style={{ color: 'var(--text-muted)' }}>—</span>}
                  </div>
                ))}
              </div>
            </motion.div>

          </div>
        )}
      </div>
    </div>
  )
}
