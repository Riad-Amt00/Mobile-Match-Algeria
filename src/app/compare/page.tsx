'use client'

import { useState, useEffect, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import {
  ArrowLeft, X, Check, BarChart2, Table2, Wifi, Phone,
  MessageSquare, Calendar, Star, ExternalLink,
} from 'lucide-react'
import {
  RadarChart, Radar, PolarGrid, PolarAngleAxis,
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis,
  Tooltip, CartesianGrid, Legend,
} from 'recharts'
import { formatDA, formatData, formatMinutes, formatSms, formatValidity, getOperatorColor } from '@/lib/utils'

/* ── helpers ─────────────────────────────────────────────────────────────── */
function normalize(val: number, max: number) {
  if (val === -1) return 100          // unlimited → full score
  if (!max || max === 0) return 0
  return Math.round((val / max) * 100)
}

function buildRadarData(offers: any[]) {
  if (offers.length === 0) return []
  const maxData  = Math.max(...offers.map(o => o.dataGB))
  const maxVoice = Math.max(...offers.map(o => o.voiceMinutes === -1 ? 9999 : o.voiceMinutes))
  const maxSms   = Math.max(...offers.map(o => o.smsCount   === -1 ? 9999 : o.smsCount))
  const maxVal   = Math.max(...offers.map(o => o.validityDays))
  const minPrice = Math.min(...offers.map(o => o.priceDA))

  const metrics = [
    { label: 'Data',     keyFn: (o: any) => normalize(o.dataGB, maxData) },
    { label: 'Appels',   keyFn: (o: any) => normalize(o.voiceMinutes === -1 ? 9999 : o.voiceMinutes, maxVoice) },
    { label: 'SMS',      keyFn: (o: any) => normalize(o.smsCount === -1 ? 9999 : o.smsCount, maxSms) },
    { label: 'Validité', keyFn: (o: any) => normalize(o.validityDays, maxVal) },
    { label: 'Prix',     keyFn: (o: any) => Math.round((minPrice / o.priceDA) * 100) },
  ]

  return metrics.map(m => {
    const row: any = { metric: m.label }
    offers.forEach(o => { row[o.name] = m.keyFn(o) })
    return row
  })
}

function buildBarData(offers: any[]) {
  return [
    { label: 'DA', ...Object.fromEntries(offers.map(o => [o.name, o.priceDA])) },
    { label: 'GB', ...Object.fromEntries(offers.map(o => [o.name, o.dataGB === -1 ? 999 : o.dataGB])) },
  ]
}

/* ── custom tooltip ──────────────────────────────────────────────────────── */
function CustomTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null
  return (
    <div style={{ background: '#1a1f35', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 10, padding: '0.75rem 1rem', fontSize: 13 }}>
      <div style={{ fontWeight: 700, marginBottom: 4, color: 'white' }}>{label}</div>
      {payload.map((p: any, i: number) => (
        <div key={i} style={{ color: p.color, marginTop: 2 }}>{p.name}: {p.value}</div>
      ))}
    </div>
  )
}

/* ── main component ──────────────────────────────────────────────────────── */
function CompareContent() {
  const searchParams = useSearchParams()
  const [offers, setOffers] = useState<any[]>([])
  const [allOffers, setAllOffers] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [view, setView] = useState<'table' | 'chart'>('table')

  useEffect(() => {
    async function load() {
      const res = await fetch('/api/offers')
      const data = await res.json()
      setAllOffers(data.offers || [])
      const ids = searchParams.get('ids')?.split(',').filter(Boolean) || []
      if (ids.length > 0) {
        const selected = (data.offers || []).filter((o: any) => ids.includes(o.id))
        setOffers(selected.slice(0, 3))
      } else if (data.offers?.length >= 2) {
        setOffers(data.offers.slice(0, 3))
      }
      setLoading(false)
    }
    load()
  }, [searchParams])

  const addOffer  = (id: string) => {
    if (offers.length >= 3) return
    const o = allOffers.find(o => o.id === id)
    if (o && !offers.find(s => s.id === id)) setOffers([...offers, o])
  }
  const removeOffer = (id: string) => setOffers(offers.filter(o => o.id !== id))

  /* spec rows */
  const specs = [
    { key: 'priceDA',      label: '💰 Prix',     format: (v: any) => formatDA(v),         best: 'min' as const },
    { key: 'dataGB',       label: '📶 Data',     format: (v: any) => formatData(v),       best: 'max' as const },
    { key: 'voiceMinutes', label: '📞 Appels',   format: (v: any) => formatMinutes(v),    best: 'max' as const },
    { key: 'smsCount',     label: '💬 SMS',      format: (v: any) => formatSms(v),        best: 'max' as const },
    { key: 'validityDays', label: '📅 Validité', format: (v: any) => formatValidity(v),  best: 'max' as const },
    { key: 'network',      label: '🌐 Réseau',   format: (v: any) => v,                  best: null },
    { key: 'type',         label: '📋 Type',     format: (v: any) => ({ PREPAID: 'Prépayé', POSTPAID: 'Postpayé', DATA_ONLY: 'Internet' }[v as string] || v), best: null },
  ]

  const getBestIdx = (spec: typeof specs[0]): number => {
    if (!spec.best || offers.length < 2) return -1
    const vals = offers.map(o => o[spec.key] as number)
    if (spec.best === 'min') return vals.indexOf(Math.min(...vals))
    const filtered = vals.map(v => v === -1 ? 999999 : v)
    return filtered.indexOf(Math.max(...filtered))
  }

  /* colours per slot */
  const SLOT_COLORS = ['#4f7fff', '#f472b6', '#34d399']

  const radarData = buildRadarData(offers)
  const barData   = buildBarData(offers)

  /* ─────────────────────────────────────────────────────────────────────── */
  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-dark)', padding: '2rem 1.5rem' }}>
      <div style={{ maxWidth: 1120, margin: '0 auto' }}>

        {/* Back */}
        <Link href="/" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, color: 'var(--text-secondary)', textDecoration: 'none', fontSize: 14, marginBottom: '2rem' }}>
          <ArrowLeft size={16}/> Retour
        </Link>

        {/* Page header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '2rem', flexWrap: 'wrap', gap: '1rem' }}>
          <div>
            <h1 style={{ fontSize: '1.75rem', fontWeight: 900, marginBottom: 4 }}>
              Comparaison <span className="gradient-text">côte à côte</span>
            </h1>
            <p style={{ color: 'var(--text-secondary)', fontSize: 14 }}>
              Comparez jusqu'à 3 offres — tableau + graphiques interactifs
            </p>
          </div>

          {/* View toggle */}
          <div style={{ display: 'flex', gap: 4, background: 'rgba(255,255,255,0.05)', borderRadius: 10, padding: 4 }}>
            {[
              { id: 'table', icon: <Table2 size={14}/>, label: 'Tableau' },
              { id: 'chart', icon: <BarChart2 size={14}/>, label: 'Graphiques' },
            ].map(v => (
              <button
                key={v.id}
                onClick={() => setView(v.id as 'table' | 'chart')}
                style={{
                  display: 'flex', alignItems: 'center', gap: 5, padding: '0.45rem 0.85rem',
                  borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: 'pointer',
                  border: 'none', transition: 'all .2s',
                  background: view === v.id ? 'rgba(79,127,255,0.25)' : 'transparent',
                  color: view === v.id ? '#6b93ff' : 'var(--text-secondary)',
                }}
              >
                {v.icon} {v.label}
              </button>
            ))}
          </div>
        </div>

        {loading ? (
          <div style={{ textAlign: 'center', padding: '5rem', color: 'var(--text-secondary)' }}>
            <div style={{ width: 36, height: 36, border: '3px solid rgba(79,127,255,0.3)', borderTopColor: '#4f7fff', borderRadius: '50%', animation: 'spin 0.8s linear infinite', margin: '0 auto 1rem' }}/>
            Chargement des offres...
          </div>
        ) : (
          <>
            {/* ── OFFER HEADERS (always visible) ── */}
            <div style={{ display: 'grid', gridTemplateColumns: '160px repeat(3, 1fr)', gap: '0.5rem', marginBottom: '0.5rem' }}>
              <div/>
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i}>
                  {offers[i] ? (
                    <div className="glass" style={{ borderRadius: 16, padding: '1rem 1rem 0.875rem', position: 'relative', borderTop: `3px solid ${getOperatorColor(offers[i].operator.slug)}` }}>
                      <button
                        onClick={() => removeOffer(offers[i].id)}
                        style={{ position: 'absolute', top: 8, right: 8, background: 'rgba(255,255,255,0.07)', border: 'none', borderRadius: 6, cursor: 'pointer', padding: 4, color: 'var(--text-secondary)', display: 'flex' }}
                      >
                        <X size={13}/>
                      </button>
                      <div style={{ fontSize: 11, color: getOperatorColor(offers[i].operator.slug), fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 4 }}>
                        {offers[i].operator.name}
                      </div>
                      <div style={{ fontSize: '0.9375rem', fontWeight: 800, lineHeight: 1.3, marginBottom: 8 }}>
                        {offers[i].name}
                      </div>
                      <div style={{ fontSize: '1.25rem', fontWeight: 900, color: '#6b93ff' }}>
                        {formatDA(offers[i].priceDA)}
                      </div>
                      <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginTop: 2 }}>
                        / {formatValidity(offers[i].validityDays)}
                      </div>
                    </div>
                  ) : (
                    <div className="glass" style={{ borderRadius: 16, padding: '1rem', border: '1px dashed rgba(255,255,255,0.12)', minHeight: 100, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                      <Star size={18} style={{ opacity: 0.3 }}/>
                      <div style={{ color: 'var(--text-secondary)', fontSize: 12 }}>Ajouter une offre</div>
                      <select
                        onChange={e => { if (e.target.value) addOffer(e.target.value); e.target.value = '' }}
                        style={{ background: 'rgba(255,255,255,0.07)', border: '1px solid var(--border)', borderRadius: 6, color: 'var(--text-primary)', fontSize: 11, padding: '0.3rem 0.5rem', width: '100%', outline: 'none', cursor: 'pointer', fontFamily: 'inherit' }}
                      >
                        <option value="">Choisir...</option>
                        {allOffers.filter(o => !offers.find(s => s.id === o.id)).map(o => (
                          <option key={o.id} value={o.id}>{o.operator.name} — {o.name} ({formatDA(o.priceDA)})</option>
                        ))}
                      </select>
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* ── TABLE VIEW ── */}
            {view === 'table' && (
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'separate', borderSpacing: '0 3px' }}>
                  <tbody>
                    {specs.map((spec, si) => {
                      const bestIdx = getBestIdx(spec)
                      return (
                        <tr key={si}>
                          <td style={{ width: 160, padding: '0.625rem 0.75rem', fontSize: 13, fontWeight: 600, color: 'var(--text-secondary)', whiteSpace: 'nowrap' }}>
                            {spec.label}
                          </td>
                          {Array.from({ length: 3 }).map((_, ci) => (
                            <td key={ci} style={{ padding: '0.25rem 0.5rem' }}>
                              {offers[ci] ? (
                                <div style={{
                                  padding: '0.65rem 0.875rem', borderRadius: 10,
                                  background: bestIdx === ci ? 'rgba(79,127,255,0.12)' : 'rgba(255,255,255,0.04)',
                                  border: `1px solid ${bestIdx === ci ? 'rgba(79,127,255,0.35)' : 'rgba(255,255,255,0.07)'}`,
                                  fontSize: 14, fontWeight: bestIdx === ci ? 700 : 500,
                                  color: bestIdx === ci ? '#6b93ff' : 'var(--text-primary)',
                                  display: 'flex', alignItems: 'center', gap: 6, transition: 'all .15s',
                                }}>
                                  {bestIdx === ci && <Check size={13} style={{ color: '#6b93ff', flexShrink: 0 }}/>}
                                  {spec.format(offers[ci][spec.key])}
                                </div>
                              ) : (
                                <div style={{ padding: '0.65rem 0.875rem', borderRadius: 10, background: 'rgba(255,255,255,0.02)', border: '1px dashed rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.2)', fontSize: 14 }}>—</div>
                              )}
                            </td>
                          ))}
                        </tr>
                      )
                    })}

                    {/* Features */}
                    <tr>
                      <td style={{ padding: '0.625rem 0.75rem', fontSize: 13, fontWeight: 600, color: 'var(--text-secondary)', verticalAlign: 'top' }}>
                        ✨ Avantages
                      </td>
                      {Array.from({ length: 3 }).map((_, ci) => (
                        <td key={ci} style={{ padding: '0.25rem 0.5rem' }}>
                          {offers[ci] ? (
                            <div style={{ padding: '0.75rem 0.875rem', borderRadius: 10, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)' }}>
                              {JSON.parse(offers[ci].features || '[]').slice(0, 4).map((f: string, fi: number) => (
                                <div key={fi} style={{ fontSize: 12, color: '#4ade80', display: 'flex', alignItems: 'center', gap: 4, marginBottom: fi < 3 ? 4 : 0 }}>
                                  <Check size={10}/> {f}
                                </div>
                              ))}
                            </div>
                          ) : (
                            <div style={{ padding: '0.75rem 0.875rem', borderRadius: 10, background: 'rgba(255,255,255,0.02)', border: '1px dashed rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.2)', fontSize: 14 }}>—</div>
                          )}
                        </td>
                      ))}
                    </tr>

                    {/* CTA */}
                    <tr>
                      <td/>
                      {Array.from({ length: 3 }).map((_, ci) => (
                        <td key={ci} style={{ padding: '0.75rem 0.5rem' }}>
                          {offers[ci] && (
                            <a
                              href={offers[ci].sourceUrl || '#'}
                              target="_blank" rel="noopener noreferrer"
                              style={{
                                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                                padding: '0.7rem', borderRadius: 10, textAlign: 'center',
                                background: `linear-gradient(135deg, ${getOperatorColor(offers[ci].operator.slug)}, ${getOperatorColor(offers[ci].operator.slug)}bb)`,
                                color: 'white', textDecoration: 'none', fontSize: 13, fontWeight: 700,
                              }}
                            >
                              <ExternalLink size={13}/> Voir chez {offers[ci].operator.name}
                            </a>
                          )}
                        </td>
                      ))}
                    </tr>
                  </tbody>
                </table>
              </div>
            )}

            {/* ── CHART VIEW ── */}
            {view === 'chart' && offers.length >= 2 && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>

                {/* Radar chart */}
                <div className="glass" style={{ borderRadius: 16, padding: '1.5rem' }}>
                  <h3 style={{ fontSize: '0.9375rem', fontWeight: 700, marginBottom: '1.25rem', display: 'flex', alignItems: 'center', gap: 8 }}>
                    <BarChart2 size={16} style={{ color: '#6b93ff' }}/> Score multi-critères (sur 100)
                  </h3>
                  <ResponsiveContainer width="100%" height={280}>
                    <RadarChart data={radarData} margin={{ top: 10, right: 30, bottom: 10, left: 30 }}>
                      <PolarGrid stroke="rgba(255,255,255,0.1)" radialLines={false}/>
                      <PolarAngleAxis dataKey="metric" tick={{ fill: 'rgba(255,255,255,0.6)', fontSize: 12 }}/>
                      {offers.map((o, i) => (
                        <Radar
                          key={o.id}
                          name={o.name}
                          dataKey={o.name}
                          stroke={SLOT_COLORS[i]}
                          fill={SLOT_COLORS[i]}
                          fillOpacity={0.15}
                          strokeWidth={2}
                        />
                      ))}
                      <Legend
                        formatter={(value: string) => <span style={{ color: 'rgba(255,255,255,0.8)', fontSize: 12 }}>{value}</span>}
                      />
                    </RadarChart>
                  </ResponsiveContainer>
                </div>

                {/* Price bar chart */}
                <div className="glass" style={{ borderRadius: 16, padding: '1.5rem' }}>
                  <h3 style={{ fontSize: '0.9375rem', fontWeight: 700, marginBottom: '1.25rem' }}>
                    💰 Prix et Data comparés
                  </h3>
                  <ResponsiveContainer width="100%" height={220}>
                    <BarChart data={[
                      { label: 'Prix (DA)', ...Object.fromEntries(offers.map(o => [o.name, o.priceDA])) },
                      { label: 'Data (GB)', ...Object.fromEntries(offers.map(o => [o.name, o.dataGB === -1 ? 0 : o.dataGB])) },
                    ]} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.07)" vertical={false}/>
                      <XAxis dataKey="label" tick={{ fill: 'rgba(255,255,255,0.6)', fontSize: 12 }}/>
                      <YAxis tick={{ fill: 'rgba(255,255,255,0.5)', fontSize: 11 }}/>
                      <Tooltip content={<CustomTooltip/>}/>
                      <Legend formatter={(value) => <span style={{ color: 'rgba(255,255,255,0.8)', fontSize: 12 }}>{value}</span>}/>
                      {offers.map((o, i) => (
                        <Bar key={o.id} dataKey={o.name} fill={SLOT_COLORS[i]} radius={[4, 4, 0, 0]}/>
                      ))}
                    </BarChart>
                  </ResponsiveContainer>
                </div>

                {/* Value score cards */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
                  {offers.map((o, i) => {
                    const gbPerDA = o.dataGB > 0 ? (o.dataGB / o.priceDA * 1000).toFixed(1) : '∞'
                    return (
                      <div key={o.id} className="glass" style={{ borderRadius: 14, padding: '1.25rem', borderTop: `2px solid ${SLOT_COLORS[i]}` }}>
                        <div style={{ fontSize: 11, fontWeight: 700, color: SLOT_COLORS[i], textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 6 }}>
                          {o.operator.name}
                        </div>
                        <div style={{ fontSize: '0.875rem', fontWeight: 700, marginBottom: '0.875rem' }}>{o.name}</div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12 }}>
                            <span style={{ color: 'var(--text-secondary)' }}>MB / DA</span>
                            <span style={{ fontWeight: 700, color: '#4ade80' }}>{gbPerDA} MB</span>
                          </div>
                          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12 }}>
                            <span style={{ color: 'var(--text-secondary)' }}>Prix / jour</span>
                            <span style={{ fontWeight: 700 }}>{Math.round(o.priceDA / o.validityDays)} DA</span>
                          </div>
                          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12 }}>
                            <span style={{ color: 'var(--text-secondary)' }}>Réseau</span>
                            <span style={{ fontWeight: 700, color: o.network.includes('5G') ? '#a78bfa' : 'var(--text-primary)' }}>{o.network}</span>
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}

            {view === 'chart' && offers.length < 2 && (
              <div className="glass" style={{ borderRadius: 16, padding: '3rem', textAlign: 'center', color: 'var(--text-secondary)' }}>
                <BarChart2 size={36} style={{ opacity: 0.3, marginBottom: '0.75rem' }}/>
                <p>Ajoutez au moins 2 offres pour afficher les graphiques</p>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}

export default function ComparePage() {
  return (
    <Suspense fallback={
      <div style={{ minHeight: '100vh', background: 'var(--bg-dark)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-secondary)' }}>
        <div style={{ width: 32, height: 32, border: '3px solid rgba(79,127,255,0.3)', borderTopColor: '#4f7fff', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }}/>
      </div>
    }>
      <CompareContent/>
    </Suspense>
  )
}
