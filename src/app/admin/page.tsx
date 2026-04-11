'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { ArrowLeft, RefreshCw, CheckCircle, XCircle, Clock, AlertTriangle, Cpu, Activity } from 'lucide-react'

interface ScrapeLog {
  id: string
  status: string
  offersFound: number
  offersAdded: number
  offersUpdated: number
  errorMessage?: string
  duration?: number
  startedAt: string
  completedAt?: string
  operator: { name: string; slug: string; primaryColor: string }
}

export default function AdminPage() {
  const [logs, setLogs] = useState<ScrapeLog[]>([])
  const [loading, setLoading] = useState(true)
  const [scraping, setScraping] = useState(false)
  const [scrapeResult, setScrapeResult] = useState<any>(null)

  useEffect(() => { fetchLogs() }, [])

  async function fetchLogs() {
    try {
      const res = await fetch('/api/scrape')
      if (!res.ok) { setLogs([]); return }
      const data = await res.json()
      setLogs(data.logs || [])
    } catch { setLogs([]) }
    finally { setLoading(false) }
  }

  async function runScrape() {
    setScraping(true)
    setScrapeResult(null)
    try {
      const res = await fetch('/api/scrape', { method: 'POST' })
      const data = await res.json()
      setScrapeResult(data)
      fetchLogs()
    } catch { setScrapeResult({ error: 'Connection failed' }) }
    finally { setScraping(false) }
  }

  const statusIcon = (status: string) => ({
    SUCCESS: <CheckCircle size={14} color="#4ade80"/>,
    FAILED:  <XCircle size={14} color="#f87171"/>,
    RUNNING: <RefreshCw size={14} color="#6b93ff" style={{ animation: 'spin 1s linear infinite' }}/>,
    PARTIAL: <AlertTriangle size={14} color="#f59e0b"/>,
  })[status] || <Clock size={14} color="var(--text-secondary)"/>

  const statusColor = (status: string) =>
    ({ SUCCESS: '#4ade80', FAILED: '#f87171', RUNNING: '#6b93ff', PARTIAL: '#f59e0b' })[status] || 'var(--text-secondary)'

  const stats = [
    { icon: <Activity size={20}/>,                            label: 'Total Scrapes',    value: logs.length },
    { icon: <CheckCircle size={20} color="#4ade80"/>,         label: 'Successful',       value: logs.filter(l => l.status === 'SUCCESS').length },
    { icon: <XCircle size={20} color="#f87171"/>,             label: 'Failed',           value: logs.filter(l => l.status === 'FAILED').length },
    { icon: <Cpu size={20} color="#6b93ff"/>,                 label: 'Total Offers Found', value: logs.reduce((a, l) => a + l.offersFound, 0) },
  ]

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-dark)', padding: '2rem 1.5rem' }}>
      <div style={{ maxWidth: 1050, margin: '0 auto' }}>
        <Link href="/" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, color: 'var(--text-secondary)', textDecoration: 'none', fontSize: 14, marginBottom: '2rem' }}>
          <ArrowLeft size={16}/> Back
        </Link>

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '2rem', flexWrap: 'wrap', gap: '1rem' }}>
          <div>
            <h1 style={{ fontSize: '1.875rem', fontWeight: 900, marginBottom: 6 }}>
              Admin <span className="gradient-text">Dashboard</span>
            </h1>
            <p style={{ color: 'var(--text-secondary)', fontSize: 14 }}>
              Manage scraping jobs and monitor operator data updates
            </p>
          </div>
          <button
            onClick={runScrape}
            disabled={scraping}
            className="btn-primary"
            style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '0.75rem 1.5rem', borderRadius: 12 }}
          >
            <RefreshCw size={15} style={scraping ? { animation: 'spin 1s linear infinite' } : undefined}/>
            {scraping ? 'Scraping in progress...' : '🚀 Run Scraper Now'}
          </button>
        </div>

        {/* Scrape Result Banner */}
        {scrapeResult && (
          <div className="glass" style={{ borderRadius: 14, padding: '1.25rem', marginBottom: '1.5rem', border: scrapeResult.error ? '1px solid rgba(248,113,113,0.3)' : '1px solid rgba(74,222,128,0.25)' }}>
            {scrapeResult.error ? (
              <p style={{ color: '#f87171', fontSize: 14 }}>❌ {scrapeResult.error} — Are you logged in as an admin?</p>
            ) : (
              <div>
                <p style={{ fontWeight: 700, marginBottom: '0.75rem', color: '#4ade80' }}>✅ Scraping complete</p>
                <div style={{ display: 'flex', gap: '1.5rem', flexWrap: 'wrap' }}>
                  {scrapeResult.results?.map((r: any, i: number) => (
                    <div key={i} style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
                      <span style={{ color: statusColor(r.status) }}>{r.operator}</span>: {r.offersFound} found, {r.offersAdded} added, {r.offersUpdated} updated
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Stats */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', marginBottom: '2rem' }}>
          {stats.map(stat => (
            <div key={stat.label} className="glass" style={{ borderRadius: 14, padding: '1.25rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
              <div style={{ color: 'var(--text-secondary)', flexShrink: 0 }}>{stat.icon}</div>
              <div>
                <div style={{ fontSize: '1.75rem', fontWeight: 900 }}>{stat.value}</div>
                <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 2 }}>{stat.label}</div>
              </div>
            </div>
          ))}
        </div>

        {/* Logs Table */}
        <div className="glass" style={{ borderRadius: 16, overflow: 'hidden' }}>
          <div style={{ padding: '1.25rem 1.5rem', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 8 }}>
            <Clock size={16} color="var(--text-secondary)"/>
            <h2 style={{ fontSize: '1rem', fontWeight: 700 }}>Scrape History</h2>
          </div>

          {loading ? (
            <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-secondary)' }}>
              <div style={{ width: 32, height: 32, border: '3px solid rgba(79,127,255,0.3)', borderTopColor: '#4f7fff', borderRadius: '50%', animation: 'spin 0.8s linear infinite', margin: '0 auto 1rem' }}/>
              Loading logs...
            </div>
          ) : logs.length === 0 ? (
            <div style={{ padding: '3rem', textAlign: 'center' }}>
              <Activity size={36} style={{ opacity: 0.2, margin: '0 auto 1rem', display: 'block' }}/>
              <p style={{ color: 'var(--text-secondary)', marginBottom: '1rem' }}>
                No logs yet. Run your first scrape to get started!
              </p>
              <button onClick={runScrape} className="btn-primary" style={{ borderRadius: 10 }}>
                Run Scraper
              </button>
            </div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--border)' }}>
                    {['Operator', 'Status', 'Found', 'Added', 'Updated', 'Duration', 'Date'].map(h => (
                      <th key={h} style={{ padding: '0.875rem 1.25rem', fontSize: 12, fontWeight: 700, color: 'var(--text-secondary)', textAlign: 'left', whiteSpace: 'nowrap', letterSpacing: '0.03em', textTransform: 'uppercase' }}>
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {logs.map((log, i) => (
                    <tr key={log.id} style={{ borderBottom: i < logs.length - 1 ? '1px solid var(--border)' : 'none' }}>
                      <td style={{ padding: '1rem 1.25rem' }}>
                        <span style={{ fontSize: 13, fontWeight: 700, padding: '3px 10px', borderRadius: 50, background: `${log.operator.primaryColor}20`, color: log.operator.primaryColor }}>
                          {log.operator.name}
                        </span>
                      </td>
                      <td style={{ padding: '1rem 1.25rem' }}>
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 12, fontWeight: 700, color: statusColor(log.status) }}>
                          {statusIcon(log.status)} {log.status}
                        </span>
                      </td>
                      <td style={{ padding: '1rem 1.25rem', fontSize: 14, fontWeight: 700 }}>{log.offersFound}</td>
                      <td style={{ padding: '1rem 1.25rem', fontSize: 14, color: '#4ade80', fontWeight: 600 }}>+{log.offersAdded}</td>
                      <td style={{ padding: '1rem 1.25rem', fontSize: 14, color: '#6b93ff', fontWeight: 600 }}>{log.offersUpdated}</td>
                      <td style={{ padding: '1rem 1.25rem', fontSize: 13, color: 'var(--text-secondary)' }}>
                        {log.duration ? `${(log.duration / 1000).toFixed(1)}s` : '—'}
                      </td>
                      <td style={{ padding: '1rem 1.25rem', fontSize: 12, color: 'var(--text-secondary)', whiteSpace: 'nowrap' }}>
                        {new Date(log.startedAt).toLocaleString('en-GB')}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Info box */}
        <div style={{ marginTop: '1.5rem', padding: '1rem 1.25rem', borderRadius: 12, background: 'rgba(79,127,255,0.07)', border: '1px solid rgba(79,127,255,0.2)', fontSize: 13, color: 'var(--text-secondary)' }}>
          <strong style={{ color: '#6b93ff' }}>ℹ️ Automated scraping:</strong> The system is configured to update offers every day at 3:00 AM. You can also trigger a manual scrape above.
        </div>

        {/* ── Offer Management ── */}
        <OfferManager />
      </div>
    </div>
  )
}

/* ─────────────────────────────────────────────────────────────────── */
function OfferManager() {
  const [offers, setOffers] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [toggling, setToggling] = useState<string | null>(null)

  useEffect(() => { fetchOffers() }, [])

  async function fetchOffers() {
    setLoading(true)
    try {
      const res = await fetch('/api/offers?type=all')
      const data = await res.json()
      setOffers(data.offers || [])
    } catch {
      setOffers([])
    } finally {
      setLoading(false)
    }
  }

  async function toggleField(id: string, field: 'isActive' | 'isFeatured', current: boolean) {
    setToggling(id + field)
    try {
      await fetch(`/api/offers/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ [field]: !current }),
      })
      setOffers(prev => prev.map(o => o.id === id ? { ...o, [field]: !current } : o))
    } finally {
      setToggling(null)
    }
  }

  const filtered = offers.filter(o =>
    !search ||
    o.name.toLowerCase().includes(search.toLowerCase()) ||
    o.operator.name.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div style={{ marginTop: '2.5rem' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem', flexWrap: 'wrap', gap: '0.75rem' }}>
        <h2 style={{ fontSize: '1.125rem', fontWeight: 800, display: 'flex', alignItems: 'center', gap: 8 }}>
          <Cpu size={18} style={{ color: '#6b93ff' }}/> Offer Management
          <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-secondary)', background: 'rgba(255,255,255,0.06)', padding: '2px 8px', borderRadius: 50 }}>
            {offers.length} total · {offers.filter(o => o.isActive).length} active
          </span>
        </h2>
        <input
          type="text"
          placeholder="Search offers..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid var(--border)', borderRadius: 10, padding: '0.5rem 0.875rem', color: 'var(--text-primary)', fontSize: 13, outline: 'none', fontFamily: 'inherit', width: 220 }}
        />
      </div>

      <div className="glass" style={{ borderRadius: 16, overflow: 'hidden' }}>
        {loading ? (
          <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-secondary)' }}>
            <div style={{ width: 32, height: 32, border: '3px solid rgba(79,127,255,0.3)', borderTopColor: '#4f7fff', borderRadius: '50%', animation: 'spin 0.8s linear infinite', margin: '0 auto 1rem' }}/>
            Loading offers...
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border)' }}>
                  {['Offer', 'Operator', 'Type', 'Price', 'Data', 'Active', 'Featured'].map(h => (
                    <th key={h} style={{ padding: '0.875rem 1rem', fontSize: 11, fontWeight: 700, color: 'var(--text-secondary)', textAlign: 'left', whiteSpace: 'nowrap', letterSpacing: '0.05em', textTransform: 'uppercase' }}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map((offer, i) => (
                  <tr key={offer.id} style={{ borderBottom: i < filtered.length - 1 ? '1px solid var(--border)' : 'none', opacity: offer.isActive ? 1 : 0.45, transition: 'opacity .2s' }}>
                    <td style={{ padding: '0.75rem 1rem', fontSize: 13, fontWeight: 700, maxWidth: 180, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {offer.name}
                    </td>
                    <td style={{ padding: '0.75rem 1rem' }}>
                      <span style={{ fontSize: 12, padding: '2px 8px', borderRadius: 50, background: `${offer.operator.primaryColor}20`, color: offer.operator.primaryColor, fontWeight: 700 }}>
                        {offer.operator.name}
                      </span>
                    </td>
                    <td style={{ padding: '0.75rem 1rem', fontSize: 12, color: 'var(--text-secondary)' }}>
                      {{ PREPAID: 'Prepaid', POSTPAID: 'Postpaid', DATA_ONLY: 'Data only' }[offer.type as string] || offer.type}
                    </td>
                    <td style={{ padding: '0.75rem 1rem', fontSize: 13, fontWeight: 700, color: '#6b93ff' }}>
                      {offer.priceDA.toLocaleString()} DA
                    </td>
                    <td style={{ padding: '0.75rem 1rem', fontSize: 13, color: 'var(--text-secondary)' }}>
                      {offer.dataGB === -1 ? '∞' : `${offer.dataGB} GB`}
                    </td>
                    <td style={{ padding: '0.75rem 1rem' }}>
                      <button
                        onClick={() => toggleField(offer.id, 'isActive', offer.isActive)}
                        disabled={toggling === offer.id + 'isActive'}
                        style={{ padding: '4px 12px', borderRadius: 50, fontSize: 12, fontWeight: 700, cursor: 'pointer', border: 'none', background: offer.isActive ? 'rgba(74,222,128,0.15)' : 'rgba(248,113,113,0.1)', color: offer.isActive ? '#4ade80' : '#f87171', transition: 'all .2s' }}
                      >
                        {offer.isActive ? '● Active' : '○ Hidden'}
                      </button>
                    </td>
                    <td style={{ padding: '0.75rem 1rem' }}>
                      <button
                        onClick={() => toggleField(offer.id, 'isFeatured', offer.isFeatured)}
                        disabled={toggling === offer.id + 'isFeatured'}
                        style={{ padding: '4px 12px', borderRadius: 50, fontSize: 12, fontWeight: 700, cursor: 'pointer', border: 'none', background: offer.isFeatured ? 'rgba(245,158,11,0.15)' : 'rgba(255,255,255,0.06)', color: offer.isFeatured ? '#f59e0b' : 'var(--text-secondary)', transition: 'all .2s' }}
                      >
                        {offer.isFeatured ? '★ Featured' : '☆ Normal'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
