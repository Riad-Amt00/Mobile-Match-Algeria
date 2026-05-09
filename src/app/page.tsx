'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useSession } from 'next-auth/react'
import { motion, type Transition } from 'framer-motion'
import { Zap, BarChart3, Sparkles, Bookmark, RefreshCw, ArrowRight, CheckCircle } from 'lucide-react'
import { useLang } from '@/lib/lang-context'
import { OPERATOR_LOGOS } from '@/lib/utils'
import type { Lang } from '@/lib/i18n'

const LANG_OPTIONS: { code: Lang; welcome: string; sub: string; cta: string; dir: 'ltr' | 'rtl' }[] = [
  { code: 'en', welcome: 'English',    sub: 'Browse & compare plans',  cta: 'Get started', dir: 'ltr' },
  { code: 'fr', welcome: 'Français',   sub: 'Comparez les forfaits',   cta: 'Commencer',   dir: 'ltr' },
  { code: 'ar', welcome: 'العربية',    sub: 'تصفح وقارن العروض',       cta: 'ابدأ الآن',   dir: 'rtl' },
]

const OPERATORS = [
  { slug: 'djezzy',  name: 'Djezzy',  color: '#E30613' },
  { slug: 'ooredoo', name: 'Ooredoo', color: '#E20074' },
  { slug: 'mobilis', name: 'Mobilis', color: '#00A651' },
]

const FEATURES = [
  { icon: <BarChart3 size={20} />, title: 'Compare plans', desc: 'Side-by-side comparison of all operators' },
  { icon: <Sparkles size={20} />,  title: 'Smart picks',   desc: 'Personalised recommendations for your usage' },
  { icon: <Bookmark size={20} />,  title: 'Save offers',   desc: 'Bookmark your favourite plans' },
  { icon: <RefreshCw size={20} />, title: 'Live data',     desc: 'Scraped directly from operator websites' },
]

function anim(i: number) {
  return {
    initial: { opacity: 0, y: 20 },
    animate: { opacity: 1, y: 0 },
    transition: { duration: 0.5, delay: i * 0.09, ease: [0.22, 1, 0.36, 1] } as Transition,
  }
}

export default function LandingPage() {
  const { setLang } = useLang()
  const router = useRouter()
  const { status } = useSession()

  useEffect(() => {
    if (status === 'authenticated') router.replace('/offers')
  }, [status, router])

  if (status === 'loading' || status === 'authenticated') {
    return (
      <div style={{ minHeight: '100vh', background: 'var(--bg-page)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ width: 28, height: 28, border: '3px solid var(--border-base)', borderTopColor: 'var(--accent)', borderRadius: '50%', animation: 'spin 0.75s linear infinite' }} />
      </div>
    )
  }

  function choose(code: Lang) {
    setLang(code)
    router.push('/offers')
  }

  return (
    <div style={{
      minHeight: '100vh',
      background: 'var(--bg-page)',
      display: 'flex', flexDirection: 'column', alignItems: 'center',
      padding: '3.5rem 1.5rem 5rem',
    }}>
      <div style={{ width: '100%', maxWidth: 800, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>

        {/* Brand */}
        <motion.div {...anim(0)} style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: '1.25rem' }}>
          <div style={{
            width: 52, height: 52, borderRadius: 14,
            background: 'var(--accent)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: '0 4px 16px rgba(37,99,235,0.30)',
          }}>
            <Zap size={24} color="white" fill="white" />
          </div>
          <div>
            <div style={{ fontWeight: 900, fontSize: '1.6rem', color: 'var(--text-primary)', letterSpacing: '-0.03em', lineHeight: 1.1 }}>
              Mobile<span style={{ color: 'var(--accent)' }}>Match</span>
            </div>
            <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', letterSpacing: '0.12em', textTransform: 'uppercase' }}>Algeria</div>
          </div>
        </motion.div>

        {/* Headline */}
        <motion.div {...anim(1)} style={{ textAlign: 'center', marginBottom: '2.5rem' }}>
          <h1 style={{ fontSize: 'clamp(1.6rem, 5vw, 2.4rem)', fontWeight: 900, color: 'var(--text-primary)', letterSpacing: '-0.03em', lineHeight: 1.15, margin: '0 0 0.75rem' }}>
            Find the best mobile plan
            <br />
            <span style={{ color: 'var(--accent)' }}>in Algeria</span>
          </h1>
          <p style={{ fontSize: '1rem', color: 'var(--text-secondary)', maxWidth: 480, margin: '0 auto' }}>
            Compare Djezzy, Ooredoo and Mobilis offers in seconds. No ads, no bias — just data.
          </p>
        </motion.div>

        {/* Feature tiles */}
        <motion.div {...anim(2)} style={{ width: '100%', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '0.875rem', marginBottom: '3rem' }}>
          {FEATURES.map((f, i) => (
            <div key={i} style={{
              background: 'var(--bg-card)',
              border: '1px solid var(--border-base)',
              borderRadius: 12,
              padding: '1.125rem 1rem',
              display: 'flex', flexDirection: 'column', gap: 8,
              boxShadow: '0 1px 4px rgba(15,23,42,0.05)',
              transition: 'box-shadow 0.18s, transform 0.18s',
            }}
              onMouseEnter={e => { e.currentTarget.style.boxShadow = '0 6px 20px rgba(15,23,42,0.10)'; e.currentTarget.style.transform = 'translateY(-2px)' }}
              onMouseLeave={e => { e.currentTarget.style.boxShadow = '0 1px 4px rgba(15,23,42,0.05)'; e.currentTarget.style.transform = 'translateY(0)' }}
            >
              <div style={{ color: 'var(--accent)' }}>{f.icon}</div>
              <div>
                <div style={{ fontSize: 13.5, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 3 }}>{f.title}</div>
                <div style={{ fontSize: 12, color: 'var(--text-muted)', lineHeight: 1.4 }}>{f.desc}</div>
              </div>
            </div>
          ))}
        </motion.div>

        {/* Language / entry cards */}
        <motion.div {...anim(3)} style={{ width: '100%', marginBottom: '3rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: '1.25rem' }}>
            <div style={{ flex: 1, height: 1, background: 'var(--border-base)' }} />
            <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.09em', textTransform: 'uppercase', color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>
              Choose your language
            </span>
            <div style={{ flex: 1, height: 1, background: 'var(--border-base)' }} />
          </div>

          <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap', justifyContent: 'center' }}>
            {LANG_OPTIONS.map(opt => (
              <motion.button
                key={opt.code}
                onClick={() => choose(opt.code)}
                dir={opt.dir}
                whileHover={{ y: -4, transition: { duration: 0.15, ease: 'easeOut' } }}
                whileTap={{ scale: 0.97, transition: { duration: 0.08 } }}
                style={{
                  flex: '1 1 200px', maxWidth: 240,
                  background: 'var(--bg-card)',
                  border: '1.5px solid var(--border-base)',
                  borderRadius: 14, cursor: 'pointer', fontFamily: 'inherit',
                  padding: '1.5rem 1.5rem 1.25rem',
                  boxShadow: '0 2px 8px rgba(15,23,42,0.07)',
                  textAlign: opt.dir === 'rtl' ? 'right' : 'left',
                  transition: 'border-color 0.2s, box-shadow 0.2s',
                }}
                onMouseEnter={e => {
                  e.currentTarget.style.borderColor = 'var(--accent)'
                  e.currentTarget.style.boxShadow = '0 8px 24px rgba(37,99,235,0.14)'
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.borderColor = 'var(--border-base)'
                  e.currentTarget.style.boxShadow = '0 2px 8px rgba(15,23,42,0.07)'
                }}
              >
                <div style={{ fontSize: 22, fontWeight: 900, color: 'var(--text-primary)', letterSpacing: '-0.02em', lineHeight: 1.1, marginBottom: '0.75rem' }}>
                  {opt.welcome}
                </div>
                <div style={{ fontSize: 12.5, color: 'var(--text-muted)', marginBottom: '1rem', lineHeight: 1.4 }}>
                  {opt.sub}
                </div>
                <div style={{
                  display: 'inline-flex', alignItems: 'center', gap: 6,
                  fontSize: 12.5, fontWeight: 700,
                  color: 'var(--accent)',
                  flexDirection: opt.dir === 'rtl' ? 'row-reverse' : 'row',
                }}>
                  {opt.cta}
                  <ArrowRight size={13} style={{ transform: opt.dir === 'rtl' ? 'rotate(180deg)' : undefined }} />
                </div>
              </motion.button>
            ))}
          </div>
        </motion.div>

        {/* Operator strip */}
        <motion.div {...anim(4)} style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', justifyContent: 'center', marginBottom: '2rem' }}>
          <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', marginRight: 4 }}>Covering</span>
          {OPERATORS.map((op) => (
            <span key={op.slug} style={{
              display: 'inline-flex', alignItems: 'center', gap: 6,
              padding: '5px 12px 5px 6px',
              background: 'var(--bg-card)',
              border: `1px solid ${op.color}30`,
              borderRadius: 100,
              boxShadow: `0 1px 4px ${op.color}10`,
            }}>
              <span style={{ width: 20, height: 20, borderRadius: 5, overflow: 'hidden', background: op.color, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <img src={OPERATOR_LOGOS[op.slug]} alt={op.name} style={{ width: '80%', height: '80%', objectFit: 'contain' }} />
              </span>
              <span style={{ fontSize: 12.5, fontWeight: 700, color: 'var(--text-primary)' }}>{op.name}</span>
            </span>
          ))}
        </motion.div>

        {/* Trust signals */}
        <motion.div {...anim(5)} style={{ display: 'flex', gap: 16, justifyContent: 'center', flexWrap: 'wrap', marginBottom: '2rem' }}>
          {['No registration required', 'Updated daily', 'Free to use'].map(item => (
            <span key={item} style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 12, color: 'var(--text-muted)', fontWeight: 500 }}>
              <CheckCircle size={13} style={{ color: '#22C55E' }} /> {item}
            </span>
          ))}
        </motion.div>

        {/* Footer disclaimer */}
        <motion.p {...anim(6)} style={{ fontSize: 11, color: 'var(--text-muted)', textAlign: 'center', lineHeight: 1.9, margin: 0, opacity: 0.6 }}>
          Independent &amp; non-contractual · Indépendant &amp; non contractuel
          <br />
          <span style={{ direction: 'rtl', display: 'inline-block' }}>مستقل وغير تعاقدي · غير تابع لأي مشغل</span>
        </motion.p>

      </div>
    </div>
  )
}
