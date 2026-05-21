'use client'

import Link from 'next/link'
import { HelpCircle, Search, Target, BarChart3, Filter, Bookmark, ArrowRight, Lock } from 'lucide-react'
import { useLang } from '@/lib/lang-context'

const SECTIONS = [
  { key: 'search',    Icon: Search,    href: '/offers',    images: ['search'],                                                  steps: 3, requiresAuth: false },
  { key: 'recommend', Icon: Target,    href: '/recommend', images: ['recommend-1', 'recommend-2', 'recommend-3', 'recommend-4'], steps: 5, requiresAuth: true  },
  { key: 'compare',   Icon: BarChart3, href: '/compare',   images: ['compare'],                                                 steps: 3, requiresAuth: false },
  { key: 'filters',   Icon: Filter,    href: '/offers',    images: ['filters'],                                                 steps: 2, requiresAuth: false },
  { key: 'saved',     Icon: Bookmark,  href: '/saved',     images: ['saved'],                                                   steps: 2, requiresAuth: true  },
] as const

export default function HelpPage() {
  const { t } = useLang()

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-page)', padding: '2rem 1.5rem 4rem' }}>
      <div style={{ maxWidth: 920, margin: '0 auto' }}>

        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <div style={{
            width: 56, height: 56, borderRadius: 16, margin: '0 auto 1rem',
            background: 'var(--accent-muted)', border: '1px solid var(--accent-border)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <HelpCircle size={26} color="var(--accent)" />
          </div>
          <h1 className="section-title" style={{ marginBottom: 6 }}>{t('help.title')}</h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: 14 }}>{t('help.subtitle')}</p>
        </div>

        {/* Table of contents */}
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', justifyContent: 'center', marginBottom: '2rem' }}>
          {SECTIONS.map(s => (
            <a key={s.key} href={`#${s.key}`} style={{
              padding: '6px 14px', borderRadius: 'var(--radius-full)',
              background: 'var(--bg-subtle)', border: '1px solid var(--border-base)',
              fontSize: 13, color: 'var(--text-secondary)', textDecoration: 'none',
            }}>
              {t(`help.section.${s.key}.title` as any)}
            </a>
          ))}
        </div>

        {/* Sections */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          {SECTIONS.map(({ key, Icon, href, images, steps, requiresAuth }) => (
            <div key={key} id={key} className="card" style={{ padding: '1.75rem', scrollMarginTop: '5rem' }}>
              {/* Title row + optional sign-in badge */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: '0.875rem', flexWrap: 'wrap' }}>
                <div style={{
                  width: 40, height: 40, borderRadius: 10,
                  background: 'var(--accent-muted)', border: '1px solid var(--accent-border)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                }}>
                  <Icon size={20} color="var(--accent)" />
                </div>
                <h2 style={{ fontSize: '1.4rem', fontWeight: 800, margin: 0, color: 'var(--text-primary)', letterSpacing: '-0.01em' }}>
                  {t(`help.section.${key}.title` as any)}
                </h2>
                {requiresAuth && (
                  <span style={{
                    marginLeft: 'auto',
                    padding: '4px 10px', borderRadius: 'var(--radius-full)',
                    background: 'var(--bg-subtle)', border: '1px solid var(--border-base)',
                    fontSize: 12, fontWeight: 700, color: 'var(--text-secondary)',
                    display: 'inline-flex', alignItems: 'center', gap: 5,
                  }}>
                    <Lock size={11} /> {t('help.requiresAuth')}
                  </span>
                )}
              </div>

              {/* Description — stronger color, bigger, readable */}
              <p style={{ color: 'var(--text-primary)', fontSize: 15.5, lineHeight: 1.55, fontWeight: 500, margin: '0 0 1.25rem' }}>
                {t(`help.section.${key}.desc` as any)}
              </p>

              {/* Numbered steps with colored badges */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: '1.25rem' }}>
                {Array.from({ length: steps }, (_, i) => i + 1).map(n => (
                  <div key={n} style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
                    <div style={{
                      width: 24, height: 24, borderRadius: '50%',
                      background: 'var(--accent-muted)', color: 'var(--accent)',
                      border: '1px solid var(--accent-border)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: 12, fontWeight: 800, flexShrink: 0, marginTop: 1,
                    }}>{n}</div>
                    <div style={{ color: 'var(--text-primary)', fontSize: 14.5, lineHeight: 1.55, flex: 1 }}>
                      {t(`help.section.${key}.step${n}` as any)}
                    </div>
                  </div>
                ))}
              </div>

              {/* Screenshot(s) — illustrate what the steps describe */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: '1.125rem' }}>
                {images.map(img => (
                  <div key={img} style={{
                    borderRadius: 12, overflow: 'hidden',
                    border: '1px solid var(--border-base)', background: 'var(--bg-subtle)',
                    boxShadow: 'var(--shadow-sm)',
                  }}>
                    <img
                      src={`/help/${img}.png`}
                      alt=""
                      style={{ width: '100%', display: 'block' }}
                      onError={e => { (e.currentTarget as HTMLImageElement).style.display = 'none' }}
                    />
                  </div>
                ))}
              </div>

              <Link href={href} style={{
                display: 'inline-flex', alignItems: 'center', gap: 6,
                color: 'var(--accent)', textDecoration: 'none', fontSize: 14, fontWeight: 700,
              }}>
                {t('help.openPage')} <ArrowRight size={14} />
              </Link>
            </div>
          ))}
        </div>

      </div>
    </div>
  )
}
