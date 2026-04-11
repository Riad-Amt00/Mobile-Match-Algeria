'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { ArrowLeft, RefreshCw, CheckCircle, XCircle, Clock, ChevronDown, AlertTriangle, Cpu } from 'lucide-react'

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
    } catch { setScrapeResult({ error: 'Échec de la connexion' }) }
    finally { setScraping(false) }
  }

  const statusIcon = (status: string) => ({
    SUCCESS: <CheckCircle size={14} color="#4ade80"/>,
    FAILED: <XCircle size={14} color="#f87171"/>,
    RUNNING: <RefreshCw size={14} color="#6b93ff" style={{ animation: 'spin 1s linear infinite' }}/>,
    PARTIAL: <AlertTriangle size={14} color="#f59e0b"/>,
  })[status] || <Clock size={14} color="var(--text-secondary)"/>

  const statusColor = (status: string) =>
    ({ SUCCESS: '#4ade80', FAILED: '#f87171', RUNNING: '#6b93ff', PARTIAL: '#f59e0b' })[status] || 'var(--text-secondary)'

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-dark)', padding: '2rem 1.5rem' }}>
      <div style={{ maxWidth: 1000, margin: '0 auto' }}>
        <Link href="/" style={{
          display: 'inline-flex', alignItems: 'center', gap: 6,
          color: 'var(--text-secondary)', textDecoration: 'none', fontSize: 14, marginBottom: '2rem',
        }}>
          <ArrowLeft size={16}/> Retour
        </Link>

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '2rem', flexWrap: 'wrap', gap: '1rem' }}>
          <div>
            <h1 className="section-title">
              Tableau de bord <span className="gradient-text">Admin</span>
            </h1>
            <p className="section-subtitle">Gestion du scraping et surveillance des opérateurs</p>
          </div>
          <button
            onClick={runScrape}
            disabled={scraping}
            className="btn-primary"
            style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '0.75rem 1.5rem' }}
          >
            <RefreshCw size={15} style={scraping ? { animation: 'spin 1s linear infinite' } : undefined}/>
            {scraping ? 'Scraping en cours...' : '🚀 Lancer le scraping'}
          </button>
        </div>

        {/* Scrape Result */}
        {scrapeResult && (
          <div className="glass" style={{ borderRadius: 14, padding: '1.25rem', marginBottom: '1.5rem', border: scrapeResult.error ? '1px solid rgba(248,113,113,0.3)' : '1px solid rgba(74,222,128,0.25)' }}>
            {scrapeResult.error ? (
              <p style={{ color: '#f87171', fontSize: 14 }}>❌ {scrapeResult.error} — Êtes-vous connecté en tant qu'admin?</p>
            ) : (
              <div>
                <p style={{ fontWeight: 700, marginBottom: '0.75rem', color: '#4ade80' }}>✅ Scraping terminé</p>
                <div style={{ display: 'flex', gap: '1.5rem', flexWrap: 'wrap' }}>
                  {scrapeResult.results?.map((r: any, i: number) => (
                    <div key={i} style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
                      <span style={{ color: statusColor(r.status) }}>{r.operator}</span>: {r.offersFound} trouvées, {r.offersAdded} ajoutées, {r.offersUpdated} mises à jour
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Stats */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '1rem', marginBottom: '2rem' }}>
          {[
            { icon: <Cpu size={20}/>, label: 'Total scrapes', value: logs.length },
            { icon: <CheckCircle size={20} color="#4ade80"/>, label: 'Succès', value: logs.filter(l => l.status === 'SUCCESS').length },
            { icon: <XCircle size={20} color="#f87171"/>, label: 'Échecs', value: logs.filter(l => l.status === 'FAILED').length },
            {
              icon: <RefreshCw size={20} color="#6b93ff"/>,
              label: 'Offres totales',
              value: logs.reduce((a, l) => a + l.offersFound, 0),
            },
          ].map(stat => (
            <div key={stat.label} className="glass" style={{ borderRadius: 12, padding: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.875rem' }}>
              <div style={{ color: 'var(--text-secondary)' }}>{stat.icon}</div>
              <div>
                <div style={{ fontSize: '1.5rem', fontWeight: 800 }}>{stat.value}</div>
                <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{stat.label}</div>
              </div>
            </div>
          ))}
        </div>

        {/* Logs Table */}
        <div className="glass" style={{ borderRadius: 16, overflow: 'hidden' }}>
          <div style={{ padding: '1.25rem 1.5rem', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 8 }}>
            <Clock size={16} color="var(--text-secondary)"/>
            <h2 style={{ fontSize: '1rem', fontWeight: 700 }}>Historique des scrapes</h2>
          </div>

          {loading ? (
            <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-secondary)' }}>Chargement...</div>
          ) : logs.length === 0 ? (
            <div style={{ padding: '3rem', textAlign: 'center' }}>
              <p style={{ color: 'var(--text-secondary)', marginBottom: '1rem' }}>Aucun log disponible. Lancez votre premier scraping!</p>
              <button onClick={runScrape} className="btn-primary">Lancer le scraping</button>
            </div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--border)' }}>
                    {['Opérateur', 'Statut', 'Trouvées', 'Ajoutées', 'Mises à jour', 'Durée', 'Date'].map(h => (
                      <th key={h} style={{ padding: '0.875rem 1.25rem', fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', textAlign: 'left', whiteSpace: 'nowrap' }}>
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {logs.map((log, i) => (
                    <tr key={log.id} style={{ borderBottom: i < logs.length - 1 ? '1px solid var(--border)' : 'none', transition: 'background 0.15s' }}>
                      <td style={{ padding: '0.875rem 1.25rem' }}>
                        <span style={{
                          fontSize: 13, fontWeight: 600, padding: '3px 10px', borderRadius: 50,
                          background: `${log.operator.primaryColor}20`, color: log.operator.primaryColor,
                        }}>
                          {log.operator.name}
                        </span>
                      </td>
                      <td style={{ padding: '0.875rem 1.25rem' }}>
                        <span style={{
                          display: 'inline-flex', alignItems: 'center', gap: 5,
                          fontSize: 12, fontWeight: 600, color: statusColor(log.status),
                        }}>
                          {statusIcon(log.status)} {log.status}
                        </span>
                      </td>
                      <td style={{ padding: '0.875rem 1.25rem', fontSize: 14, fontWeight: 600 }}>{log.offersFound}</td>
                      <td style={{ padding: '0.875rem 1.25rem', fontSize: 14, color: '#4ade80' }}>+{log.offersAdded}</td>
                      <td style={{ padding: '0.875rem 1.25rem', fontSize: 14, color: '#6b93ff' }}>{log.offersUpdated}</td>
                      <td style={{ padding: '0.875rem 1.25rem', fontSize: 13, color: 'var(--text-secondary)' }}>
                        {log.duration ? `${(log.duration / 1000).toFixed(1)}s` : '—'}
                      </td>
                      <td style={{ padding: '0.875rem 1.25rem', fontSize: 12, color: 'var(--text-secondary)', whiteSpace: 'nowrap' }}>
                        {new Date(log.startedAt).toLocaleString('fr-DZ')}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div style={{ marginTop: '1.5rem', padding: '1rem 1.25rem', borderRadius: 10, background: 'rgba(79,127,255,0.07)', border: '1px solid rgba(79,127,255,0.2)', fontSize: 13, color: 'var(--text-secondary)' }}>
          <strong style={{ color: '#6b93ff' }}>ℹ️ Scraping automatique:</strong> Le système est configuré pour mettre à jour les offres chaque jour à 3h00 du matin. Vous pouvez également déclencher un scraping manuel ci-dessus.
        </div>
      </div>
    </div>
  )
}
