'use client'

import Link from 'next/link'
import { Signal, Wifi, Phone, MessageSquare, Calendar, Zap, Sparkles, Bookmark, BookmarkCheck, CheckCircle, BarChart3, Loader2 } from 'lucide-react'
import { formatDA, formatData, formatMinutes, formatSms, formatValidity, getPricePerGB, getNetworkStyle, OPERATOR_LOGOS, cleanOfferName } from '@/lib/utils'
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
  operator: {
    name: string
    slug: string
    primaryColor: string
  }
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
  const typeLabel = { PREPAID: 'Prepaid', POSTPAID: 'Postpaid', DATA_ONLY: 'Data only' }[offer.type] || offer.type
  const networkStyle = getNetworkStyle(offer.network)

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        background: 'var(--bg-card)',
        borderRadius: 12,
        border: isSelected ? '1.5px solid var(--accent)' : '1px solid var(--border-base)',
        boxShadow: isSelected
          ? '0 0 0 3px rgba(37,99,235,0.10), 0 2px 8px rgba(15,23,42,0.08)'
          : '0 1px 4px rgba(15,23,42,0.06)',
        overflow: 'hidden',
        position: 'relative',
        transition: 'box-shadow 0.18s, border-color 0.18s, transform 0.18s',
      }}
      onMouseEnter={e => {
        if (!isSelected) {
          e.currentTarget.style.boxShadow = '0 6px 20px rgba(15,23,42,0.12)'
          e.currentTarget.style.transform = 'translateY(-2px)'
        }
      }}
      onMouseLeave={e => {
        e.currentTarget.style.boxShadow = isSelected
          ? '0 0 0 3px rgba(37,99,235,0.10), 0 2px 8px rgba(15,23,42,0.08)'
          : '0 1px 4px rgba(15,23,42,0.06)'
        e.currentTarget.style.transform = 'translateY(0)'
      }}
    >
      {/* Left operator color strip */}
      <div style={{
        position: 'absolute', left: 0, top: 0, bottom: 0, width: 4,
        background: offer.operator.primaryColor,
        borderRadius: '12px 0 0 12px',
      }} />

      {/* Recommended badge */}
      {isRecommended && (
        <div style={{
          position: 'absolute', top: 12, right: 12, zIndex: 2,
          background: 'var(--accent)', color: '#ffffff',
          fontSize: 11, fontWeight: 700, padding: '3px 9px',
          borderRadius: 20,
          display: 'flex', alignItems: 'center', gap: 4,
        }}>
          <Sparkles size={9} /> {t('offer.forYou')}
        </div>
      )}

      <div style={{ padding: '1.125rem 1.125rem 1.125rem 1.375rem', display: 'flex', flexDirection: 'column', flex: 1 }}>

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'start', gap: 10, marginBottom: '0.875rem' }}>
          <div style={{
            width: 38, height: 38, borderRadius: 9, flexShrink: 0,
            background: 'var(--bg-elevated)',
            border: '1px solid var(--border-base)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden',
          }}>
            {OPERATOR_LOGOS[offer.operator.slug]
              ? <img src={OPERATOR_LOGOS[offer.operator.slug]} alt={offer.operator.name} style={{ width: '72%', height: '72%', objectFit: 'contain' }} />
              : <Signal size={16} color="var(--text-muted)" />}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 5, flexWrap: 'wrap' }}>
              <span style={{
                fontSize: 11, fontWeight: 700, padding: '2px 7px', borderRadius: 20,
                color: offer.operator.primaryColor,
                background: `${offer.operator.primaryColor}15`,
                border: `1px solid ${offer.operator.primaryColor}30`,
              }}>{offer.operator.name}</span>
              <span style={{
                fontSize: 11, fontWeight: 500, padding: '2px 7px', borderRadius: 20,
                background: 'var(--bg-elevated)', color: 'var(--text-muted)',
                border: '1px solid var(--border-base)',
              }}>{typeLabel}</span>
            </div>
            <Link href={`/offers/${offer.id}`} style={{ textDecoration: 'none' }}>
              <h3 style={{
                fontSize: '0.9rem', fontWeight: 700, marginTop: 3,
                color: 'var(--text-primary)',
                whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                cursor: 'pointer', lineHeight: 1.3,
              }}>{cleanOfferName(offer.name)}</h3>
            </Link>
          </div>
        </div>

        {/* Price */}
        <div style={{ marginBottom: '1rem', paddingBottom: '1rem', borderBottom: '1px solid var(--border-subtle)' }}>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 4 }}>
            <span style={{ fontSize: '1.625rem', fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '-0.02em', lineHeight: 1 }}>
              {offer.priceDA.toLocaleString('fr-DZ')}
            </span>
            <span style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', fontWeight: 600 }}>DA</span>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginLeft: 4 }}>
              / {formatValidity(offer.validityDays)}
            </span>
          </div>
          {offer.dataGB > 0 && pricePerGB > 0 && (
            <div style={{ fontSize: 11.5, color: 'var(--text-muted)', marginTop: 3 }}>
              ≈ {pricePerGB} DA/GB
            </div>
          )}
        </div>

        {/* Specs grid */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 7, marginBottom: '0.875rem' }}>
          {([
            { icon: <Wifi size={13} />, label: t('offer.data'), value: formatData(offer.dataGB, t) },
            { icon: <Phone size={13} />, label: t('offer.calls'), value: formatMinutes(offer.voiceMinutes, t) },
            { icon: <MessageSquare size={13} />, label: t('offer.sms'), value: formatSms(offer.smsCount, t) },
            { icon: <Calendar size={13} />, label: t('offer.validity'), value: formatValidity(offer.validityDays, t) },
          ] as const).map(spec => (
            <div key={spec.label} style={{
              background: 'var(--bg-elevated)', borderRadius: 8, padding: '6px 8px',
              border: '1px solid var(--border-subtle)',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginBottom: 2 }}>
                <span style={{ color: 'var(--text-muted)' }}>{spec.icon}</span>
                <span style={{ fontSize: 10, color: 'var(--text-muted)', fontWeight: 500 }}>{spec.label}</span>
              </div>
              <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)' }}>{spec.value}</div>
            </div>
          ))}
        </div>

        {/* Network badge */}
        <div style={{ marginBottom: '0.875rem' }}>
          <span style={{
            display: 'inline-flex', alignItems: 'center', gap: 4,
            fontSize: 11, fontWeight: 600, padding: '3px 9px', borderRadius: 20,
            ...networkStyle,
          }}>
            <Zap size={10} /> {offer.network}
          </span>
        </div>

        {/* Actions */}
        <div style={{ display: 'flex', gap: 7, marginTop: 'auto' }}>
          {onToggleCompare && (
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); onToggleCompare(offer.id, offer.name) }}
              style={{
                flex: 1, padding: '0.55rem', fontSize: 12.5, fontWeight: 600,
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5,
                borderRadius: 8, cursor: 'pointer', border: 'none', fontFamily: 'inherit',
                background: isSelected ? 'var(--accent)' : 'var(--bg-elevated)',
                color: isSelected ? 'white' : 'var(--text-secondary)',
                transition: 'background 0.15s, color 0.15s',
              }}
            >
              {isSelected ? <CheckCircle size={13} /> : <BarChart3 size={13} />}
              {isSelected ? t('offer.selected') : t('offer.compare')}
            </button>
          )}

          {onToggleSave && (
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); onToggleSave(offer.id, offer.name) }}
              disabled={isSaving}
              style={{
                flex: 1, padding: '0.55rem 0.75rem', fontSize: 12.5, fontWeight: 600,
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5,
                borderRadius: 8, cursor: isSaving ? 'wait' : 'pointer',
                opacity: isSaving ? 0.6 : 1,
                border: 'none', fontFamily: 'inherit',
                background: isSaved ? 'var(--accent-muted)' : 'var(--bg-elevated)',
                color: isSaved ? 'var(--accent)' : 'var(--text-secondary)',
                transition: 'background 0.15s, color 0.15s',
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
