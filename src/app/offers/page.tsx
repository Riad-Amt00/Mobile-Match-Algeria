'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { motion, type Variants } from 'framer-motion'
import {
  Filter, ChevronDown, Zap, BarChart3, SearchX, LayoutGrid, ChevronLeft, ChevronRight,
  Search, X, HelpCircle, AlertTriangle,
} from 'lucide-react'
import { useSession } from 'next-auth/react'
import { useToast } from '@/components/toast'
import { OfferCard, type Offer } from '@/components/offer-card'
import { formatDA, formatData, OPERATOR_LOGOS } from '@/lib/utils'
import { useLang } from '@/lib/lang-context'
import { parseSearchTokens, type SearchToken } from '@/lib/search-tokens'

// Human label for one parsed search token — used by the chip row under the input.
function tokenLabel(tok: SearchToken, t: (k: any) => string): string {
  switch (tok.kind) {
    case 'data':      return tok.value < 1 ? `≈ ${Math.round(tok.value * 1024)} MB` : `≈ ${tok.value} GB`
    case 'datalt':    return `MB plans (< ${tok.value} GB)`
    case 'price':     return `≈ ${tok.value} DA`
    case 'network':   return tok.value
    case 'unlimited': return t('common.unlimited')
    case 'operator':  return tok.value.charAt(0).toUpperCase() + tok.value.slice(1)
    case 'type':      return t(tok.value === 'PREPAID' ? 'type.prepaid' : 'type.postpaid')
    case 'text':      return `"${tok.value}"`
  }
}

const gridVariants: Variants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.05 } },
}

const itemVariants: Variants = {
  hidden: { opacity: 0, y: 16 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.3, ease: 'easeOut' } },
}

const OPERATORS = [
  { slug: 'all' },
  { slug: 'djezzy',  name: 'Djezzy' },
  { slug: 'ooredoo', name: 'Ooredoo' },
  { slug: 'mobilis', name: 'Mobilis' },
]

export default function OffersPage() {
  const [offers, setOffers] = useState<Offer[]>([])
  const [loading, setLoading] = useState(true)
  const [activeType, setActiveType] = useState('all')
  const [activeOperator, setActiveOperator] = useState('all')
  const [maxPrice, setMaxPrice] = useState(15000)
  const [minData, setMinData] = useState(0)
  // Slider ceilings — sized from the real catalogue maxima (see stats effect below)
  const [priceMax, setPriceMax] = useState(15000)
  const [dataMax, setDataMax] = useState(400)
  const [activeNetwork, setActiveNetwork] = useState('all')
  // Calls / SMS are binary in the catalogue: 'any' = no preference, 'unlimited' = only unlimited
  const [activeCalls, setActiveCalls] = useState('any')
  const [activeSms, setActiveSms] = useState('any')
  const [compareList, setCompareList] = useState<string[]>([])
  const [savedIds, setSavedIds] = useState<Set<string>>(new Set())
  const [recommendedIds, setRecommendedIds] = useState<Set<string>>(new Set())
  const [showFilters, setShowFilters] = useState(false)
  const [savingId, setSavingId] = useState<string | null>(null)
  const [page, setPage] = useState(1)
  const [totalOffers, setTotalOffers] = useState(0)
  const [totalPages, setTotalPages] = useState(1)
  const [search, setSearch] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [helpOpen, setHelpOpen] = useState(false)
  const { t } = useLang()
  const { data: session, status } = useSession()
  const { success, error: toastError, warning, info } = useToast()
  const router = useRouter()

  // Debounce the search input — avoids a request on every keystroke
  useEffect(() => {
    const id = setTimeout(() => setDebouncedSearch(search), 350)
    return () => clearTimeout(id)
  }, [search])

  // Size the price / data slider ceilings from the real catalogue maxima so the
  // filters can reach the biggest offers (rounded up to a tidy step).
  useEffect(() => {
    fetch('/api/stats').then(r => r.json()).then(d => {
      if (d?.maxPrice) { const pm = Math.ceil(d.maxPrice / 1000) * 1000; setPriceMax(pm); setMaxPrice(pm) }
      if (d?.maxData)  { setDataMax(Math.max(10, Math.ceil(d.maxData / 10) * 10)) }
    }).catch(() => {})
  }, [])

  useEffect(() => {
    if (status === 'authenticated') {
      fetch('/api/saved-offers')
        .then(r => r.json())
        .then(d => { if (d.savedIds) setSavedIds(new Set(d.savedIds)) })
        .catch(() => {})

      fetch('/api/profile')
        .then(r => r.json())
        .then(({ profile }) => {
          if (!profile?.monthlyBudget) return
          return fetch('/api/recommendations', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              budget: profile.monthlyBudget,
              dataGB: profile.dataUsageGB ?? 0,
              voiceMinutes: profile.voiceMinutes ?? 0,
              smsCount: profile.smsCount ?? 0,
              type: profile.preferredType ?? 'any',
              network: profile.preferredNet ?? 'any',
              operator: profile.preferredOperator ?? 'any',
              priorities: profile.priorities ? String(profile.priorities).split(',').filter(Boolean) : [],
            }),
          }).then(r => r.json())
        })
        .then(data => {
          if (data?.recommendations) {
            setRecommendedIds(new Set(data.recommendations.map((r: any) => r.offer.id)))
          }
        })
        .catch(() => {})
    } else if (status === 'unauthenticated') {
      setSavedIds(new Set())
      setRecommendedIds(new Set())
    }
  }, [status])

  const toggleSave = useCallback(async (offerId: string, offerName?: string) => {
    if (!session?.user) {
      router.push('/login')
      return
    }
    setSavingId(offerId)
    try {
      const res = await fetch('/api/saved-offers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ offerId }),
      })
      const data = await res.json()
      if (data.error) { toastError(data.error); return }
      setSavedIds(prev => {
        const next = new Set(prev)
        data.saved ? next.add(offerId) : next.delete(offerId)
        return next
      })
      data.saved ? success(`${offerName ?? ''} ${t('toast.saved')}`) : info(t('toast.removedSaved'))
    } catch {
      toastError(t('toast.saveError'))
    } finally {
      setSavingId(null)
    }
  }, [session, router, success, toastError, info])

  const toggleCompare = useCallback((id: string, name?: string) => {
    if (compareList.includes(id)) {
      setCompareList(compareList.filter(x => x !== id))
      info(`${name ?? ''} ${t('toast.removedCmp')}`)
    } else if (compareList.length >= 3) {
      warning(t('toast.maxPlans'))
    } else {
      setCompareList([...compareList, id])
      success(`${name ?? ''} ${t('toast.addedCompare')}`)
    }
  }, [compareList, warning, info, success])

  const fetchOffers = useCallback(async (targetPage: number) => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (activeType !== 'all') params.set('type', activeType)
      if (activeOperator !== 'all') params.set('operator', activeOperator)
      if (maxPrice < priceMax) params.set('maxPrice', String(maxPrice))
      if (minData > 0) params.set('minData', String(minData))
      if (activeNetwork !== 'all') params.set('network', activeNetwork)
      if (activeCalls === 'unlimited') params.set('calls', 'unlimited')
      if (activeSms === 'unlimited') params.set('sms', 'unlimited')
      if (debouncedSearch.trim()) params.set('search', debouncedSearch.trim())
      params.set('page', String(targetPage))
      const res = await fetch(`/api/offers?${params}`)
      const data = await res.json()
      setOffers(data.offers || [])
      setTotalOffers(data.total ?? 0)
      setTotalPages(data.totalPages ?? 1)
    } catch {
      setOffers([])
    } finally {
      setLoading(false)
    }
  }, [activeType, activeOperator, maxPrice, minData, activeNetwork, activeCalls, activeSms, debouncedSearch, priceMax])

  // Reset to page 1 whenever filters change (fetchOffers ref changes)
  useEffect(() => { setPage(1); fetchOffers(1) }, [fetchOffers])

  const goToPage = (n: number) => { setPage(n); fetchOffers(n) }

  // Free-text words from the active query — passed to each card so the feature
  // that matched (e.g. "youtube") is highlighted, even when it lives in a long
  // or Arabic feature string the card would otherwise hide.
  const highlightTerms = parseSearchTokens(debouncedSearch)
    .filter((tok): tok is Extract<SearchToken, { kind: 'text' }> => tok.kind === 'text')
    .map(tok => tok.value)

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-page)' }}>

      {/* Operator filter */}
      <section style={{ padding: '2.5rem 1.5rem 1.5rem' }}>
        <div style={{ maxWidth: 1280, margin: '0 auto', display: 'flex', justifyContent: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
          {OPERATORS.map(op => (
            <button
              key={op.slug}
              onClick={() => setActiveOperator(op.slug)}
              className={`filter-pill${activeOperator === op.slug ? ' active' : ''}`}
              style={{ padding: '0.5rem 1.125rem', fontSize: 14, gap: 8, display: 'flex', alignItems: 'center' }}
            >
              {op.slug === 'all'
                ? <LayoutGrid size={14} />
                : <img src={OPERATOR_LOGOS[op.slug]} alt={(op as any).name} style={{ width: 18, height: 18, objectFit: 'contain' }} />}
              {op.slug === 'all' ? t('filter.all') : (op as any).name}
            </button>
          ))}
        </div>
      </section>

      {/* Main content */}
      <main style={{ padding: compareList.length > 0 ? '0 1.5rem 7rem' : '0 1.5rem 4rem', maxWidth: 1280, margin: '0 auto' }}>

        {/* Guided search — example chips, input, parsed-token chips, help popover */}
        <div style={{ marginBottom: '1.5rem' }}>
          {/* Example chips: only shown when the input is empty, to seed the user */}
          {!search && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10, flexWrap: 'wrap' }}>
              <span style={{ fontSize: 13, color: 'var(--text-primary)', fontWeight: 700 }}>{t('search.tryLabel')}</span>
              {[t('search.exampleData'), t('search.exampleUnlimited'), t('search.examplePostpaid'), t('search.exampleSocial')].map(ex => (
                <button key={ex} type="button" onClick={() => setSearch(ex)} style={{
                  padding: '4px 12px', borderRadius: 'var(--radius-full)',
                  background: 'var(--bg-subtle)', border: '1px solid var(--border-base)',
                  fontSize: 13, fontWeight: 500, color: 'var(--text-primary)', cursor: 'pointer', fontFamily: 'inherit',
                }}>{ex}</button>
              ))}
            </div>
          )}

          {/* Input row — input + clearly visible Help button as a sibling */}
          <div style={{ display: 'flex', gap: 8, alignItems: 'stretch' }}>
            <div style={{ position: 'relative', flex: 1 }}>
              <Search size={18} style={{ position: 'absolute', left: 16, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', pointerEvents: 'none' }} />
              <input
                type="search"
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder={t('offers.searchPlaceholder')}
                style={{
                  width: '100%',
                  padding: search ? '0.75rem 2.75rem 0.75rem 2.75rem' : '0.75rem 2.75rem',
                  fontSize: 14, fontFamily: 'inherit',
                  background: 'var(--bg-elevated)', border: '1px solid var(--border-base)',
                  borderRadius: 12, color: 'var(--text-primary)', outline: 'none',
                }}
              />
              {search && (
                <button type="button" onClick={() => setSearch('')} aria-label="Clear search" style={{
                  position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)',
                  background: 'var(--bg-subtle)', border: 'none', borderRadius: '50%',
                  width: 24, height: 24, display: 'flex', alignItems: 'center', justifyContent: 'center',
                  cursor: 'pointer', color: 'var(--text-secondary)',
                }}>
                  <X size={14} />
                </button>
              )}
            </div>
            {/* Help toggle — pulled OUT of the input so it's clearly visible */}
            <button type="button" onClick={() => setHelpOpen(o => !o)} aria-label={t('search.help')} style={{
              padding: '0 16px', borderRadius: 12,
              background: helpOpen ? 'var(--accent)' : 'var(--accent-muted)',
              border: '1px solid var(--accent-border)',
              color: helpOpen ? 'white' : 'var(--accent)',
              cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 6,
              fontSize: 14, fontWeight: 700, fontFamily: 'inherit', flexShrink: 0,
              transition: 'background 0.15s',
            }}>
              <HelpCircle size={18} /> <span>{t('search.helpButton')}</span>
            </button>
          </div>

          {/* Parsed tokens: show the user how their query was interpreted */}
          {(() => {
            const tokens = parseSearchTokens(search)
            if (tokens.length === 0) return null
            return (
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 10, flexWrap: 'wrap' }}>
                <span style={{ fontSize: 13, color: 'var(--text-primary)', fontWeight: 700 }}>{t('search.parsedAs')}</span>
                {tokens.map((tok, i) => (
                  <span key={i} style={{
                    padding: '3px 10px', borderRadius: 'var(--radius-full)',
                    background: 'var(--accent-muted)', color: 'var(--accent)',
                    border: '1px solid var(--accent-border)',
                    fontSize: 12.5, fontWeight: 700,
                  }}>
                    {tokenLabel(tok, t)}
                  </span>
                ))}
              </div>
            )
          })()}

          {/* Help popover */}
          {helpOpen && (
            <div style={{
              marginTop: 10, padding: '1rem 1.25rem', borderRadius: 10,
              background: 'var(--bg-elevated)', border: '1px solid var(--border-base)',
              fontSize: 14, color: 'var(--text-primary)', fontWeight: 500, lineHeight: 1.6,
            }}>
              <div style={{ fontWeight: 800, marginBottom: 10, color: 'var(--text-primary)', fontSize: 15 }}>{t('search.helpTitle')}</div>
              <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '6px 16px' }}>
                <li>{t('search.helpData')}</li>
                <li>{t('search.helpPrice')}</li>
                <li>{t('search.helpCalls')}</li>
                <li>{t('search.helpSms')}</li>
                <li>{t('search.helpNetwork')}</li>
                <li>{t('search.helpOperator')}</li>
                <li>{t('search.helpType')}</li>
                <li>{t('search.helpText')}</li>
              </ul>
              <div style={{ marginTop: 10, paddingTop: 10, borderTop: '1px solid var(--border-subtle)', fontSize: 13, color: 'var(--text-secondary)', fontWeight: 500 }}>
                {t('search.helpCombine')}
              </div>
            </div>
          )}
        </div>

        {/* Filter bar */}
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap' }}>
          {[
            { id: 'all',       label: t('filter.all') },
            { id: 'PREPAID',   label: t('filter.prepaid') },
            { id: 'POSTPAID',  label: t('filter.postpaid') },
            { id: 'DATA_ONLY', label: t('filter.dataOnly') },
          ].map(tp => (
            <button key={tp.id} onClick={() => setActiveType(tp.id)} className={`filter-pill ${activeType === tp.id ? 'active' : ''}`}>
              {tp.label}
            </button>
          ))}
          <div style={{ flex: 1 }} />
          <button className={`filter-pill ${showFilters ? 'active' : ''}`} onClick={() => setShowFilters(!showFilters)} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <Filter size={13} /> {t('filter.filters')}
            <ChevronDown size={13} style={{ transform: showFilters ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }} />
          </button>
        </div>

        {/* Advanced filters */}
        {showFilters && (
          <div className="card" style={{ padding: '1.25rem', marginBottom: '1.5rem', display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(200px,1fr))', gap: '1rem' }}>
            <div>
              <label style={{ fontSize: 12, color: 'var(--text-secondary)', display: 'block', marginBottom: 6 }}>
                {t('filter.maxBudget')}: <strong style={{ color: 'var(--text-primary)' }}>{formatDA(maxPrice)}</strong>
              </label>
              <input type="range" min={100} max={priceMax} step={100} value={maxPrice} onChange={e => setMaxPrice(+e.target.value)}
                style={{ width: '100%', '--fill': `${((maxPrice - 100) / Math.max(1, priceMax - 100) * 100).toFixed(1)}%` } as React.CSSProperties} />
            </div>
            <div>
              <label style={{ fontSize: 12, color: 'var(--text-secondary)', display: 'block', marginBottom: 6 }}>
                {t('filter.minData')}: <strong style={{ color: 'var(--text-primary)' }}>{minData} GB</strong>
              </label>
              <input type="range" min={0} max={dataMax} step={1} value={minData} onChange={e => setMinData(+e.target.value)}
                style={{ width: '100%', '--fill': `${(minData / Math.max(1, dataMax) * 100).toFixed(1)}%` } as React.CSSProperties} />
            </div>
            <div>
              <label style={{ fontSize: 12, color: 'var(--text-secondary)', display: 'block', marginBottom: 6 }}>{t('filter.network')}</label>
              <div style={{ display: 'flex', gap: 6 }}>
                {['all', '4G', '5G'].map(n => (
                  <button key={n} onClick={() => setActiveNetwork(n)} className={`filter-pill ${activeNetwork === n ? 'active' : ''}`} style={{ fontSize: 12 }}>
                    {n === 'all' ? t('filter.all') : n}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label style={{ fontSize: 12, color: 'var(--text-secondary)', display: 'block', marginBottom: 6 }}>{t('recommend.priority.calls')}</label>
              <div style={{ display: 'flex', gap: 6 }}>
                {[['any', t('common.noPreference')], ['unlimited', t('common.unlimited')]].map(([v, lbl]) => (
                  <button key={v} onClick={() => setActiveCalls(v)} className={`filter-pill ${activeCalls === v ? 'active' : ''}`} style={{ fontSize: 12 }}>{lbl}</button>
                ))}
              </div>
            </div>
            <div>
              <label style={{ fontSize: 12, color: 'var(--text-secondary)', display: 'block', marginBottom: 6 }}>{t('recommend.priority.sms')}</label>
              <div style={{ display: 'flex', gap: 6 }}>
                {[['any', t('common.noPreference')], ['unlimited', t('common.unlimited')]].map(([v, lbl]) => (
                  <button key={v} onClick={() => setActiveSms(v)} className={`filter-pill ${activeSms === v ? 'active' : ''}`} style={{ fontSize: 12 }}>{lbl}</button>
                ))}
              </div>
            </div>
          </div>
        )}


        {/* Image-only families notice */}
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, fontSize: 13, fontWeight: 500, color: '#FBBF24', background: 'rgba(245,158,11,0.10)', border: '1px solid rgba(245,158,11,0.4)', borderRadius: 10, padding: '10px 14px', marginBottom: '1rem' }}>
          <AlertTriangle size={16} style={{ flexShrink: 0, marginTop: 2 }} />
          <span>{t('filter.imageOnlyNotice')}</span>
        </div>

        {/* Result count */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8, marginBottom: '1rem' }}>
          {!loading && totalOffers > 0 && (
            <span style={{ fontSize: 12, color: 'var(--text-muted)', marginLeft: 'auto' }}>
              {t('filter.showing')
                .replace('{from}', String((page - 1) * 24 + 1))
                .replace('{to}', String(Math.min(page * 24, totalOffers)))
                .replace('{total}', String(totalOffers))}
            </span>
          )}
        </div>

        {/* Offers grid */}
        {loading ? (
          <div className="offers-grid">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="skeleton" style={{ borderRadius: 'var(--radius-lg)', height: 340 }} />
            ))}
          </div>
        ) : offers.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '5rem 1rem' }}>
            <SearchX size={40} style={{ color: 'var(--text-muted)', margin: '0 auto 1rem', display: 'block' }} />
            <h3 style={{ color: 'var(--text-secondary)', fontSize: '1.125rem', marginBottom: '0.5rem' }}>
              {t('filter.noResults')}
            </h3>
            <p style={{ color: 'var(--text-muted)', fontSize: 14, marginBottom: '1.25rem' }}>
              {t('filter.noResultsHint')}
            </p>
            <button
              onClick={() => { setActiveType('all'); setActiveOperator('all'); setMaxPrice(priceMax); setMinData(0); setActiveNetwork('all'); setActiveCalls('any'); setActiveSms('any') }}
              className="btn-primary"
            >
              {t('filter.reset')}
            </button>
          </div>
        ) : (
          <motion.div
            className="offers-grid"
            variants={gridVariants}
            initial="hidden"
            animate="visible"
          >
            {offers.map(offer => (
              <motion.div key={offer.id} variants={itemVariants}>
                <OfferCard
                  offer={offer}
                  isSelected={compareList.includes(offer.id)}
                  onToggleCompare={toggleCompare}
                  isSaved={savedIds.has(offer.id)}
                  onToggleSave={toggleSave}
                  isSaving={savingId === offer.id}
                  isRecommended={recommendedIds.has(offer.id)}
                  isLoggedIn={status === 'authenticated'}
                  highlight={highlightTerms}
                />
              </motion.div>
            ))}
          </motion.div>
        )}
        {/* Pagination */}
        {!loading && totalPages > 1 && (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, marginTop: '2.5rem' }}>
            <button
              onClick={() => goToPage(page - 1)}
              disabled={page <= 1}
              style={{
                display: 'flex', alignItems: 'center', gap: 4, padding: '0.5rem 1rem',
                fontSize: 13, fontWeight: 600, borderRadius: 8, cursor: page <= 1 ? 'not-allowed' : 'pointer',
                background: 'var(--bg-elevated)', border: '1px solid var(--border-base)',
                color: page <= 1 ? 'var(--text-muted)' : 'var(--text-primary)',
                fontFamily: 'inherit', opacity: page <= 1 ? 0.5 : 1, transition: 'all 0.15s',
              }}
            >
              <ChevronLeft size={14} /> {t('nav.prev')}
            </button>

            <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-secondary)', padding: '0.5rem 1rem', background: 'var(--bg-elevated)', border: '1px solid var(--border-base)', borderRadius: 8 }}>
              {page} / {totalPages}
            </span>

            <button
              onClick={() => goToPage(page + 1)}
              disabled={page >= totalPages}
              style={{
                display: 'flex', alignItems: 'center', gap: 4, padding: '0.5rem 1rem',
                fontSize: 13, fontWeight: 600, borderRadius: 8, cursor: page >= totalPages ? 'not-allowed' : 'pointer',
                background: page >= totalPages ? 'var(--bg-elevated)' : 'var(--accent)',
                border: page >= totalPages ? '1px solid var(--border-base)' : 'none',
                color: page >= totalPages ? 'var(--text-muted)' : 'white',
                fontFamily: 'inherit', opacity: page >= totalPages ? 0.5 : 1, transition: 'all 0.15s',
              }}
            >
              {t('nav.next')} <ChevronRight size={14} />
            </button>
          </div>
        )}

      </main>

      {/* Footer */}
      <footer style={{ borderTop: '1px solid var(--border-subtle)', padding: '2.5rem 1.5rem', color: 'var(--text-secondary)', fontSize: 13 }}>
        <div style={{ maxWidth: 1280, margin: '0 auto', display: 'flex', flexWrap: 'wrap', gap: '2.5rem', justifyContent: 'space-between' }}>
          <div style={{ minWidth: 200, maxWidth: 300 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: '0.75rem' }}>
              <div style={{ width: 28, height: 28, borderRadius: 8, background: 'var(--accent)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Zap size={14} color="white" />
              </div>
              <span style={{ fontWeight: 800, fontSize: '0.9375rem', color: 'var(--text-primary)' }}>
                Mobile<span style={{ color: 'var(--accent)' }}>Match</span> Algeria
              </span>
            </div>
            <p style={{ fontSize: 12, lineHeight: 1.7 }}>{t('footer.tagline')}</p>
          </div>
          <div>
            <div style={{ fontWeight: 700, color: 'var(--text-primary)', marginBottom: '0.75rem', fontSize: 13 }}>{t('footer.platform')}</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {[
                { href: '/offers', label: t('footer.browse') },
                { href: '/compare', label: t('nav.compare') },
                { href: '/recommend', label: t('nav.recommend') },
              ].map(l => (
                <Link key={l.href} href={l.href} style={{ color: 'var(--text-secondary)', textDecoration: 'none', fontSize: 13 }}>{l.label}</Link>
              ))}
            </div>
          </div>
          <div>
            <div style={{ fontWeight: 700, color: 'var(--text-primary)', marginBottom: '0.75rem', fontSize: 13 }}>{t('footer.operators')}</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {[
                { href: 'https://mobilis.dz/', label: 'Mobilis' },
                { href: 'https://www.djezzy.dz/', label: 'Djezzy' },
                { href: 'https://www.ooredoo.dz/', label: 'Ooredoo' },
              ].map(l => (
                <a key={l.label} href={l.href} target="_blank" rel="noopener noreferrer" style={{ color: 'var(--text-secondary)', textDecoration: 'none', fontSize: 13, fontWeight: 600 }}>{l.label} ↗</a>
              ))}
            </div>
          </div>
        </div>
        <div style={{ maxWidth: 1280, margin: '1.5rem auto 0', borderTop: '1px solid var(--border-subtle)', paddingTop: '1.25rem', display: 'flex', flexWrap: 'wrap', gap: '0.5rem', justifyContent: 'space-between', alignItems: 'center' }}>
          <p>© 2026 Mobile Match Algeria</p>
        </div>
      </footer>

      {compareList.length > 0 && (
        <div style={{
          position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 50,
          background: 'var(--bg-card)',
          borderTop: '2px solid var(--accent)',
          boxShadow: '0 -4px 24px rgba(15,23,42,0.12)',
          padding: '0.875rem 1.5rem',
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '1rem', flexWrap: 'wrap',
        }}>
          <span style={{ fontSize: 14, color: 'var(--text-secondary)', fontWeight: 500 }}>
            {compareList.length} {t('compare.selectedOffers')}
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
            style={{ background: 'none', border: '1px solid var(--border-base)', borderRadius: 7, color: 'var(--text-muted)', cursor: 'pointer', fontSize: 13, fontFamily: 'inherit', padding: '0.4rem 0.75rem' }}
          >
            ✕ {t('compare.clear')}
          </button>
        </div>
      )}
    </div>
  )
}
