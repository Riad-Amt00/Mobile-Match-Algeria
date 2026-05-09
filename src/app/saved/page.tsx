'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { motion, type Variants } from 'framer-motion'
import { ArrowLeft, BookmarkX, Bookmark, Wifi, Phone, Calendar, BarChart3, Zap, Trash2, Signal, CheckCircle, RefreshCw } from 'lucide-react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { useToast } from '@/components/toast'
import { formatData, formatMinutes, formatValidity, getPricePerGB, OPERATOR_LOGOS, cleanOfferName } from '@/lib/utils'
import { useLang } from '@/lib/lang-context'

const gridVariants: Variants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.06 } },
}
const itemVariants: Variants = {
  hidden: { opacity: 0, y: 16 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.3, ease: 'easeOut' } },
}

export default function SavedOffersPage() {
  const { t } = useLang()
  const { data: session, status } = useSession()
  const router = useRouter()
  const { info, error: toastError } = useToast()
  const [savedOffers, setSavedOffers] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [compareList, setCompareList] = useState<string[]>([])
  const [removing, setRemoving] = useState<string | null>(null)

  useEffect(() => {
    if (status === 'unauthenticated') router.push('/login')
  }, [status, router])

  useEffect(() => {
    if (status !== 'authenticated') return
    loadSaved()
  }, [status])

  async function loadSaved() {
    setLoading(true)
    try {
      const res = await fetch('/api/saved-offers')
      const data = await res.json()
      setSavedOffers(data.savedOffers || [])
    } catch {
      toastError(t('saved.failLoad'))
    } finally {
      setLoading(false)
    }
  }

  const removeSave = async (offerId: string, name: string) => {
    setRemoving(offerId)
    try {
      await fetch('/api/saved-offers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ offerId }),
      })
      setSavedOffers(prev => prev.filter(o => o.id !== offerId))
      setCompareList(prev => prev.filter(id => id !== offerId))
      info(t('saved.removeFrom'))
    } catch {
      toastError(t('saved.failRemove'))
    } finally {
      setRemoving(null)
    }
  }

  const toggleCompare = (id: string, name: string) => {
    setCompareList(prev => {
      if (prev.includes(id)) return prev.filter(x => x !== id)
      if (prev.length >= 3) { info(t('saved.maxCompare')); return prev }
      return [...prev, id]
    })
  }

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', background: 'var(--bg-page)', padding: '2rem 1.5rem' }}>
        <div style={{ maxWidth: 1100, margin: '0 auto' }}>
          <div style={{ height: 20, width: 80, borderRadius: 8, background: 'var(--bg-subtle)', marginBottom: '2rem' }} />
          <div style={{ height: 40, width: 220, borderRadius: 10, background: 'var(--bg-subtle)', marginBottom: '2rem' }} />
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '1.25rem' }}>
            {[1, 2, 3].map(i => (
              <div key={i} className="skeleton" style={{ borderRadius: 'var(--radius-lg)', height: 280 }} />
            ))}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-page)', paddingTop: '2rem', paddingLeft: '1.5rem', paddingRight: '1.5rem', paddingBottom: compareList.length > 0 ? '7rem' : '4rem' }}>
      <div style={{ maxWidth: 1100, margin: '0 auto' }}>
        <Link href="/offers" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, color: 'var(--text-muted)', textDecoration: 'none', fontSize: 13, marginBottom: '2rem' }}>
          <ArrowLeft size={14} /> {t('common.back')}
        </Link>

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '2rem', flexWrap: 'wrap', gap: '1rem' }}>
          <div>
            <h1 style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--text-primary)', marginBottom: 4, display: 'flex', alignItems: 'center', gap: 8 }}>
              <Bookmark size={20} style={{ color: 'var(--text-muted)' }} /> {t('saved.title')}
            </h1>
            <p style={{ color: 'var(--text-muted)', fontSize: 13 }}>
              {savedOffers.length} saved offer{savedOffers.length !== 1 ? 's' : ''}
            </p>
          </div>
          <button onClick={loadSaved} className="btn-secondary" style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '0.5rem 0.875rem', fontSize: 13 }}>
            <RefreshCw size={13} /> {t('saved.refresh')}
          </button>
        </div>

        {/* Empty state */}
        {savedOffers.length === 0 ? (
          <div className="card" style={{ padding: '5rem 2rem', textAlign: 'center' }}>
            <BookmarkX size={40} style={{ color: 'var(--text-muted)', margin: '0 auto 1.25rem', display: 'block' }} />
            <h2 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: 8, color: 'var(--text-primary)' }}>{t('saved.empty')}</h2>
            <p style={{ color: 'var(--text-secondary)', fontSize: 14, marginBottom: '1.75rem', lineHeight: 1.7 }}>
              {t('saved.emptyDesc')}
            </p>
            <Link href="/offers" className="btn-primary" style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '0.75rem 1.75rem', textDecoration: 'none' }}>
              <Zap size={14} /> {t('saved.browse')}
            </Link>
          </div>
        ) : (
          <motion.div
            className="offers-grid"
            variants={gridVariants}
            initial="hidden"
            animate="visible"
          >
            {savedOffers.map((offer: any) => {
              const pricePerGB = getPricePerGB(offer.priceDA, offer.dataGB)
              const isInCompare = compareList.includes(offer.id)
              const isRemoving = removing === offer.id

              return (
                <motion.div key={offer.id} variants={itemVariants}>
                  <div className="offer-card" style={{
                    display: 'flex', flexDirection: 'column',
                    border: isInCompare ? '1px solid var(--accent-border)' : undefined,
                    boxShadow: isInCompare ? '0 0 0 2px var(--accent-muted)' : undefined,
                  }}>
                    <div className="card-operator-bar" style={{ background: 'var(--border-base)' }} />

                    <div style={{ padding: '1.25rem', display: 'flex', flexDirection: 'column', flex: 1, position: 'relative', zIndex: 1 }}>
                      {/* Header */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: '1rem' }}>
                        <div style={{
                          width: 38, height: 38, borderRadius: 'var(--radius-md)', flexShrink: 0,
                          background: 'var(--bg-subtle)',
                          border: '1px solid var(--border-base)',
                          display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden',
                        }}>
                          {OPERATOR_LOGOS[offer.operator?.slug]
                            ? <img src={OPERATOR_LOGOS[offer.operator.slug]} alt={offer.operator.name} style={{ width: '75%', height: '75%', objectFit: 'contain', borderRadius: 4 }} />
                            : <Signal size={16} color="var(--text-muted)" />}
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 2 }}>
                            {offer.operator?.name}
                          </div>
                          <Link href={`/offers/${offer.id}`} style={{ textDecoration: 'none' }}>
                            <div style={{ fontSize: '0.9375rem', fontWeight: 700, color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                              {cleanOfferName(offer.name)}
                            </div>
                          </Link>
                        </div>
                      </div>

                      {/* Price */}
                      <div style={{ marginBottom: '1rem' }}>
                        <div style={{ display: 'flex', alignItems: 'baseline', gap: 4 }}>
                          <span className="price-hero">{offer.priceDA?.toLocaleString('fr-DZ')}</span>
                          <span style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', fontWeight: 600 }}>DA</span>
                          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginLeft: 4 }}>/ {formatValidity(offer.validityDays)}</span>
                        </div>
                        {pricePerGB > 0 && (
                          <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>≈ {pricePerGB} DA/GB</div>
                        )}
                      </div>

                      {/* Spec chips */}
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6, marginBottom: '1.25rem' }}>
                        {[
                          { icon: <Wifi size={12} />, label: t('offer.data'), value: formatData(offer.dataGB, t) },
                          { icon: <Phone size={12} />, label: t('offer.calls'), value: formatMinutes(offer.voiceMinutes, t) },
                          { icon: <Calendar size={12} />, label: t('offer.validity'), value: formatValidity(offer.validityDays, t) },
                          { icon: <Zap size={12} />, label: t('offer.network'), value: offer.network },
                        ].map(s => (
                          <div key={s.label} className="spec-chip">
                            <span style={{ color: 'var(--text-muted)' }}>{s.icon}</span>
                            <div style={{ fontSize: 9, color: 'var(--text-secondary)', lineHeight: 1 }}>{s.label}</div>
                            <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-primary)' }}>{s.value}</div>
                          </div>
                        ))}
                      </div>

                      {/* Actions */}
                      <div style={{ display: 'flex', gap: 6, marginTop: 'auto' }}>
                        <button
                          onClick={() => toggleCompare(offer.id, offer.name)}
                          className="btn-secondary"
                          style={{
                            flex: 1, padding: '0.55rem', fontSize: 12,
                            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5,
                            ...(isInCompare ? {
                              background: 'var(--accent-muted)',
                              borderColor: 'var(--accent-border)',
                              color: 'var(--accent)',
                              fontWeight: 600,
                            } : {}),
                          }}
                        >
                          {isInCompare ? <CheckCircle size={12} /> : <BarChart3 size={12} />}
                          {isInCompare ? t('offer.selected') : t('offer.compare')}
                        </button>
                        <button
                          onClick={() => removeSave(offer.id, offer.name)}
                          disabled={isRemoving}
                          title="Remove from saved"
                          className="btn-secondary"
                          style={{
                            padding: '0.55rem 0.75rem',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            opacity: isRemoving ? 0.4 : 1,
                          }}
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </div>
                  </div>
                </motion.div>
              )
            })}
          </motion.div>
        )}
      </div>

      {/* Sticky compare bar — appears at bottom when offers are selected */}
      {compareList.length > 0 && (
        <div style={{
          position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 50,
          background: 'rgba(10, 10, 30, 0.92)',
          borderTop: '1px solid var(--accent-border)',
          backdropFilter: 'blur(16px)',
          WebkitBackdropFilter: 'blur(16px)',
          padding: '1rem 1.5rem',
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '1rem', flexWrap: 'wrap',
        }}>
          <span style={{ fontSize: 14, color: 'var(--text-secondary)', fontWeight: 500 }}>
            {compareList.length} offer{compareList.length !== 1 ? 's' : ''} selected
          </span>
          <Link
            href={`/compare?ids=${compareList.join(',')}`}
            className="btn-primary"
            style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '0.625rem 1.5rem', textDecoration: 'none', fontSize: 14, fontWeight: 700 }}
          >
            <BarChart3 size={15} /> {t('recommend.compareSideBySide')}
          </Link>
          <button
            onClick={() => setCompareList([])}
            style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: 13, fontFamily: 'inherit', padding: '0.25rem 0.5rem' }}
          >
            ✕ Clear
          </button>
        </div>
      )}
    </div>
  )
}
