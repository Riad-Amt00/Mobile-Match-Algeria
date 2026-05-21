'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import { motion } from 'framer-motion'
import {
  ArrowLeft, Wifi, Phone, MessageSquare, Calendar, Zap,
  CheckCircle, Bookmark, BookmarkCheck, BarChart2,
  Star, TrendingDown, Loader2, Signal, LayoutGrid,
  TrendingUp, AlertCircle, Map, ExternalLink,
} from 'lucide-react'
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { useToast } from '@/components/toast'
import {
  formatDA, formatData, formatMinutes, formatSms, formatValidity,
  getPricePerGB, OPERATOR_LOGOS, COVERAGE_URLS, parseFeatures, cleanOfferName,
} from '@/lib/utils'
import { useLang } from '@/lib/lang-context'

const OPERATOR_URLS: Record<string, string> = {
  djezzy: 'https://www.djezzy.dz/',
  ooredoo: 'https://www.ooredoo.dz/',
  mobilis: 'https://mobilis.dz/',
}

export default function OfferDetailPage() {
  const { t } = useLang()
  const params = useParams()
  const id = params.id as string
  const { data: session } = useSession()
  const router = useRouter()
  const { success, info, error: toastError } = useToast()

  const [offer, setOffer] = useState<any>(null)
  const [similar, setSimilar] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [isSaved, setIsSaved] = useState(false)

  useEffect(() => {
    if (!id) return
    Promise.all([
      fetch(`/api/offers/${id}`).then(r => r.json()),
      fetch('/api/saved-offers').then(r => r.json()).catch(() => ({})),
    ]).then(([offerData, savedData]) => {
      setOffer(offerData.offer)
      setSimilar(offerData.similar || [])
      if (savedData.savedIds) setIsSaved(savedData.savedIds.includes(id))
    }).finally(() => setLoading(false))
  }, [id])

  const toggleSave = async () => {
    if (!session?.user) {
      router.push('/login')
      return
    }
    try {
      const res = await fetch('/api/saved-offers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ offerId: id }),
      })
      const data = await res.json()
      setIsSaved(data.saved)
      data.saved ? success(`${offer?.name ?? ''} ${t('toast.saved')}`) : info(t('toast.removedSaved'))
    } catch {
      toastError(t('toast.updateError'))
    }
  }

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', background: 'var(--bg-page)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ textAlign: 'center' }}>
          <Loader2 size={36} style={{ animation: 'spin 1s linear infinite', color: 'var(--accent)', display: 'block', margin: '0 auto 1rem' }} />
          <p style={{ color: 'var(--text-secondary)', fontSize: 14 }}>{t('detail.loading')}</p>
        </div>
      </div>
    )
  }

  if (!offer) {
    return (
      <div style={{ minHeight: '100vh', background: 'var(--bg-page)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '2rem' }}>
        <div style={{ textAlign: 'center' }}>
          <AlertCircle size={48} style={{ color: 'var(--text-muted)', margin: '0 auto 1rem', display: 'block' }} />
          <h1 style={{ fontSize: '1.5rem', fontWeight: 800, marginBottom: '0.75rem', color: 'var(--text-primary)' }}>{t('detail.notFound')}</h1>
          <p style={{ color: 'var(--text-secondary)', marginBottom: '1.5rem' }}>{t('detail.notFoundDesc')}</p>
          <Link href="/offers" className="btn-primary" style={{ textDecoration: 'none', padding: '0.75rem 1.5rem', display: 'inline-flex', alignItems: 'center', gap: 8 }}>
            <ArrowLeft size={15} /> {t('detail.browseAll')}
          </Link>
        </div>
      </div>
    )
  }

  const slug = offer.operator.slug
  const pricePerGB = getPricePerGB(offer.priceDA, offer.dataGB)
  const typeLabel = ({ PREPAID: t('type.prepaid'), POSTPAID: t('type.postpaid'), DATA_ONLY: t('type.dataOnly') } as Record<string, string>)[offer.type as string] || offer.type
  const is5G = offer.network.includes('5G')

  const specs = [
    { icon: <Wifi size={20} />,          label: t('offer.data'),     value: formatData(offer.dataGB, t) },
    { icon: <Phone size={20} />,         label: t('offer.calls'),    value: formatMinutes(offer.voiceMinutes, t) },
    { icon: <MessageSquare size={20} />, label: t('offer.sms'),      value: formatSms(offer.smsCount, t) },
    { icon: <Calendar size={20} />,      label: t('offer.validity'), value: formatValidity(offer.validityDays, t) },
  ]

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: 'easeOut' }}
      style={{ minHeight: '100vh', background: 'var(--bg-page)', padding: '2rem 1.5rem 4rem' }}
    >
      <div style={{ maxWidth: 900, margin: '0 auto' }}>

        <Link href="/offers" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, color: 'var(--text-secondary)', textDecoration: 'none', fontSize: 14, marginBottom: '2rem' }}>
          <ArrowLeft size={16} /> {t('detail.back')}
        </Link>

        {/* Hero card */}
        <div className="card" style={{ marginBottom: '1.5rem', overflow: 'hidden' }}>
          <div className="card-operator-bar" style={{ background: 'var(--border-base)' }} />

          <div style={{ padding: '2rem', display: 'flex', flexWrap: 'wrap', gap: '2rem', alignItems: 'flex-start', justifyContent: 'space-between' }}>
            {/* Identity */}
            <div style={{ flex: '1 1 320px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: '1rem' }}>
                <div style={{
                  width: 56, height: 56, borderRadius: 16, flexShrink: 0,
                  background: 'var(--bg-subtle)',
                  border: '1px solid var(--border-base)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden',
                }}>
                  {OPERATOR_LOGOS[offer.operator?.slug]
                    ? <img src={OPERATOR_LOGOS[offer.operator.slug]} alt={offer.operator.name} style={{ width: '75%', height: '75%', objectFit: 'contain', borderRadius: 4 }} />
                    : <Signal size={26} color="var(--text-muted)" />}
                </div>
                <div>
                  <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 2 }}>
                    {offer.operator.name}
                  </div>
                  <h1 style={{ fontSize: '1.5rem', fontWeight: 900, lineHeight: 1.2, color: 'var(--text-primary)' }}>{cleanOfferName(offer.name)}</h1>
                </div>
              </div>

              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: '0.75rem' }}>
                <span className={`badge badge-${slug}`}>{offer.operator.name}</span>
                <span style={{ fontSize: 12, padding: '3px 10px', borderRadius: 'var(--radius-full)', background: 'var(--bg-subtle)', border: '1px solid var(--border-base)', color: 'var(--text-secondary)', fontWeight: 600 }}>
                  {typeLabel}
                </span>
                <span style={{ fontSize: 12, padding: '3px 10px', borderRadius: 'var(--radius-full)', background: is5G ? 'rgba(139,92,246,0.12)' : 'var(--accent-muted)', border: `1px solid ${is5G ? 'rgba(139,92,246,0.28)' : 'var(--accent-border)'}`, color: is5G ? '#a78bfa' : 'var(--accent)', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                  <Zap size={10} /> {offer.network}
                </span>
                {offer.isFeatured && (
                  <span style={{ fontSize: 12, padding: '3px 10px', borderRadius: 'var(--radius-full)', background: 'var(--color-warning-muted)', border: '1px solid var(--color-warning-border)', color: 'var(--color-warning)', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                    <Star size={9} /> {t('detail.popular')}
                  </span>
                )}
              </div>

              {COVERAGE_URLS[slug] && (
                <div style={{ marginBottom: '1.5rem' }}>
                  <a
                    href={COVERAGE_URLS[slug]}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 12.5, fontWeight: 600, color: 'var(--accent)', textDecoration: 'none', padding: '4px 10px', borderRadius: 20, background: 'var(--accent-muted)', border: '1px solid var(--accent-border)', transition: 'opacity 0.15s' }}
                    onMouseEnter={e => (e.currentTarget.style.opacity = '0.75')}
                    onMouseLeave={e => (e.currentTarget.style.opacity = '1')}
                  >
                    <Map size={11} /> {t('detail.coverageMap')} <ExternalLink size={10} />
                  </a>
                </div>
              )}

              {/* Price */}
              <div>
                {(() => {
                  const history = offer.priceHistory ?? []
                  const prev = history[1]
                  const hasDrop = prev && prev.priceDA > offer.priceDA
                  const savingPct = hasDrop ? Math.round(((prev.priceDA - offer.priceDA) / prev.priceDA) * 100) : 0
                  return (
                    <>
                      <div style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
                        <span className="price-hero">{offer.priceDA.toLocaleString()}</span>
                        <span style={{ fontSize: '1.125rem', fontWeight: 700, color: 'var(--text-secondary)' }}>DA</span>
                        <span style={{ fontSize: 14, color: 'var(--text-muted)' }}>/ {formatValidity(offer.validityDays, t)}</span>
                      </div>
                      {hasDrop && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 6 }}>
                          <span style={{ fontSize: 12.5, color: 'var(--text-muted)', textDecoration: 'line-through' }}>
                            {t('detail.wasPrice')} {prev.priceDA.toLocaleString()} DA
                          </span>
                          <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--color-success)', background: 'var(--color-success-muted)', border: '1px solid var(--color-success-border)', padding: '1px 7px', borderRadius: 20, display: 'inline-flex', alignItems: 'center', gap: 3 }}>
                            <TrendingDown size={11} /> −{savingPct}% {t('detail.priceDrop')}
                          </span>
                        </div>
                      )}
                    </>
                  )
                })()}
                <div style={{ display: 'flex', gap: '1rem', marginTop: 6, flexWrap: 'wrap' }}>
                  {pricePerGB > 0 && (
                    <span style={{ fontSize: 13, color: 'var(--text-muted)', fontWeight: 500, display: 'flex', alignItems: 'center', gap: 4 }}>
                      <TrendingDown size={13} /> {pricePerGB} DA/GB
                    </span>
                  )}
                  <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>
                    {Math.round(offer.priceDA / offer.validityDays)} {t('detail.perDay')}
                  </span>
                </div>
              </div>
            </div>

            {/* Actions */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, minWidth: 200 }}>
              <button onClick={toggleSave} className="btn-secondary" style={{
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                padding: '0.875rem 1.5rem', fontSize: 14,
                ...(isSaved ? { background: 'var(--accent-muted)', borderColor: 'var(--accent-border)', color: 'var(--accent)' } : {}),
              }}>
                {isSaved ? <BookmarkCheck size={15} /> : <Bookmark size={15} />}
                {isSaved ? t('offer.saved') : t('detail.saveOffer')}
              </button>
              <Link href={`/compare?ids=${id}`} className="btn-secondary" style={{
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                padding: '0.75rem 1.5rem', fontSize: 14, textDecoration: 'none',
                background: 'var(--accent-muted)', borderColor: 'var(--accent-border)', color: 'var(--accent)',
              }}>
                <BarChart2 size={15} /> {t('detail.comparePlan')}
              </Link>
            </div>
          </div>
        </div>

        {/* Detail grid */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1.5rem' }}>
          {/* Plan details */}
          <div className="card" style={{ padding: '1.5rem' }}>
            <h2 style={{ fontSize: '0.9375rem', fontWeight: 800, marginBottom: '1.25rem', display: 'flex', alignItems: 'center', gap: 8, color: 'var(--text-primary)' }}>
              <LayoutGrid size={16} style={{ color: 'var(--accent)' }} /> {t('detail.planDetails')}
            </h2>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
              {specs.map(s => (
                <div key={s.label} style={{ background: 'var(--bg-subtle)', borderRadius: 'var(--radius-md)', padding: '1rem', border: '1px solid var(--border-subtle)' }}>
                  <div style={{ color: 'var(--accent)', marginBottom: 6 }}>{s.icon}</div>
                  <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginBottom: 2, fontWeight: 500 }}>{s.label}</div>
                  <div style={{ fontSize: '1.125rem', fontWeight: 800, color: 'var(--text-primary)' }}>{s.value}</div>
                </div>
              ))}
            </div>
          </div>


          {/* Value metrics */}
          <div className="card" style={{ padding: '1.5rem' }}>
            <h2 style={{ fontSize: '0.9375rem', fontWeight: 800, marginBottom: '1.25rem', display: 'flex', alignItems: 'center', gap: 8, color: 'var(--text-primary)' }}>
              <TrendingUp size={16} style={{ color: 'var(--accent)' }} /> {t('detail.valueMetrics')}
            </h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {[
                { label: t('detail.pricePerDay'), value: `${Math.round(offer.priceDA / offer.validityDays)} DA`, highlight: false },
                { label: t('detail.pricePerGB'), value: pricePerGB > 0 ? `${pricePerGB} DA` : t('common.naValue'), highlight: pricePerGB > 0 },
                { label: t('offer.validity'), value: formatValidity(offer.validityDays, t), highlight: false },
                { label: t('detail.networkType'), value: offer.network, highlight: is5G },
            ].map(m => (
                <div key={m.label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.625rem 0', borderBottom: '1px solid var(--border-subtle)' }}>
                  <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>{m.label}</span>
                  <span style={{ fontSize: 13, fontWeight: 700, color: m.highlight ? 'var(--color-success)' : 'var(--text-primary)' }}>{m.value}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Price history */}
        {(() => {
          const hist = [...(offer.priceHistory ?? [])].reverse() // oldest → newest
          if (hist.length === 0) return null
          const chartData = hist.map((h: any) => ({
            date: new Date(h.recordedAt).toLocaleDateString('fr-DZ', { day: '2-digit', month: 'short' }),
            price: h.priceDA,
          }))
          return (
            <div className="card" style={{ padding: '1.5rem', marginTop: '1.5rem' }}>
              <h2 style={{ fontSize: '0.9375rem', fontWeight: 800, marginBottom: '1.25rem', display: 'flex', alignItems: 'center', gap: 8, color: 'var(--text-primary)' }}>
                <BarChart2 size={16} style={{ color: 'var(--accent)' }} /> {t('detail.priceHistory')}
              </h2>
              {hist.length < 2 ? (
                <p style={{ fontSize: 13, color: 'var(--text-muted)' }}>
                  {t('detail.priceStable')} {chartData[0]?.date}.
                </p>
              ) : (
                <ResponsiveContainer width="100%" height={220}>
                  <LineChart data={chartData} margin={{ top: 8, right: 16, bottom: 4, left: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border-subtle)" />
                    <XAxis dataKey="date" tick={{ fontSize: 11, fill: 'var(--text-muted)' }} />
                    <YAxis tick={{ fontSize: 11, fill: 'var(--text-muted)' }} width={52} unit=" DA" />
                    <Tooltip
                      formatter={(v: any) => [`${Number(v).toLocaleString()} DA`, t('compare.price')]}
                      contentStyle={{ fontSize: 12, borderRadius: 8, border: '1px solid var(--border-base)', background: 'var(--bg-elevated)' }}
                    />
                    <Line type="monotone" dataKey="price" stroke="var(--accent)" strokeWidth={2.5} dot={{ r: 3 }} activeDot={{ r: 5 }} />
                  </LineChart>
                </ResponsiveContainer>
              )}
            </div>
          )
        })()}

        {/* Included features */}
        {(() => {
          const features = parseFeatures(offer.features ?? '[]')
          if (!features.length) return null
          return (
            <div className="card" style={{ padding: '1.5rem', marginTop: '1.5rem' }}>
              <h2 style={{ fontSize: '0.9375rem', fontWeight: 800, marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: 8, color: 'var(--text-primary)' }}>
                <CheckCircle size={16} style={{ color: 'var(--accent)' }} /> {t('detail.includedFeatures')}
              </h2>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                {features.map((f, i) => (
                  <span key={i} style={{
                    fontSize: 12.5, fontWeight: 600, padding: '5px 12px', borderRadius: 20,
                    background: 'var(--bg-subtle)', border: '1px solid var(--border-base)',
                    color: 'var(--text-primary)', display: 'inline-flex', alignItems: 'center', gap: 5,
                  }}>
                    {f}
                  </span>
                ))}
              </div>
            </div>
          )
        })()}

        {/* Similar offers */}
        {similar.length > 0 && (
          <div style={{ marginTop: '2.5rem' }}>
            <h2 style={{ fontSize: '1.125rem', fontWeight: 800, marginBottom: '1rem', color: 'var(--text-primary)' }}>
              {t('detail.moreFrom')} {offer.operator.name}
            </h2>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))', gap: '1rem' }}>
              {similar.map(s => (
                <Link key={s.id} href={`/offers/${s.id}`} style={{ textDecoration: 'none' }}>
                  <div className="card" style={{ padding: '1.25rem', borderTop: '3px solid var(--border-base)', transition: 'transform 0.15s, box-shadow 0.15s', cursor: 'pointer' }}
                    onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = 'var(--shadow-md)' }}
                    onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = 'var(--shadow-sm)' }}
                  >
                    <div style={{ fontSize: '0.875rem', fontWeight: 700, marginBottom: 6, color: 'var(--text-primary)' }}>{s.name}</div>
                    <div style={{ fontSize: '1.375rem', fontWeight: 900, color: 'var(--accent)', marginBottom: 4 }}>{formatDA(s.priceDA)}</div>
                    <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                      {formatData(s.dataGB, t)} · {formatValidity(s.validityDays, t)}
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}
      </div>
    </motion.div>
  )
}
