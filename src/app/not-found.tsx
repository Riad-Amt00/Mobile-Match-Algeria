import Link from 'next/link'
import { Home, Search, BarChart2, Target } from 'lucide-react'

export default function NotFound() {
  return (
    <div style={{
      minHeight: '100vh', background: 'var(--bg-dark)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: '2rem 1.5rem', position: 'relative', overflow: 'hidden',
    }}>
      {/* Background glow */}
      <div style={{ position: 'absolute', top: '20%', left: '30%', width: 500, height: 500, borderRadius: '50%', background: 'radial-gradient(circle, rgba(139,92,246,0.06) 0%, transparent 70%)', pointerEvents: 'none' }}/>
      <div style={{ position: 'absolute', bottom: '10%', right: '20%', width: 400, height: 400, borderRadius: '50%', background: 'radial-gradient(circle, rgba(124,58,237,0.05) 0%, transparent 70%)', pointerEvents: 'none' }}/>

      <div style={{ textAlign: 'center', position: 'relative', maxWidth: 520 }}>
        {/* 404 number */}
        <div style={{
          fontSize: 'clamp(6rem, 20vw, 10rem)', fontWeight: 900, lineHeight: 1,
          background: 'linear-gradient(135deg, #8B5CF6 0%, #7c3aed 50%, #8B5CF6 100%)',
          backgroundClip: 'text', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
          marginBottom: '1rem',
        }}>
          404
        </div>

        <h1 style={{ fontSize: '1.625rem', fontWeight: 800, marginBottom: '0.75rem' }}>
          Page not found
        </h1>
        <p style={{ color: 'var(--text-secondary)', fontSize: 15, marginBottom: '2.5rem', lineHeight: 1.7 }}>
          Hmm, we couldn't find that page. It may have moved or never existed.<br/>
          Let's get you back on track.
        </p>

        <div style={{ display: 'flex', gap: 10, justifyContent: 'center', flexWrap: 'wrap' }}>
          <Link href="/" style={{
            display: 'inline-flex', alignItems: 'center', gap: 8,
            padding: '0.75rem 1.5rem', borderRadius: 12,
            background: 'linear-gradient(135deg, #8B5CF6, #7c3aed)',
            color: 'white', textDecoration: 'none', fontWeight: 700, fontSize: 14,
          }}>
            <Home size={15}/> Back to home
          </Link>
          <Link href="/compare" style={{
            display: 'inline-flex', alignItems: 'center', gap: 8,
            padding: '0.75rem 1.25rem', borderRadius: 12,
            background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)',
            color: 'var(--text-primary)', textDecoration: 'none', fontWeight: 600, fontSize: 14,
          }}>
            <BarChart2 size={15}/> Compare plans
          </Link>
          <Link href="/recommend" style={{
            display: 'inline-flex', alignItems: 'center', gap: 8,
            padding: '0.75rem 1.25rem', borderRadius: 12,
            background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)',
            color: 'var(--text-primary)', textDecoration: 'none', fontWeight: 600, fontSize: 14,
          }}>
            <Target size={15}/> Get recommendations
          </Link>
        </div>

        {/* Quick search hint */}
        <div style={{ marginTop: '2.5rem', padding: '1rem 1.25rem', borderRadius: 12, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)' }}>
          <p style={{ color: 'var(--text-secondary)', fontSize: 13, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
            <Search size={13}/> Looking for a specific plan? Try the{' '}
            <Link href="/" style={{ color: '#A78BFA', textDecoration: 'none', fontWeight: 600 }}>search on our homepage</Link>
          </p>
        </div>
      </div>
    </div>
  )
}
