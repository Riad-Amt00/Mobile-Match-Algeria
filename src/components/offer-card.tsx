'use client'

import Link from 'next/link'
import { Signal, Wifi, Phone, MessageSquare, Calendar, Zap, Sparkles, Bookmark, BookmarkCheck, CheckCircle2, BarChart3, Loader2, Wallet } from 'lucide-react'
import { formatData, formatCalls, formatSmsScoped, formatValidity, getPricePerGB, getNetworkStyle, OPERATOR_LOGOS, cleanOfferName, offerCredit } from '@/lib/utils'
import { useLang } from '@/lib/lang-context'

export interface Offer {
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
  operator: { name: string; slug: string; primaryColor: string }
}

interface OfferCardProps {
  offer: Offer
  isSelected?: boolean
  onToggleCompare?: (id: string, name?: string) => void
  isSaved?: boolean
  onToggleSave?: (id: string, name?: string) => void
  isSaving?: boolean
  isRecommended?: boolean
  isLoggedIn?: boolean
}


export function OfferCard({
  offer,
  isSelected = false,
  onToggleCompare,
  isSaved = false,
  onToggleSave,
  isSaving = false,
  isRecommended = false,
  isLoggedIn = true,
}: OfferCardProps) {
  const { t } = useLang()
  const pricePerGB = getPricePerGB(offer.priceDA, offer.dataGB)
  const networkStyle = getNetworkStyle(offer.network)
  const credit = offerCredit(offer)
  const color = offer.operator.primaryColor

  const specs = [
    { icon: <Wifi size={14} />,          label: t('offer.data'),     value: formatData(offer.dataGB, t) },
    { icon: <Phone size={14} />,         label: t('offer.calls'),    value: formatCalls(offer, t) },
    { icon: <MessageSquare size={14} />, label: t('offer.sms'),      value: formatSmsScoped(offer, t) },
    { icon: <Calendar size={14} />,      label: t('offer.validity'), value: formatValidity(offer.validityDays, t) },
  ]

  return (
    <div
      className="offer-card"
      style={{
        display: 'flex',
        flexDirection: 'column',
        border: isSelected ? '1.5px solid var(--accent)' : undefined,
        boxShadow: isSelected ? '0 0 0 3px var(--accent-muted), var(--shadow-md)' : undefined,
      }}
    >
      {/* Operator colour bar — grows on hover via CSS */}
      <div className="card-operator-bar" style={{ background: color }} />

      {/* Recommended badge */}
      {isRecommended && (
        <div style={{
          position: 'absolute', top: 14, right: 14, zIndex: 2,
          background: 'linear-gradient(135deg, #7C3AED, #2563EB)',
          color: '#fff', fontSize: 11, fontWeight: 700,
          padding: '3px 10px', borderRadius: 20,
          display: 'flex', alignItems: 'center', gap: 4,
          boxShadow: '0 2px 8px rgba(124,58,237,0.40)',
          animation: 'badge-pop 0.4s cubic-bezier(0.34,1.56,0.64,1) both',
        }}>
          <Sparkles size={10} /> {t('offer.forYou')}
        </div>
      )}

      <div style={{ padding: '1.25rem 1.25rem 1rem', display: 'flex', flexDirection: 'column', flex: 1, gap: 0 }}>

        {/* ── Header ── */}
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, marginBottom: '1rem' }}>
          {/* Logo */}
          <div style={{
            width: 44, height: 44, borderRadius: 12, flexShrink: 0,
            background: `${color}12`,
            border: `1.5px solid ${color}30`,
            display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden',
          }}>
            {OPERATOR_LOGOS[offer.operator.slug]
              ? <img src={OPERATOR_LOGOS[offer.operator.slug]} alt={offer.operator.name} style={{ width: '70%', height: '70%', objectFit: 'contain' }} />
              : <Signal size={18} color={color} />}
          </div>

          <div style={{ flex: 1, minWidth: 0 }}>
            {/* Operator + type badges */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap', marginBottom: 5 }}>
              <span style={{
                fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 20,
                background: `${color}12`, color: color, border: `1px solid ${color}25`,
              }}>
                {offer.operator.name}
              </span>
              <span style={{
                fontSize: 11, fontWeight: 500, padding: '2px 8px', borderRadius: 20,
                background: 'var(--bg-elevated)', color: 'var(--text-muted)',
                border: '1px solid var(--border-subtle)',
              }}>
                {({ PREPAID: t('type.prepaid'), POSTPAID: t('type.postpaid'), DATA_ONLY: t('type.dataOnly') } as Record<string, string>)[offer.type] ?? offer.type}
              </span>
            </div>

            {/* Offer name */}
            <Link href={`/offers/${offer.id}`} style={{ textDecoration: 'none' }}>
              <h3 style={{
                fontSize: '0.9rem', fontWeight: 700, lineHeight: 1.3,
                color: 'var(--text-primary)',
                whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                cursor: 'pointer',
                transition: 'color 0.15s',
              }}
                onMouseEnter={e => (e.currentTarget.style.color = color)}
                onMouseLeave={e => (e.currentTarget.style.color = 'var(--text-primary)')}
              >
                {cleanOfferName(offer.name)}
              </h3>
            </Link>
          </div>
        </div>

        {/* ── Price ── */}
        <div style={{
          padding: '0.875rem 1rem',
          background: `${color}07`,
          borderRadius: 12,
          border: `1px solid ${color}15`,
          marginBottom: '1rem',
        }}>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 5 }}>
            <span style={{
              fontSize: '2rem', fontWeight: 900, color: 'var(--text-primary)',
              letterSpacing: '-0.04em', lineHeight: 1,
            }}>
              {offer.priceDA.toLocaleString('fr-DZ')}
            </span>
            <span style={{ fontSize: 15, color: 'var(--text-secondary)', fontWeight: 700 }}>DA</span>
            <span style={{ fontSize: 12, color: 'var(--text-muted)', marginLeft: 2 }}>
              / {formatValidity(offer.validityDays, t)}
            </span>
          </div>
          {offer.dataGB > 0 && pricePerGB > 0 && (
            <div style={{ fontSize: 11.5, color: 'var(--text-muted)', marginTop: 4, fontWeight: 500 }}>
              ≈ {pricePerGB} DA/GB
            </div>
          )}
        </div>

        {/* ── Specs grid ── */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 7, marginBottom: '0.875rem' }}>
          {specs.map(s => (
            <div key={s.label} className="spec-chip">
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4 }}>
                <span style={{ color: 'var(--text-muted)' }}>{s.icon}</span>
                <span style={{ fontSize: 10, color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em' }}>{s.label}</span>
              </div>
              <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)', textAlign: 'center' }}>{s.value}</div>
            </div>
          ))}
        </div>

        {/* ── Network tag + credit chip ── */}
        <div style={{ marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
          <span style={{
            display: 'inline-flex', alignItems: 'center', gap: 4,
            fontSize: 11, fontWeight: 700, padding: '3px 10px', borderRadius: 20,
            letterSpacing: '0.03em',
            ...networkStyle,
          }}>
            <Zap size={10} /> {offer.network}
          </span>
          {credit && (
            <span style={{
              display: 'inline-flex', alignItems: 'center', gap: 4,
              fontSize: 11, fontWeight: 600, padding: '3px 10px', borderRadius: 20,
              background: 'rgba(34,197,94,0.10)', color: 'var(--color-success)',
              border: '1px solid rgba(34,197,94,0.22)',
            }}>
              <Wallet size={10} /> {credit}
            </span>
          )}
        </div>

        {/* ── Actions ── */}
        <div style={{ display: 'flex', gap: 8, marginTop: 'auto' }}>
          {onToggleCompare && (
            <button
              type="button"
              onClick={e => { e.stopPropagation(); onToggleCompare(offer.id, offer.name) }}
              style={{
                flex: 1, padding: '0.6rem 0.5rem', fontSize: 12.5, fontWeight: 600,
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5,
                borderRadius: 10, cursor: 'pointer', border: 'none', fontFamily: 'inherit',
                background: isSelected ? 'var(--accent)' : 'var(--bg-elevated)',
                color: isSelected ? '#fff' : 'var(--text-secondary)',
                boxShadow: isSelected ? 'var(--shadow-accent)' : 'none',
                transition: 'all 0.18s',
              }}
              onMouseEnter={e => {
                if (!isSelected) {
                  e.currentTarget.style.background = 'var(--accent-muted)'
                  e.currentTarget.style.color = 'var(--accent)'
                }
              }}
              onMouseLeave={e => {
                if (!isSelected) {
                  e.currentTarget.style.background = 'var(--bg-elevated)'
                  e.currentTarget.style.color = 'var(--text-secondary)'
                }
              }}
            >
              {isSelected ? <CheckCircle2 size={13} /> : <BarChart3 size={13} />}
              {isSelected ? t('offer.selected') : t('offer.compare')}
            </button>
          )}

          {onToggleSave && (
            <button
              type="button"
              onClick={e => { e.stopPropagation(); onToggleSave(offer.id, offer.name) }}
              disabled={isSaving}
              style={{
                flex: 1, padding: '0.6rem 0.5rem', fontSize: 12.5, fontWeight: 600,
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5,
                borderRadius: 10, cursor: isSaving ? 'wait' : 'pointer',
                opacity: isSaving ? 0.6 : 1,
                border: 'none', fontFamily: 'inherit',
                background: isSaved ? 'rgba(37,99,235,0.10)' : 'var(--bg-elevated)',
                color: isSaved ? 'var(--accent)' : 'var(--text-secondary)',
                boxShadow: isSaved ? '0 2px 8px rgba(37,99,235,0.20)' : 'none',
                transition: 'all 0.18s',
              }}
              onMouseEnter={e => {
                if (!isSaved && !isSaving) {
                  e.currentTarget.style.background = 'rgba(37,99,235,0.08)'
                  e.currentTarget.style.color = 'var(--accent)'
                }
              }}
              onMouseLeave={e => {
                if (!isSaved && !isSaving) {
                  e.currentTarget.style.background = 'var(--bg-elevated)'
                  e.currentTarget.style.color = 'var(--text-secondary)'
                }
              }}
            >
              {isSaving
                ? <Loader2 size={13} style={{ animation: 'spin 1s linear infinite' }} />
                : !isLoggedIn
                  ? <><Bookmark size={13} /> {t('offer.signInToSave')}</>
                  : isSaved
                    ? <><BookmarkCheck size={13} /> {t('offer.saved')}</>
                    : <><Bookmark size={13} /> {t('offer.save')}</>}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
