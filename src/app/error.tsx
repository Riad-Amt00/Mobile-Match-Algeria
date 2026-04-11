'use client'

import { useEffect } from 'react'
import Link from 'next/link'
import { Home, RefreshCw, AlertTriangle } from 'lucide-react'

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error('[GlobalError]', error)
  }, [error])

  return (
    <div style={{
      minHeight: '100vh', background: 'var(--bg-dark)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: '2rem 1.5rem',
    }}>
      <div style={{ textAlign: 'center', maxWidth: 480 }}>
        <div style={{ width: 64, height: 64, borderRadius: 20, margin: '0 auto 1.5rem', background: 'rgba(248,113,113,0.12)', border: '1px solid rgba(248,113,113,0.25)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <AlertTriangle size={28} color="#f87171"/>
        </div>
        <h1 style={{ fontSize: '1.625rem', fontWeight: 800, marginBottom: '0.75rem' }}>
          Something went wrong
        </h1>
        <p style={{ color: 'var(--text-secondary)', fontSize: 14, marginBottom: '2rem', lineHeight: 1.7 }}>
          An unexpected error occurred. This has been logged automatically.<br/>
          Try refreshing or go back to the homepage.
        </p>
        {error.digest && (
          <p style={{ fontSize: 11, color: 'var(--text-secondary)', opacity: 0.5, marginBottom: '1.5rem', fontFamily: 'monospace' }}>
            Error ID: {error.digest}
          </p>
        )}
        <div style={{ display: 'flex', gap: 10, justifyContent: 'center', flexWrap: 'wrap' }}>
          <button
            onClick={reset}
            style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '0.75rem 1.5rem', borderRadius: 12, background: 'linear-gradient(135deg, #4f7fff, #7c3aed)', color: 'white', border: 'none', cursor: 'pointer', fontWeight: 700, fontSize: 14 }}
          >
            <RefreshCw size={14}/> Try again
          </button>
          <Link
            href="/"
            style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '0.75rem 1.25rem', borderRadius: 12, background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', color: 'var(--text-primary)', textDecoration: 'none', fontWeight: 600, fontSize: 14 }}
          >
            <Home size={14}/> Back to home
          </Link>
        </div>
      </div>
    </div>
  )
}
