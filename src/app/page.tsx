'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { 
  Search, Filter, ChevronDown, Wifi, Phone, MessageSquare, 
  Calendar, Zap, Star, TrendingUp, Bookmark, BookmarkCheck,
  CheckCircle, X, BarChart3, Cpu,
} from 'lucide-react'
import { useSession } from 'next-auth/react'
import { formatDA, formatData, formatMinutes, formatSms, formatValidity, getOperatorColor, parseFeatures, getPricePerGB } from '@/lib/utils'

interface Offer {
  id: string
  name: string
  type: string
  priceDA: number
  dataGB: number
  voiceMinutes: number
  smsCount: number
  validityDays: number
  network: string
  features: string
  isFeatured: boolean
  operator: {
    name: string
    slug: string
    primaryColor: string
  }
}

const OPERATOR_LOGOS: Record<string, string> = {
  djezzy:  '🔴',
  ooredoo: '🟣',
  mobilis: '🟢',
}

export default function HomePage() {
  const [offers, setOffers] = useState<Offer[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [activeType, setActiveType] = useState('all')
  const [activeOperator, setActiveOperator] = useState('all')
  const [maxPrice, setMaxPrice] = useState(10000)
  const [minData, setMinData] = useState(0)
  const [activeNetwork, setActiveNetwork] = useState('all')
  const [compareList, setCompareList] = useState<string[]>([])
  const [savedIds, setSavedIds]       = useState<Set<string>>(new Set())
  const [showFilters, setShowFilters] = useState(false)
  const [sortBy, setSortBy]           = useState<'price'|'data'|'value'>('price')
  const [heroVisible, setHeroVisible] = useState(false)
  const { data: session } = useSession()

  useEffect(() => {
    setHeroVisible(true)
    fetchOffers()
    // Load saved offer IDs if logged in
    fetch('/api/saved-offers').then(r => r.json()).then(d => {
      if (d.savedIds) setSavedIds(new Set(d.savedIds))
    }).catch(() => {})
  }, [])

  const toggleSave = async (offerId: string) => {
    if (!session?.user) { window.location.href = '/login'; return }
    const res = await fetch('/api/saved-offers', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ offerId }) })
    const data = await res.json()
    setSavedIds(prev => {
      const next = new Set(prev)
      if (data.saved) next.add(offerId); else next.delete(offerId)
      return next
    })
  }

  const fetchOffers = useCallback(async (overrides?: Record<string,string>) => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (activeType !== 'all') params.set('type', activeType)
      if (activeOperator !== 'all') params.set('operator', activeOperator)
      if (maxPrice < 10000) params.set('maxPrice', String(maxPrice))
      if (minData > 0) params.set('minData', String(minData))
      if (activeNetwork !== 'all') params.set('network', activeNetwork)
      if (search) params.set('search', search)
      if (overrides) Object.entries(overrides).forEach(([k,v]) => params.set(k,v))
      
      const res = await fetch(`/api/offers?${params}`)
      const data = await res.json()
      setOffers(data.offers || [])
    } catch {
      setOffers([])
    } finally {
      setLoading(false)
    }
  }, [activeType, activeOperator, maxPrice, minData, activeNetwork, search])

  useEffect(() => { fetchOffers() }, [fetchOffers])

  const sortedOffers = [...offers].sort((a, b) => {
    if (sortBy === 'price') return a.priceDA - b.priceDA
    if (sortBy === 'data') return b.dataGB - a.dataGB
    if (sortBy === 'value') return getPricePerGB(a.priceDA, a.dataGB) - getPricePerGB(b.priceDA, b.dataGB)
    return 0
  })

  const toggleCompare = (id: string) => {
    setCompareList(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : prev.length < 3 ? [...prev, id] : prev
    )
  }

  const stats = {
    total: offers.length,
    avgPrice: offers.length ? Math.round(offers.reduce((s,o) => s+o.priceDA, 0)/offers.length) : 0,
    cheapest: offers.length ? Math.min(...offers.map(o=>o.priceDA)) : 0,
  }

  return (
    <div style={{minHeight:'100vh', background:'var(--bg-dark)'}}>

      {/* ── Hero Section ───────────────────────────────────────── */}
      <section style={{
        padding:'5rem 1.5rem 3rem',
        textAlign:'center',
        position:'relative',
        overflow:'hidden',
      }}>
        {/* Background orbs */}
        <div style={{
          position:'absolute', top:-100, left:'20%',
          width:500, height:500, borderRadius:'50%',
          background:'radial-gradient(circle, rgba(79,127,255,0.08) 0%, transparent 70%)',
          pointerEvents:'none',
        }}/>
        <div style={{
          position:'absolute', top:-50, right:'15%',
          width:400, height:400, borderRadius:'50%',
          background:'radial-gradient(circle, rgba(124,58,237,0.07) 0%, transparent 70%)',
          pointerEvents:'none',
        }}/>

        <div style={{
          maxWidth:720, margin:'0 auto', position:'relative',
          opacity: heroVisible ? 1 : 0,
          transform: heroVisible ? 'translateY(0)' : 'translateY(20px)',
          transition:'all 0.8s cubic-bezier(0.4,0,0.2,1)',
        }}>
          <div style={{
            display:'inline-flex', alignItems:'center', gap:8,
            padding:'0.4rem 1rem', borderRadius:50,
            background:'rgba(79,127,255,0.1)', border:'1px solid rgba(79,127,255,0.25)',
            color:'#6b93ff', fontSize:13, fontWeight:600, marginBottom:'1.5rem',
          }}>
            <Zap size={13}/> Comparateur N°1 en Algérie • 50+ offres en temps réel
          </div>

          <h1 className="section-title" style={{fontSize:'clamp(2rem,5vw,3.5rem)', marginBottom:'1.25rem'}}>
            Trouvez la <span className="gradient-text">meilleure offre</span>
            <br/>mobile en Algérie
          </h1>

          <p style={{color:'var(--text-secondary)', fontSize:'1.1rem', marginBottom:'2.5rem', lineHeight:1.7}}>
            Comparez instantanément les offres de <strong style={{color:'#ff6b6b'}}>Djezzy</strong>,{' '}
            <strong style={{color:'#ff80cc'}}>Ooredoo</strong> et{' '}
            <strong style={{color:'#4ade80'}}>Mobilis</strong>. Économisez des milliers de dinars chaque mois.
          </p>

          {/* Search bar */}
          <div style={{
            display:'flex', gap:10, maxWidth:560, margin:'0 auto',
            background:'rgba(255,255,255,0.05)', border:'1px solid rgba(255,255,255,0.1)',
            borderRadius:14, padding:'6px 6px 6px 16px',
          }}>
            <Search size={18} style={{color:'var(--text-secondary)', flexShrink:0, alignSelf:'center'}}/>
            <input
              type="text"
              placeholder="Rechercher une offre, un opérateur..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              style={{
                background:'transparent', border:'none', outline:'none',
                color:'var(--text-primary)', fontSize:15, flex:1,
                fontFamily:'inherit',
              }}
            />
            <button className="btn-primary" style={{borderRadius:10, padding:'0.6rem 1.25rem', fontSize:14}}>
              Rechercher
            </button>
          </div>

          {/* Stats row */}
          <div style={{display:'flex', justifyContent:'center', gap:'2.5rem', marginTop:'2.5rem', flexWrap:'wrap'}}>
            {[
              {label:'Offres disponibles', value: stats.total || '50+'},
              {label:'Prix moyen', value: stats.avgPrice ? formatDA(stats.avgPrice) : 'N/A'},
              {label:'Meilleur prix', value: stats.cheapest ? formatDA(stats.cheapest) : 'N/A'},
            ].map(stat => (
              <div key={stat.label} style={{textAlign:'center'}}>
                <div style={{fontSize:'1.5rem', fontWeight:800, color:'var(--text-primary)'}}>{stat.value}</div>
                <div style={{fontSize:'0.8125rem', color:'var(--text-secondary)', marginTop:2}}>{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Operator Logos ─────────────────────────────────────── */}
      <section style={{padding:'0 1.5rem 2rem'}}>
        <div style={{maxWidth:1280, margin:'0 auto'}}>
          <div style={{display:'flex', justifyContent:'center', gap:'1.5rem', flexWrap:'wrap'}}>
            {[
              {slug:'all', name:'Tous', color:'#4f7fff', emoji:'🇩🇿'},
              {slug:'djezzy', name:'Djezzy', color:'#E30613', emoji:'🔴'},
              {slug:'ooredoo', name:'Ooredoo', color:'#E20074', emoji:'🟣'},
              {slug:'mobilis', name:'Mobilis', color:'#00A651', emoji:'🟢'},
            ].map(op => (
              <button
                key={op.slug}
                onClick={() => setActiveOperator(op.slug)}
                style={{
                  display:'flex', alignItems:'center', gap:10,
                  padding:'0.75rem 1.5rem', borderRadius:12,
                  background: activeOperator === op.slug ? `${op.color}20` : 'rgba(255,255,255,0.04)',
                  border: `1px solid ${activeOperator === op.slug ? op.color+'50' : 'var(--border)'}`,
                  cursor:'pointer', transition:'all 0.2s',
                  color: activeOperator === op.slug ? op.color : 'var(--text-secondary)',
                  fontWeight: activeOperator === op.slug ? 700 : 500,
                  fontSize:14,
                }}
              >
                <span style={{fontSize:20}}>{op.emoji}</span>
                {op.name}
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* ── Main Content ───────────────────────────────────────── */}
      <main style={{padding:'0 1.5rem 4rem', maxWidth:1280, margin:'0 auto'}}>
        {/* Filter Bar */}
        <div style={{
          display:'flex', gap:8, alignItems:'center',
          marginBottom:'1.5rem', flexWrap:'wrap',
        }}>
          {/* Type pills */}
          {[
            {id:'all', label:'Tous'},
            {id:'PREPAID', label:'Prépayé'},
            {id:'POSTPAID', label:'Postpayé'},
            {id:'DATA_ONLY', label:'Internet'},
          ].map(t => (
            <button
              key={t.id}
              onClick={() => setActiveType(t.id)}
              className={`filter-pill ${activeType === t.id ? 'active' : ''}`}
            >
              {t.label}
            </button>
          ))}

          <div style={{flex:1}}/>

          {/* Sort */}
          <select
            value={sortBy}
            onChange={e => setSortBy(e.target.value as any)}
            style={{
              background:'rgba(255,255,255,0.05)', border:'1px solid var(--border)',
              color:'var(--text-secondary)', borderRadius:8, padding:'0.4rem 0.75rem',
              fontSize:13, cursor:'pointer', outline:'none', fontFamily:'inherit',
            }}
          >
            <option value="price">Trier: Prix ↑</option>
            <option value="data">Trier: Data ↓</option>
            <option value="value">Trier: Meilleur rapport</option>
          </select>

          {/* Advanced filters toggle */}
          <button
            className="filter-pill"
            onClick={() => setShowFilters(!showFilters)}
            style={{display:'flex', alignItems:'center', gap:6}}
          >
            <Filter size={13}/> Filtres avancés
            <ChevronDown size={13} style={{transform: showFilters ? 'rotate(180deg)' : 'none', transition:'transform 0.2s'}}/>
          </button>
        </div>

        {/* Advanced Filters Panel */}
        {showFilters && (
          <div className="glass" style={{
            padding:'1.25rem', borderRadius:12, marginBottom:'1.5rem',
            display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(200px,1fr))', gap:'1rem',
          }}>
            <div>
              <label style={{fontSize:12, color:'var(--text-secondary)', display:'block', marginBottom:6}}>
                Budget max: <strong style={{color:'var(--text-primary)'}}>{formatDA(maxPrice)}</strong>
              </label>
              <input type="range" min={100} max={10000} step={100} value={maxPrice}
                onChange={e => setMaxPrice(+e.target.value)}
                style={{width:'100%', accentColor:'#4f7fff'}}
              />
            </div>
            <div>
              <label style={{fontSize:12, color:'var(--text-secondary)', display:'block', marginBottom:6}}>
                Data min: <strong style={{color:'var(--text-primary)'}}>{minData} GB</strong>
              </label>
              <input type="range" min={0} max={200} step={1} value={minData}
                onChange={e => setMinData(+e.target.value)}
                style={{width:'100%', accentColor:'#4f7fff'}}
              />
            </div>
            <div>
              <label style={{fontSize:12, color:'var(--text-secondary)', display:'block', marginBottom:6}}>Réseau</label>
              <div style={{display:'flex', gap:6}}>
                {['all','4G','5G'].map(n => (
                  <button key={n} onClick={() => setActiveNetwork(n)}
                    className={`filter-pill ${activeNetwork===n?'active':''}`}
                    style={{fontSize:12}}
                  >{n==='all'?'Tous':n}</button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Offers Count */}
        <div style={{marginBottom:'1.25rem', display:'flex', alignItems:'center', justifyContent:'space-between'}}>
          <p style={{color:'var(--text-secondary)', fontSize:14}}>
            {loading ? 'Chargement...' : `${sortedOffers.length} offres trouvées`}
          </p>
          {compareList.length > 0 && (
            <Link href={`/compare?ids=${compareList.join(',')}`}
              style={{
                display:'flex', alignItems:'center', gap:8,
                padding:'0.5rem 1.25rem', borderRadius:8,
                background:'linear-gradient(135deg,#4f7fff,#7c3aed)',
                color:'white', fontSize:13, fontWeight:600, textDecoration:'none',
              }}
            >
              <BarChart3 size={14}/>
              Comparer {compareList.length} offres sélectionnées
            </Link>
          )}
        </div>

        {/* Offers Grid */}
        {loading ? (
          <div className="offers-grid">
            {Array.from({length:6}).map((_,i) => (
              <div key={i} style={{borderRadius:16, overflow:'hidden', height:300}}>
                <div className="skeleton" style={{height:'100%'}}/>
              </div>
            ))}
          </div>
        ) : sortedOffers.length === 0 ? (
          <div style={{textAlign:'center', padding:'5rem 1rem'}}>
            <div style={{fontSize:'3rem', marginBottom:'1rem'}}>🔍</div>
            <h3 style={{color:'var(--text-secondary)', fontSize:'1.125rem'}}>
              Aucune offre trouvée pour ces critères
            </h3>
            <button onClick={() => {setActiveType('all'); setActiveOperator('all'); setSearch(''); setMaxPrice(10000); setMinData(0);}}
              className="btn-primary" style={{marginTop:'1rem'}}>
              Réinitialiser les filtres
            </button>
          </div>
        ) : (
          <div className="offers-grid">
            {sortedOffers.map((offer, i) => (
              <OfferCard
                key={offer.id}
                offer={offer}
                index={i}
                isSelected={compareList.includes(offer.id)}
                onToggleCompare={toggleCompare}
                isSaved={savedIds.has(offer.id)}
                onToggleSave={toggleSave}
              />
            ))}
          </div>
        )}
      </main>

      {/* ── Footer ──────────────────────────────────────────────── */}
      <footer style={{
        borderTop:'1px solid var(--border)',
        padding:'2rem 1.5rem',
        textAlign:'center',
        color:'var(--text-secondary)',
        fontSize:13,
      }}>
        <p>© 2026 Mobile Match Algeria · Tous droits réservés · Données mises à jour quotidiennement</p>
        <p style={{marginTop:6, fontSize:12, opacity:0.6}}>
          Information non contractuelle. Vérifiez les offres directement auprès des opérateurs.
        </p>
      </footer>
    </div>
  )
}

// ── Offer Card Component ─────────────────────────────────────────────────────
function OfferCard({ offer, index, isSelected, onToggleCompare, isSaved, onToggleSave }: {
  offer: Offer
  index: number
  isSelected: boolean
  onToggleCompare: (id: string) => void
  isSaved: boolean
  onToggleSave: (id: string) => void
}) {
  const features = parseFeatures(offer.features)
  const pricePerGB = getPricePerGB(offer.priceDA, offer.dataGB)
  const opColor = offer.operator.primaryColor || getOperatorColor(offer.operator.slug)

  const badgeClass = `badge-${offer.operator.slug}`
  const typeLabel = { PREPAID:'Prépayé', POSTPAID:'Postpayé', DATA_ONLY:'Internet' }[offer.type] || offer.type

  return (
    <div
      className="offer-card"
      style={{
        animationDelay:`${index * 60}ms`,
        animation:'fadeInUp 0.4s ease forwards',
        opacity:0,
        border: isSelected ? `1px solid rgba(79,127,255,0.5)` : undefined,
        boxShadow: isSelected ? '0 0 0 2px rgba(79,127,255,0.2)' : undefined,
      }}
    >
      {/* Operator color header bar */}
      <div style={{height:3, background:`linear-gradient(90deg, ${opColor}, ${opColor}80)`, borderRadius:'16px 16px 0 0'}}/>

      {offer.isFeatured && (
        <div style={{
          position:'absolute', top:16, right:16,
          background:'linear-gradient(135deg,#f59e0b,#ef4444)',
          color:'white', fontSize:11, fontWeight:700,
          padding:'2px 8px', borderRadius:50,
          display:'flex', alignItems:'center', gap:4,
        }}>
          <Star size={10}/> POPULAIRE
        </div>
      )}

      <div style={{padding:'1.25rem'}}>
        {/* Header */}
        <div style={{display:'flex', alignItems:'start', gap:10, marginBottom:'1rem'}}>
          <div style={{
            width:40, height:40, borderRadius:10, flexShrink:0,
            background:`${opColor}20`, border:`1px solid ${opColor}40`,
            display:'flex', alignItems:'center', justifyContent:'center',
            fontSize:20,
          }}>
            {OPERATOR_LOGOS[offer.operator.slug] || '📱'}
          </div>
          <div style={{flex:1, minWidth:0}}>
            <div style={{display:'flex', alignItems:'center', gap:6, flexWrap:'wrap'}}>
              <span className={badgeClass} style={{
                fontSize:11, fontWeight:600, padding:'2px 8px', borderRadius:50,
              }}>
                {offer.operator.name}
              </span>
              <span style={{
                fontSize:11, fontWeight:500, padding:'2px 8px', borderRadius:50,
                background:'rgba(255,255,255,0.06)', color:'var(--text-secondary)',
                border:'1px solid var(--border)',
              }}>
                {typeLabel}
              </span>
            </div>
            <h3 style={{
              fontSize:'0.9375rem', fontWeight:700, marginTop:4,
              color:'var(--text-primary)', whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis',
            }}>
              {offer.name}
            </h3>
          </div>
        </div>

        {/* Price */}
        <div style={{marginBottom:'1.25rem'}}>
          <div style={{display:'flex', alignItems:'baseline', gap:4}}>
            <span style={{fontSize:'2rem', fontWeight:900, color:'var(--text-primary)', lineHeight:1}}>
              {offer.priceDA.toLocaleString('fr-DZ')}
            </span>
            <span style={{fontSize:'0.875rem', color:'var(--text-secondary)', fontWeight:600}}>DA</span>
            <span style={{fontSize:'0.75rem', color:'var(--text-secondary)', marginLeft:4}}>
              / {formatValidity(offer.validityDays)}
            </span>
          </div>
          {offer.dataGB > 0 && pricePerGB > 0 && (
            <div style={{fontSize:12, color:'var(--text-secondary)', marginTop:2}}>
              ≈ {pricePerGB} DA/GB
            </div>
          )}
        </div>

        {/* Key specs */}
        <div style={{
          display:'grid', gridTemplateColumns:'1fr 1fr', gap:8, marginBottom:'1.25rem',
        }}>
          {[
            {icon: <Wifi size={13}/>, label:'Data', value: formatData(offer.dataGB)},
            {icon: <Phone size={13}/>, label:'Appels', value: formatMinutes(offer.voiceMinutes)},
            {icon: <MessageSquare size={13}/>, label:'SMS', value: formatSms(offer.smsCount)},
            {icon: <Calendar size={13}/>, label:'Validité', value: formatValidity(offer.validityDays)},
          ].map(spec => (
            <div key={spec.label} style={{
              display:'flex', alignItems:'center', gap:6,
              background:'rgba(255,255,255,0.04)', borderRadius:8,
              padding:'0.5rem 0.625rem',
            }}>
              <span style={{color:'var(--text-secondary)', flexShrink:0}}>{spec.icon}</span>
              <div>
                <div style={{fontSize:10, color:'var(--text-secondary)', lineHeight:1}}>{spec.label}</div>
                <div style={{fontSize:13, fontWeight:600, color:'var(--text-primary)', lineHeight:1.3}}>
                  {spec.value}
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Network badge */}
        <div style={{display:'flex', alignItems:'center', gap:6, marginBottom:'1rem'}}>
          <span style={{
            display:'flex', alignItems:'center', gap:4,
            fontSize:11, fontWeight:600, padding:'3px 8px', borderRadius:50,
            background: offer.network.includes('5G') ? 'rgba(124,58,237,0.15)' : 'rgba(79,127,255,0.12)',
            border: `1px solid ${offer.network.includes('5G') ? 'rgba(124,58,237,0.3)' : 'rgba(79,127,255,0.25)'}`,
            color: offer.network.includes('5G') ? '#a78bfa' : '#6b93ff',
          }}>
            <Zap size={10}/> {offer.network}
          </span>
          {features.slice(0,1).map((f, fi) => (
            <span key={fi} style={{
              fontSize:11, padding:'3px 8px', borderRadius:50,
              background:'rgba(0,166,81,0.1)', border:'1px solid rgba(0,166,81,0.2)',
              color:'#4ade80', whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis',
              maxWidth:150,
            }}>
              ✓ {f}
            </span>
          ))}
        </div>

        {/* Actions */}
        <div style={{display:'flex', gap:8}}>
          <button
            onClick={() => onToggleCompare(offer.id)}
            style={{
              flex:1, padding:'0.625rem', borderRadius:8, fontSize:13, fontWeight:600,
              cursor:'pointer', transition:'all 0.2s',
              background: isSelected ? 'rgba(79,127,255,0.2)' : 'rgba(255,255,255,0.05)',
              border: `1px solid ${isSelected ? 'rgba(79,127,255,0.4)' : 'var(--border)'}`,
              color: isSelected ? '#6b93ff' : 'var(--text-secondary)',
              display:'flex', alignItems:'center', justifyContent:'center', gap:6,
            }}
          >
            {isSelected ? <CheckCircle size={14}/> : <BarChart3 size={14}/>}
            {isSelected ? 'Sélectionné' : 'Comparer'}
          </button>
          <button
            onClick={() => onToggleSave(offer.id)}
            title={isSaved ? 'Retirer des favoris' : 'Sauvegarder'}
            style={{
              padding:'0.625rem 0.75rem', borderRadius:8, fontSize:13, fontWeight:600,
              cursor:'pointer', transition:'all 0.2s',
              background: isSaved ? 'rgba(245,158,11,0.15)' : 'rgba(255,255,255,0.05)',
              border: `1px solid ${isSaved ? 'rgba(245,158,11,0.4)' : 'var(--border)'}`,
              color: isSaved ? '#f59e0b' : 'var(--text-secondary)',
              display:'flex', alignItems:'center', justifyContent:'center',
            }}
          >
            {isSaved ? <BookmarkCheck size={14}/> : <Bookmark size={14}/>}
          </button>
          <a
            href={offer.operator.slug === 'djezzy' ? 'https://www.djezzy5g.dz/#Offer'
              : offer.operator.slug === 'ooredoo' ? 'https://www.ooredoo.dz/'
              : 'https://mobilis.dz/'}
            target="_blank" rel="noopener noreferrer"
            style={{
              flex:1, padding:'0.625rem', borderRadius:8, fontSize:13, fontWeight:600,
              cursor:'pointer', textDecoration:'none', textAlign:'center',
              display:'flex', alignItems:'center', justifyContent:'center',
              background:`linear-gradient(135deg, ${opColor}, ${opColor}cc)`,
              color:'white', border:'none',
              transition:'all 0.2s',
            }}
          >
            Voir l'offre ↗
          </a>
        </div>
      </div>
    </div>
  )
}
