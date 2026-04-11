'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { ArrowLeft, Bookmark, BookmarkCheck, Wifi, Phone, Calendar, ExternalLink, BarChart3, Zap } from 'lucide-react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { formatDA, formatData, formatMinutes, formatValidity, getOperatorColor, parseFeatures, getPricePerGB } from '@/lib/utils'

export default function SavedOffersPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [savedOffers, setSavedOffers] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [compareList, setCompareList] = useState<string[]>([])

  useEffect(() => {
    if (status === 'unauthenticated') router.push('/login')
  }, [status, router])

  useEffect(() => {
    if (status !== 'authenticated') return
    fetch('/api/saved-offers')
      .then(r => r.json())
      .then(d => { setSavedOffers(d.savedOffers || []); setLoading(false) })
      .catch(() => setLoading(false))
  }, [status])

  const removeSave = async (offerId: string) => {
    await fetch('/api/saved-offers', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ offerId }),
    })
    setSavedOffers(prev => prev.filter(o => o.id !== offerId))
  }

  const toggleCompare = (id: string) => {
    setCompareList(prev => prev.includes(id) ? prev.filter(x => x !== id) : prev.length < 3 ? [...prev, id] : prev)
  }

  const OPERATOR_LOGOS: Record<string, string> = { djezzy: '🔴', ooredoo: '🟣', mobilis: '🟢' }

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-dark)', padding: '2rem 1.5rem' }}>
      <div style={{ maxWidth: 1100, margin: '0 auto' }}>
        <Link href="/" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, color: 'var(--text-secondary)', textDecoration: 'none', fontSize: 14, marginBottom: '2rem' }}>
          <ArrowLeft size={16}/> Back
        </Link>

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '2rem', flexWrap: 'wrap', gap: '1rem' }}>
          <div>
            <h1 style={{ fontSize: '1.75rem', fontWeight: 900, display: 'flex', alignItems: 'center', gap: 10 }}>
              <BookmarkCheck size={24} style={{ color: '#f59e0b' }}/> My <span className="gradient-text">saved offers</span>
            </h1>
            <p style={{ color: 'var(--text-secondary)', fontSize: 14, marginTop: 4 }}>
              {savedOffers.length} saved offer{savedOffers.length !== 1 ? 's' : ''}
            </p>
          </div>

          {compareList.length > 0 && (
            <Link
              href={`/compare?ids=${compareList.join(',')}`}
              style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '0.6rem 1.25rem', borderRadius: 10, background: 'linear-gradient(135deg, #4f7fff, #7c3aed)', color: 'white', textDecoration: 'none', fontSize: 13, fontWeight: 700 }}
            >
              <BarChart3 size={14}/> Compare {compareList.length} offer{compareList.length !== 1 ? 's' : ''}
            </Link>
          )}
        </div>

        {loading ? (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '1.25rem' }}>
            {[1,2,3].map(i => (
              <div key={i} style={{ borderRadius: 16, overflow: 'hidden', height: 280 }}>
                <div className="skeleton" style={{ height: '100%' }}/>
              </div>
            ))}
          </div>
        ) : savedOffers.length === 0 ? (
          <div className="glass" style={{ borderRadius: 20, padding: '4rem', textAlign: 'center' }}>
            <Bookmark size={48} style={{ opacity: 0.2, marginBottom: '1rem' }}/>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: 8 }}>No saved offers yet</h2>
            <p style={{ color: 'var(--text-secondary)', fontSize: 14, marginBottom: '1.5rem' }}>
              Click the bookmark icon 🔖 on any offer to save it here
            </p>
            <Link href="/" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '0.7rem 1.5rem', borderRadius: 10, background: 'linear-gradient(135deg, #4f7fff, #7c3aed)', color: 'white', textDecoration: 'none', fontWeight: 700, fontSize: 14 }}>
              <Zap size={14}/> Browse offers
            </Link>
          </div>
        ) : (
          <div className="offers-grid">
            {savedOffers.map((offer: any, i: number) => {
              const opColor = offer.operator.primaryColor || getOperatorColor(offer.operator.slug)
              const features = parseFeatures(offer.features)
              const pricePerGB = getPricePerGB(offer.priceDA, offer.dataGB)
              const isInCompare = compareList.includes(offer.id)

              return (
                <div key={offer.id} className="offer-card" style={{ position: 'relative', animationDelay: `${i * 60}ms`, animation: 'fadeInUp 0.4s ease forwards', opacity: 0 }}>
                  <div style={{ height: 3, background: `linear-gradient(90deg, ${opColor}, ${opColor}80)`, borderRadius: '16px 16px 0 0' }}/>

                  {/* Saved badge */}
                  <div style={{ position: 'absolute', top: 14, right: 14, background: 'rgba(245,158,11,0.15)', border: '1px solid rgba(245,158,11,0.3)', borderRadius: 6, padding: '3px 6px' }}>
                    <BookmarkCheck size={13} style={{ color: '#f59e0b' }}/>
                  </div>

                  <div style={{ padding: '1.25rem' }}>
                    {/* Header */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: '1rem' }}>
                      <div style={{ width: 38, height: 38, borderRadius: 10, background: `${opColor}20`, border: `1px solid ${opColor}40`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18 }}>
                        {OPERATOR_LOGOS[offer.operator.slug] || '📱'}
                      </div>
                      <div>
                        <div style={{ fontSize: 11, fontWeight: 700, color: opColor, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                          {offer.operator.name}
                        </div>
                        <div style={{ fontSize: '0.9375rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                          {offer.name}
                        </div>
                      </div>
                    </div>

                    {/* Price */}
                    <div style={{ marginBottom: '1rem' }}>
                      <span style={{ fontSize: '1.875rem', fontWeight: 900 }}>{offer.priceDA.toLocaleString('fr-DZ')}</span>
                      <span style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', fontWeight: 600, marginLeft: 4 }}>DA</span>
                      <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginLeft: 4 }}>/ {formatValidity(offer.validityDays)}</span>
                      {pricePerGB > 0 && <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 2 }}>≈ {pricePerGB} DA/GB</div>}
                    </div>

                    {/* Stats */}
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6, marginBottom: '1rem' }}>
                      {[
                        { icon: <Wifi size={12}/>, label: 'Data', value: formatData(offer.dataGB) },
                        { icon: <Phone size={12}/>, label: 'Calls', value: formatMinutes(offer.voiceMinutes) },
                        { icon: <Calendar size={12}/>, label: 'Validity', value: formatValidity(offer.validityDays) },
                        { icon: <Zap size={12}/>, label: 'Network', value: offer.network },
                      ].map(s => (
                        <div key={s.label} style={{ display: 'flex', alignItems: 'center', gap: 5, background: 'rgba(255,255,255,0.04)', borderRadius: 7, padding: '0.45rem 0.5rem' }}>
                          <span style={{ color: 'var(--text-secondary)', flexShrink: 0 }}>{s.icon}</span>
                          <div>
                            <div style={{ fontSize: 9, color: 'var(--text-secondary)', lineHeight: 1 }}>{s.label}</div>
                            <div style={{ fontSize: 12, fontWeight: 600 }}>{s.value}</div>
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Actions */}
                    <div style={{ display: 'flex', gap: 6 }}>
                      <button
                        onClick={() => toggleCompare(offer.id)}
                        style={{ flex: 1, padding: '0.6rem', borderRadius: 8, fontSize: 12, fontWeight: 600, cursor: 'pointer', background: isInCompare ? 'rgba(79,127,255,0.2)' : 'rgba(255,255,255,0.05)', border: `1px solid ${isInCompare ? 'rgba(79,127,255,0.4)' : 'var(--border)'}`, color: isInCompare ? '#6b93ff' : 'var(--text-secondary)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4 }}
                      >
                        <BarChart3 size={12}/> {isInCompare ? 'Selected' : 'Compare'}
                      </button>
                      <button
                        onClick={() => removeSave(offer.id)}
                        title="Remove from saved"
                        style={{ padding: '0.6rem 0.75rem', borderRadius: 8, cursor: 'pointer', background: 'rgba(248,113,113,0.08)', border: '1px solid rgba(248,113,113,0.2)', color: '#f87171', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                      >
                        <BookmarkCheck size={13}/>
                      </button>
                      <a
                        href={offer.sourceUrl || '#'} target="_blank" rel="noopener noreferrer"
                        style={{ padding: '0.6rem 0.75rem', borderRadius: 8, background: `linear-gradient(135deg, ${opColor}, ${opColor}cc)`, color: 'white', textDecoration: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                      >
                        <ExternalLink size={13}/>
                      </a>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
