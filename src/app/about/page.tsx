'use client'

import Link from 'next/link'
import { Zap, Shield, Database, RefreshCw, BarChart2, Target, Star, ArrowRight } from 'lucide-react'

export default function AboutPage() {
  const features = [
    {
      icon: <Database size={22}/>,
      title: 'Real-time data',
      description: 'Our system automatically scrapes and updates offer data daily from Mobilis, Djezzy, and Ooredoo official websites.',
      color: '#4f7fff',
    },
    {
      icon: <BarChart2 size={22}/>,
      title: 'Side-by-side comparison',
      description: 'Compare up to 3 plans simultaneously with interactive radar charts, bar graphs, and a detailed spec table.',
      color: '#7c3aed',
    },
    {
      icon: <Target size={22}/>,
      title: 'AI recommendation engine',
      description: 'Our scoring algorithm matches your usage profile (budget, data, calls) to the offers most likely to save you money.',
      color: '#f59e0b',
    },
    {
      icon: <Star size={22}/>,
      title: 'Save & track offers',
      description: 'Bookmark your favourite plans and compare them later. Logged-in users get personalised notifications on price changes.',
      color: '#4ade80',
    },
    {
      icon: <Shield size={22}/>,
      title: 'Privacy first',
      description: 'We do not sell your data. Your saved preferences and usage profile are stored securely and are only used to personalise your recommendations.',
      color: '#f87171',
    },
    {
      icon: <RefreshCw size={22}/>,
      title: 'Always up to date',
      description: 'Every day at 3:00 AM our scraper refreshes all three operators. Stale data is automatically flagged and retired.',
      color: '#a78bfa',
    },
  ]

  const operators = [
    { name: 'Mobilis',  color: '#00A651', emoji: '🟢', url: 'https://mobilis.dz/',            desc: 'State-owned operator, broadest 4G/5G coverage across Algeria.' },
    { name: 'Djezzy',  color: '#E30613', emoji: '🔴', url: 'https://www.djezzy5g.dz/#Offer', desc: 'Fastest growing 5G network, competitive prepaid ZID range.' },
    { name: 'Ooredoo', color: '#E20074', emoji: '🟣', url: 'https://www.ooredoo.dz/',         desc: 'Premium postpaid & Dima plans, exclusive streaming perks.' },
  ]

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-dark)', padding: '0 0 4rem' }}>

      {/* Hero */}
      <section style={{ padding: '4rem 1.5rem 3rem', textAlign: 'center', position: 'relative', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', top: 0, left: '30%', width: 500, height: 400, borderRadius: '50%', background: 'radial-gradient(circle, rgba(79,127,255,0.07) 0%, transparent 70%)', pointerEvents: 'none' }}/>
        <div style={{ maxWidth: 680, margin: '0 auto', position: 'relative' }}>
          <div style={{ width: 64, height: 64, borderRadius: 20, margin: '0 auto 1.5rem', background: 'linear-gradient(135deg, #4f7fff, #7c3aed)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Zap size={30} color="white"/>
          </div>
          <h1 style={{ fontSize: 'clamp(1.875rem, 5vw, 3rem)', fontWeight: 900, marginBottom: '1rem' }}>
            About <span style={{ background: 'linear-gradient(135deg, #6b93ff, #a78bfa)', backgroundClip: 'text', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
              Mobile Match Algeria
            </span>
          </h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '1.0625rem', lineHeight: 1.75, maxWidth: 560, margin: '0 auto 2rem' }}>
            We help Algerians cut through the complexity of mobile plans and find the best deal for their actual usage — completely free, with no hidden agenda.
          </p>
          <Link href="/" style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '0.8rem 1.75rem', borderRadius: 12, background: 'linear-gradient(135deg, #4f7fff, #7c3aed)', color: 'white', textDecoration: 'none', fontWeight: 700, fontSize: 15 }}>
            Browse plans <ArrowRight size={15}/>
          </Link>
        </div>
      </section>

      {/* Stats */}
      <section style={{ padding: '0 1.5rem 3rem' }}>
        <div style={{ maxWidth: 900, margin: '0 auto', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '1rem' }}>
          {[
            { value: '3', label: 'Operators covered' },
            { value: '59+', label: 'Plans tracked' },
            { value: 'Daily', label: 'Update frequency' },
            { value: '100%', label: 'Free to use' },
          ].map(stat => (
            <div key={stat.label} className="glass" style={{ borderRadius: 14, padding: '1.375rem', textAlign: 'center' }}>
              <div style={{ fontSize: '2rem', fontWeight: 900, background: 'linear-gradient(135deg, #6b93ff, #a78bfa)', backgroundClip: 'text', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>{stat.value}</div>
              <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginTop: 4, fontWeight: 500 }}>{stat.label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* Features */}
      <section style={{ padding: '0 1.5rem 3rem' }}>
        <div style={{ maxWidth: 980, margin: '0 auto' }}>
          <h2 style={{ fontSize: '1.5rem', fontWeight: 800, textAlign: 'center', marginBottom: '2rem' }}>
            What we offer
          </h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1rem' }}>
            {features.map(f => (
              <div key={f.title} className="glass" style={{ borderRadius: 16, padding: '1.5rem', borderTop: `2px solid ${f.color}30` }}>
                <div style={{ width: 44, height: 44, borderRadius: 12, background: `${f.color}15`, border: `1px solid ${f.color}30`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: f.color, marginBottom: '1rem' }}>
                  {f.icon}
                </div>
                <h3 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: 6 }}>{f.title}</h3>
                <p style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.65 }}>{f.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Operators */}
      <section style={{ padding: '0 1.5rem 3rem' }}>
        <div style={{ maxWidth: 900, margin: '0 auto' }}>
          <h2 style={{ fontSize: '1.5rem', fontWeight: 800, textAlign: 'center', marginBottom: '2rem' }}>
            Operators we cover
          </h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '1rem' }}>
            {operators.map(op => (
              <a key={op.name} href={op.url} target="_blank" rel="noopener noreferrer" style={{ textDecoration: 'none' }}>
                <div className="glass" style={{ borderRadius: 16, padding: '1.5rem', borderLeft: `3px solid ${op.color}`, cursor: 'pointer', transition: 'transform 0.15s' }}
                  onMouseEnter={e => (e.currentTarget.style.transform = 'translateY(-2px)')}
                  onMouseLeave={e => (e.currentTarget.style.transform = 'translateY(0)')}
                >
                  <div style={{ fontSize: '2rem', marginBottom: '0.75rem' }}>{op.emoji}</div>
                  <h3 style={{ fontSize: '1.125rem', fontWeight: 800, color: op.color, marginBottom: 6 }}>{op.name}</h3>
                  <p style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.6 }}>{op.desc}</p>
                  <div style={{ marginTop: '0.875rem', fontSize: 12, color: op.color, display: 'flex', alignItems: 'center', gap: 4, fontWeight: 600 }}>
                    Visit website <ArrowRight size={11}/>
                  </div>
                </div>
              </a>
            ))}
          </div>
        </div>
      </section>

      {/* Disclaimer */}
      <section style={{ padding: '0 1.5rem' }}>
        <div style={{ maxWidth: 780, margin: '0 auto', padding: '1.25rem 1.5rem', borderRadius: 14, background: 'rgba(79,127,255,0.06)', border: '1px solid rgba(79,127,255,0.15)' }}>
          <p style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.75 }}>
            <strong style={{ color: '#6b93ff' }}>Disclaimer:</strong>{' '}
            Mobile Match Algeria is an independent comparison service and is not affiliated with Mobilis, Djezzy, or Ooredoo.
            Offer data is sourced from publicly available information on operators' official websites and may not always reflect the most current pricing or availability.
            Always verify offers directly with your chosen operator before subscribing.
          </p>
        </div>
      </section>
    </div>
  )
}
