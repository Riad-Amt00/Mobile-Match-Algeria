'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import {
  ArrowLeft, Wifi, Phone, MessageSquare, Calendar, Zap,
  CheckCircle, Bookmark, BookmarkCheck, BarChart2, ExternalLink,
  Star, Shield, TrendingDown, Loader2,
} from 'lucide-react'
import { useSession } from 'next-auth/react'
import { useToast } from '@/components/toast'
import {
  formatDA, formatData, formatMinutes, formatSms, formatValidity,
  getOperatorColor, parseFeatures, getPricePerGB,
} from '@/lib/utils'

const OPERATOR_URLS: Record<string, string> = {
  djezzy:  'https://www.djezzy5g.dz/#Offer',
  ooredoo: 'https://www.ooredoo.dz/',
  mobilis: 'https://mobilis.dz/',
}

export default function OfferDetailPage() {
  const params = useParams()
  const id = params.id as string
  const { data: session } = useSession()
  const { success, info, error: toastError } = useToast()

  const [offer, setOffer] = useState<any>(null)
  const [similar, setSimilar] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [isSaved, setIsSaved] = useState(false)
  const [savingIds, setSavedIds] = useState<Set<string>>(new Set())

  useEffect(() => {
    if (!id) return
    Promise.all([
      fetch(`/api/offers/${id}`).then(r => r.json()),
      fetch('/api/saved-offers').then(r => r.json()).catch(() => ({})),
    ]).then(([offerData, savedData]) => {
      setOffer(offerData.offer)
      setSimilar(offerData.similar || [])
      if (savedData.savedIds) {
        setIsSaved(savedData.savedIds.includes(id))
      }
    }).finally(() => setLoading(false))
  }, [id])

  const toggleSave = async () => {
    if (!session?.user) {
      info('Sign in to save offers')
      setTimeout(() => window.location.href = '/login', 1200)
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
      data.saved ? success(`${offer?.name ?? 'Offer'} saved 🔖`) : info('Removed from saved')
    } catch {
      toastError('Failed to update saved offers')
    }
  }

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', background: 'var(--bg-dark)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ textAlign: 'center' }}>
          <Loader2 size={36} style={{ animation: 'spin 1s linear infinite', color: '#4f7fff', display: 'block', margin: '0 auto 1rem' }}/>
          <p style={{ color: 'var(--text-secondary)', fontSize: 14 }}>Loading offer details...</p>
        </div>
      </div>
    )
  }

  if (!offer) {
    return (
      <div style={{ minHeight: '100vh', background: 'var(--bg-dark)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '2rem' }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '4rem', marginBottom: '1rem' }}>😕</div>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 800, marginBottom: '0.75rem' }}>Offer not found</h1>
          <p style={{ color: 'var(--text-secondary)', marginBottom: '1.5rem' }}>This offer may have been removed or is no longer available.</p>
          <Link href="/" className="btn-primary" style={{ textDecoration: 'none', padding: '0.75rem 1.5rem', borderRadius: 12, display: 'inline-flex', alignItems: 'center', gap: 8 }}>
            <ArrowLeft size={15}/> Browse all offers
          </Link>
        </div>
      </div>
    )
  }

  const opColor = offer.operator.primaryColor || getOperatorColor(offer.operator.slug)
  const features = parseFeatures(offer.features)
  const pricePerGB = getPricePerGB(offer.priceDA, offer.dataGB)
  const typeLabel = { PREPAID: 'Prepaid', POSTPAID: 'Postpaid', DATA_ONLY: 'Data only' }[offer.type as string] || offer.type

  const specs = [
    { icon: <Wifi size={18}/>,          label: 'Data',     value: formatData(offer.dataGB),           color: '#6b93ff' },
    { icon: <Phone size={18}/>,         label: 'Calls',    value: formatMinutes(offer.voiceMinutes),  color: '#4ade80' },
    { icon: <MessageSquare size={18}/>, label: 'SMS',      value: formatSms(offer.smsCount),          color: '#f59e0b' },
    { icon: <Calendar size={18}/>,      label: 'Validity', value: formatValidity(offer.validityDays), color: '#a78bfa' },
  ]

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-dark)', padding: '2rem 1.5rem 4rem' }}>
      <div style={{ maxWidth: 900, margin: '0 auto' }}>

        {/* Back nav */}
        <Link href="/" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, color: 'var(--text-secondary)', textDecoration: 'none', fontSize: 14, marginBottom: '2rem' }}>
          <ArrowLeft size={16}/> All offers
        </Link>

        {/* ── Hero card ── */}
        <div className="glass" style={{ borderRadius: 20, overflow: 'hidden', marginBottom: '1.5rem' }}>
          {/* Color bar */}
          <div style={{ height: 5, background: `linear-gradient(90deg, ${opColor}, ${opColor}80)` }}/>

          <div style={{ padding: '2rem', display: 'flex', flexWrap: 'wrap', gap: '2rem', alignItems: 'flex-start', justifyContent: 'space-between' }}>
            {/* Left: identity */}
            <div style={{ flex: '1 1 320px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: '1rem' }}>
                <div style={{ width: 56, height: 56, borderRadius: 16, background: `${opColor}20`, border: `1px solid ${opColor}40`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 28 }}>
                  {(({ djezzy: '🔴', ooredoo: '🟣', mobilis: '🟢' } as Record<string, string>)[offer.operator.slug]) || '📱'}
                </div>
                <div>
                  <div style={{ fontSize: 11, fontWeight: 700, color: opColor, textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 2 }}>
                    {offer.operator.name}
                  </div>
                  <h1 style={{ fontSize: '1.5rem', fontWeight: 900, lineHeight: 1.2 }}>{offer.name}</h1>
                </div>
              </div>

              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: '1.5rem' }}>
                <span style={{ fontSize: 12, padding: '3px 10px', borderRadius: 50, background: `${opColor}18`, border: `1px solid ${opColor}30`, color: opColor, fontWeight: 600 }}>
                  {offer.operator.name}
                </span>
                <span style={{ fontSize: 12, padding: '3px 10px', borderRadius: 50, background: 'rgba(255,255,255,0.06)', border: '1px solid var(--border)', color: 'var(--text-secondary)', fontWeight: 600 }}>
                  {typeLabel}
                </span>
                <span style={{ fontSize: 12, padding: '3px 10px', borderRadius: 50, background: offer.network.includes('5G') ? 'rgba(124,58,237,0.15)' : 'rgba(79,127,255,0.12)', border: `1px solid ${offer.network.includes('5G') ? 'rgba(124,58,237,0.3)' : 'rgba(79,127,255,0.25)'}`, color: offer.network.includes('5G') ? '#a78bfa' : '#6b93ff', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 4 }}>
                  <Zap size={10}/> {offer.network}
                </span>
                {offer.isFeatured && (
                  <span style={{ fontSize: 12, padding: '3px 10px', borderRadius: 50, background: 'linear-gradient(135deg, #f59e0b, #ef4444)', color: 'white', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 4 }}>
                    <Star size={10}/> POPULAR
                  </span>
                )}
              </div>

              {/* Price */}
              <div style={{ marginBottom: '0.5rem' }}>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
                  <span style={{ fontSize: '3rem', fontWeight: 900, lineHeight: 1 }}>
                    {offer.priceDA.toLocaleString()}
                  </span>
                  <span style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--text-secondary)' }}>DA</span>
                  <span style={{ fontSize: 14, color: 'var(--text-secondary)' }}>/ {formatValidity(offer.validityDays)}</span>
                </div>
                <div style={{ display: 'flex', gap: '1rem', marginTop: 6, flexWrap: 'wrap' }}>
                  {pricePerGB > 0 && (
                    <span style={{ fontSize: 13, color: '#4ade80', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 4 }}>
                      <TrendingDown size={13}/> {pricePerGB} DA/GB
                    </span>
                  )}
                  <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
                    {Math.round(offer.priceDA / offer.validityDays)} DA/day
                  </span>
                </div>
              </div>
            </div>

            {/* Right: actions */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, minWidth: 200 }}>
              <a
                href={offer.sourceUrl || OPERATOR_URLS[offer.operator.slug] || '#'}
                target="_blank" rel="noopener noreferrer"
                style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, padding: '0.875rem 1.5rem', borderRadius: 12, background: `linear-gradient(135deg, ${opColor}, ${opColor}cc)`, color: 'white', textDecoration: 'none', fontWeight: 700, fontSize: 14, transition: 'opacity .2s' }}
              >
                <ExternalLink size={15}/> Subscribe at {offer.operator.name}
              </a>
              <button
                onClick={toggleSave}
                style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, padding: '0.875rem 1.5rem', borderRadius: 12, fontWeight: 700, fontSize: 14, cursor: 'pointer', border: `1px solid ${isSaved ? 'rgba(245,158,11,0.4)' : 'var(--border)'}`, background: isSaved ? 'rgba(245,158,11,0.12)' : 'rgba(255,255,255,0.05)', color: isSaved ? '#f59e0b' : 'var(--text-secondary)', transition: 'all .2s' }}
              >
                {isSaved ? <BookmarkCheck size={15}/> : <Bookmark size={15}/>}
                {isSaved ? 'Saved' : 'Save offer'}
              </button>
              <Link
                href={`/compare?ids=${id}`}
                style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, padding: '0.75rem 1.5rem', borderRadius: 12, background: 'rgba(79,127,255,0.1)', border: '1px solid rgba(79,127,255,0.25)', color: '#6b93ff', textDecoration: 'none', fontWeight: 600, fontSize: 14 }}
              >
                <BarChart2 size={15}/> Compare this plan
              </Link>
            </div>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1.5rem' }}>
          {/* ── Key Stats ── */}
          <div className="glass" style={{ borderRadius: 16, padding: '1.5rem' }}>
            <h2 style={{ fontSize: '0.9375rem', fontWeight: 800, marginBottom: '1.25rem' }}>📊 Plan details</h2>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
              {specs.map(s => (
                <div key={s.label} style={{ background: 'rgba(255,255,255,0.04)', borderRadius: 12, padding: '1rem', borderLeft: `2px solid ${s.color}40` }}>
                  <div style={{ color: s.color, marginBottom: 6 }}>{s.icon}</div>
                  <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginBottom: 2, fontWeight: 500 }}>{s.label}</div>
                  <div style={{ fontSize: '1.125rem', fontWeight: 800, color: 'var(--text-primary)' }}>{s.value}</div>
                </div>
              ))}
            </div>
          </div>

          {/* ── Features ── */}
          {features.length > 0 && (
            <div className="glass" style={{ borderRadius: 16, padding: '1.5rem' }}>
              <h2 style={{ fontSize: '0.9375rem', fontWeight: 800, marginBottom: '1.25rem' }}>✨ Included features</h2>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {features.map((f, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '0.625rem 0.875rem', borderRadius: 10, background: 'rgba(74,222,128,0.06)', border: '1px solid rgba(74,222,128,0.15)' }}>
                    <CheckCircle size={14} color="#4ade80" style={{ flexShrink: 0 }}/>
                    <span style={{ fontSize: 13, fontWeight: 500 }}>{f}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ── Value metrics ── */}
          <div className="glass" style={{ borderRadius: 16, padding: '1.5rem' }}>
            <h2 style={{ fontSize: '0.9375rem', fontWeight: 800, marginBottom: '1.25rem' }}>💡 Value metrics</h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {[
                { label: 'Price per day', value: `${Math.round(offer.priceDA / offer.validityDays)} DA`, highlight: false },
                { label: 'Price per GB', value: pricePerGB > 0 ? `${pricePerGB} DA` : 'N/A', highlight: true },
                { label: 'Validity', value: formatValidity(offer.validityDays), highlight: false },
                { label: 'Network type', value: offer.network, highlight: offer.network.includes('5G') },
              ].map(m => (
                <div key={m.label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.625rem 0', borderBottom: '1px solid var(--border)' }}>
                  <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>{m.label}</span>
                  <span style={{ fontSize: 13, fontWeight: 700, color: m.highlight ? '#4ade80' : 'var(--text-primary)' }}>{m.value}</span>
                </div>
              ))}
            </div>
          </div>

          {/* ── Disclaimer ── */}
          <div className="glass" style={{ borderRadius: 16, padding: '1.25rem', borderLeft: '2px solid rgba(107,147,255,0.4)' }}>
            <div style={{ display: 'flex', gap: 10 }}>
              <Shield size={16} color="#6b93ff" style={{ flexShrink: 0, marginTop: 2 }}/>
              <div>
                <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 4 }}>Important notice</div>
                <p style={{ fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.65 }}>
                  Offer details are sourced from {offer.operator.name}'s official website and may change without notice.
                  Always verify current pricing and terms directly with the operator before subscribing.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* ── Similar offers ── */}
        {similar.length > 0 && (
          <div style={{ marginTop: '2.5rem' }}>
            <h2 style={{ fontSize: '1.125rem', fontWeight: 800, marginBottom: '1rem' }}>
              More from {offer.operator.name}
            </h2>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))', gap: '1rem' }}>
              {similar.map(s => (
                <Link key={s.id} href={`/offers/${s.id}`} style={{ textDecoration: 'none' }}>
                  <div className="glass" style={{ borderRadius: 14, padding: '1.25rem', borderTop: `2px solid ${opColor}40`, transition: 'transform .15s', cursor: 'pointer' }}
                    onMouseEnter={e => (e.currentTarget.style.transform = 'translateY(-2px)')}
                    onMouseLeave={e => (e.currentTarget.style.transform = 'translateY(0)')}
                  >
                    <div style={{ fontSize: '0.875rem', fontWeight: 700, marginBottom: 6 }}>{s.name}</div>
                    <div style={{ fontSize: '1.375rem', fontWeight: 900, color: '#6b93ff', marginBottom: 4 }}>{formatDA(s.priceDA)}</div>
                    <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
                      {formatData(s.dataGB)} · {formatValidity(s.validityDays)}
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
