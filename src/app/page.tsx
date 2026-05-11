'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useSession } from 'next-auth/react'
import { motion, AnimatePresence, type Transition } from 'framer-motion'
import { Zap, BarChart3, Sparkles, Bookmark, RefreshCw, ArrowRight } from 'lucide-react'
import { useLang } from '@/lib/lang-context'
import { OPERATOR_LOGOS } from '@/lib/utils'
import type { Lang } from '@/lib/i18n'

const LANG_OPTIONS: { code: Lang; flag: string; label: string; sub: string; dir: 'ltr' | 'rtl' }[] = [
  { code: 'en', flag: '🇬🇧', label: 'English',  sub: 'Browse & compare plans',  dir: 'ltr' },
  { code: 'fr', flag: '🇫🇷', label: 'Français', sub: 'Comparez les forfaits',   dir: 'ltr' },
  { code: 'ar', flag: '🇩🇿', label: 'العربية',  sub: 'تصفح وقارن العروض',       dir: 'rtl' },
]

const OPERATORS = [
  { slug: 'djezzy',  name: 'Djezzy',  color: '#E30613' },
  { slug: 'ooredoo', name: 'Ooredoo', color: '#E20074' },
  { slug: 'mobilis', name: 'Mobilis', color: '#00A651' },
]

const FEATURES = [
  { icon: <BarChart3 size={22} />, title: 'Compare plans',          desc: 'Side-by-side across all 3 operators',      color: '#2563EB' },
  { icon: <Sparkles size={22} />,  title: 'Smart recommendations',  desc: 'Personalised picks for your usage',         color: '#7C3AED' },
  { icon: <Bookmark size={22} />,  title: 'Save your favourites',   desc: 'Bookmark and revisit any time',             color: '#0891B2' },
  { icon: <RefreshCw size={22} />, title: 'Live scraped data',       desc: 'Updated daily from operator websites',     color: '#059669' },
]


function anim(i: number) {
  return {
    initial: { opacity: 0, y: 28 },
    animate: { opacity: 1, y: 0 },
    transition: { duration: 0.55, delay: i * 0.1, ease: [0.22, 1, 0.36, 1] } as Transition,
  }
}

export default function LandingPage() {
  const { setLang } = useLang()
  const router = useRouter()
  const { status } = useSession()
  const [hovered, setHovered] = useState<string | null>(null)

  useEffect(() => {
    if (status === 'authenticated') router.replace('/offers')
  }, [status, router])

  if (status === 'loading' || status === 'authenticated') {
    return (
      <div style={{ minHeight: '100vh', background: 'var(--bg-page)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ width: 32, height: 32, border: '3px solid var(--border-base)', borderTopColor: 'var(--accent)', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
      </div>
    )
  }

  function choose(code: Lang) {
    setLang(code)
    router.push('/offers')
  }

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-page)', overflowX: 'hidden' }}>

      {/* ── Hero section ─────────────────────────────────────────────── */}
      <div style={{
        background: 'linear-gradient(160deg, var(--bg-elevated) 0%, var(--bg-card) 50%, var(--bg-page) 100%)',
        borderBottom: '1px solid var(--border-subtle)',
        padding: '5rem 1.5rem 4rem',
        textAlign: 'center',
        position: 'relative',
        overflow: 'hidden',
      }}>
        {/* Subtle grid background */}
        <div style={{
          position: 'absolute', inset: 0, pointerEvents: 'none',
          backgroundImage: 'radial-gradient(var(--border-base) 1px, transparent 1px)',
          backgroundSize: '32px 32px', opacity: 0.5,
        }} />

        {/* Accent blobs — very subtle */}
        <div style={{ position: 'absolute', top: -80, left: '20%', width: 400, height: 400, borderRadius: '50%', background: 'var(--accent-muted)', pointerEvents: 'none', filter: 'blur(60px)' }} />
        <div style={{ position: 'absolute', bottom: -60, right: '15%', width: 300, height: 300, borderRadius: '50%', background: 'var(--bg-subtle)', pointerEvents: 'none', filter: 'blur(40px)' }} />

        <div style={{ position: 'relative', maxWidth: 680, margin: '0 auto' }}>

          {/* Brand mark */}
          <motion.div {...anim(0)} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12, marginBottom: '1.75rem' }}>
            <motion.div
              animate={{ rotate: [0, 5, -5, 0] }}
              transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
              style={{
                width: 56, height: 56, borderRadius: 16,
                background: 'linear-gradient(135deg, #2563EB 0%, #1D4ED8 100%)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                boxShadow: '0 8px 24px rgba(37,99,235,0.35)',
              }}>
              <Zap size={26} color="white" fill="white" />
            </motion.div>
            <div style={{ textAlign: 'left' }}>
              <div style={{ fontSize: '1.5rem', fontWeight: 900, letterSpacing: '-0.03em', lineHeight: 1.1, color: 'var(--text-primary)' }}>
                Mobile<span style={{ color: 'var(--accent)' }}>Match</span>
              </div>
              <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.15em', textTransform: 'uppercase', color: 'var(--text-muted)' }}>Algeria</div>
            </div>
          </motion.div>

          {/* Headline */}
          <motion.h1 {...anim(1)} style={{
            fontSize: 'clamp(2rem, 6vw, 3rem)', fontWeight: 900,
            letterSpacing: '-0.03em', lineHeight: 1.1,
            color: 'var(--text-primary)', marginBottom: '1rem',
          }}>
            Find the best mobile plan{' '}
            <span className="gradient-text">in Algeria</span>
          </motion.h1>

          {/* Operator strip */}
          <motion.div {...anim(3)} style={{ display: 'flex', justifyContent: 'center', gap: 10, flexWrap: 'wrap', marginBottom: '3rem' }}>
            {OPERATORS.map(op => (
              <motion.div
                key={op.slug}
                whileHover={{ y: -4, scale: 1.05 }}
                transition={{ type: 'spring', stiffness: 400, damping: 15 }}
                style={{
                  display: 'flex', alignItems: 'center', gap: 8,
                  padding: '8px 16px 8px 8px',
                  background: 'var(--bg-card)', border: `1.5px solid ${op.color}30`,
                  borderRadius: 100, cursor: 'default',
                  boxShadow: `0 2px 8px ${op.color}20`,
                }}
              >
                <div style={{ width: 28, height: 28, borderRadius: 8, overflow: 'hidden', background: op.color, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <img src={OPERATOR_LOGOS[op.slug]} alt={op.name} style={{ width: '80%', height: '80%', objectFit: 'contain' }} />
                </div>
                <span style={{ fontWeight: 700, fontSize: 13, color: 'var(--text-primary)' }}>{op.name}</span>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </div>

      {/* ── Feature tiles ──────────────────────────────────────────── */}
      <div style={{ maxWidth: 900, margin: '0 auto', padding: '3.5rem 1.5rem 2rem' }}>
        <motion.div
          initial="hidden"
          animate="visible"
          variants={{ visible: { transition: { staggerChildren: 0.08 } } }}
          style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))', gap: '1rem' }}
        >
          {FEATURES.map((f, i) => (
            <motion.div
              key={i}
              variants={{ hidden: { opacity: 0, y: 20 }, visible: { opacity: 1, y: 0, transition: { duration: 0.45, ease: [0.22,1,0.36,1] } } }}
              whileHover={{ y: -5, transition: { type: 'spring', stiffness: 400, damping: 18 } }}
              style={{
                background: 'var(--bg-card)', border: '1.5px solid var(--border-base)',
                borderRadius: 16, padding: '1.25rem 1.125rem',
                boxShadow: 'var(--shadow-sm)',
                cursor: 'default',
              }}
            >
              <div style={{
                width: 44, height: 44, borderRadius: 12, marginBottom: '0.875rem',
                background: `${f.color}12`, border: `1px solid ${f.color}20`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: f.color,
              }}>
                {f.icon}
              </div>
              <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 4, lineHeight: 1.3 }}>{f.title}</div>
              <div style={{ fontSize: 12.5, color: 'var(--text-muted)', lineHeight: 1.5 }}>{f.desc}</div>
            </motion.div>
          ))}
        </motion.div>
      </div>

      {/* ── Language / entry ──────────────────────────────────────── */}
      <div style={{ maxWidth: 820, margin: '0 auto', padding: '0 1.5rem 5rem' }}>

        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: '1.75rem' }}>
          <div style={{ flex: 1, height: 1, background: 'var(--border-subtle)' }} />
          <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>
            Choose your language to start
          </span>
          <div style={{ flex: 1, height: 1, background: 'var(--border-subtle)' }} />
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem' }}>
          {LANG_OPTIONS.map(opt => (
            <motion.button
              key={opt.code}
              onClick={() => choose(opt.code)}
              dir={opt.dir}
              whileHover={{ y: -6, scale: 1.02 }}
              whileTap={{ scale: 0.97 }}
              transition={{ type: 'spring', stiffness: 400, damping: 18 }}
              onHoverStart={() => setHovered(opt.code)}
              onHoverEnd={() => setHovered(null)}
              style={{
                position: 'relative', overflow: 'hidden',
                background: 'var(--bg-card)',
                border: `2px solid ${hovered === opt.code ? 'var(--accent)' : 'var(--border-base)'}`,
                borderRadius: 18, cursor: 'pointer', fontFamily: 'inherit',
                padding: '1.5rem 1.375rem',
                boxShadow: hovered === opt.code
                  ? 'var(--shadow-accent-lg)'
                  : 'var(--shadow-sm)',
                textAlign: opt.dir === 'rtl' ? 'right' : 'left',
                transition: 'border-color 0.2s, box-shadow 0.2s',
              }}
            >
              {/* Subtle background gradient on hover */}
              <AnimatePresence>
                {hovered === opt.code && (
                  <motion.div
                    initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                    style={{
                      position: 'absolute', inset: 0,
                      background: 'linear-gradient(135deg, rgba(37,99,235,0.04) 0%, transparent 60%)',
                      pointerEvents: 'none',
                    }}
                  />
                )}
              </AnimatePresence>

              {/* Flag + label */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: '0.75rem', flexDirection: opt.dir === 'rtl' ? 'row-reverse' : 'row' }}>
                <span style={{ fontSize: 28, lineHeight: 1 }}>{opt.flag}</span>
                <span style={{ fontSize: 22, fontWeight: 900, color: 'var(--text-primary)', letterSpacing: '-0.02em', lineHeight: 1 }}>{opt.label}</span>
              </div>

              <div style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: '1rem', lineHeight: 1.4 }}>{opt.sub}</div>

              {/* CTA */}
              <div style={{
                display: 'inline-flex', alignItems: 'center', gap: 6,
                fontSize: 13, fontWeight: 700,
                color: hovered === opt.code ? 'var(--accent)' : 'var(--text-secondary)',
                transition: 'color 0.2s',
                flexDirection: opt.dir === 'rtl' ? 'row-reverse' : 'row',
              }}>
                {opt.dir === 'rtl' ? 'ابدأ الآن' : opt.code === 'fr' ? 'Commencer' : 'Get started'}
                <motion.span animate={{ x: hovered === opt.code ? 3 : 0 }} transition={{ duration: 0.2 }}>
                  <ArrowRight size={13} style={{ transform: opt.dir === 'rtl' ? 'rotate(180deg)' : undefined }} />
                </motion.span>
              </div>
            </motion.button>
          ))}
        </div>

        {/* Disclaimer */}
        <p style={{ textAlign: 'center', fontSize: 11.5, color: 'var(--text-muted)', marginTop: '2.5rem', lineHeight: 2, opacity: 0.65 }}>
          Independent &amp; non-contractual · Indépendant &amp; non contractuel
          <br />
          <span style={{ direction: 'rtl', display: 'inline-block' }}>مستقل وغير تعاقدي · غير تابع لأي مشغل</span>
        </p>
      </div>
    </div>
  )
}
