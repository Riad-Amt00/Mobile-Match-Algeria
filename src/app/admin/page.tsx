'use client'

import { useState, useEffect, Suspense } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { useSession } from 'next-auth/react'
import {
  CheckCircle, XCircle, Clock, Signal,
  Users, Database, Bell, Activity, Download, Trash2,
  ChevronDown, ArrowLeft, Play, RefreshCw, ExternalLink,
} from 'lucide-react'
import { useLang } from '@/lib/lang-context'

interface OperatorStatus {
  name: string
  slug: string
  offerCount: number
  lastScrapedAt: string | null
  lastOffersFound: number
}

interface ScrapeLog {
  id: string
  operator: string
  status: string
  offersFound: number
  offersAdded: number
  offersUpdated: number
  offersDeactivated: number
  duration?: number
  startedAt: string
  errorMessage?: string
  details?: string | null  // JSON array of {ts,level,msg} entries
}

interface Session {
  startedAt: string
  logs: ScrapeLog[]
}

interface AdminStats {
  totalUsers: number
  totalActiveOffers: number
  unreadNotifications: number
  scrapeSessionCount: number
  successRate: number
  lastScrapePerOperator: OperatorStatus[]
  sessions: Session[]
}


interface FamilyStatus {
  family: string
  status: 'live' | 'fallback' | 'permanent'
  count: number | null
}

const PERMANENT_FAMILIES = /ZID/i

function parseScraperFamilies(details: string | null | undefined): FamilyStatus[] {
  if (!details) return []
  let entries: { ts: number; level: string; msg: string }[] = []
  try { entries = JSON.parse(details) } catch { return [] }

  const families: FamilyStatus[] = []
  for (const { level, msg } of entries) {
    if (level === 'OK') {
      const m = msg.match(/^([^:]+):\s+(\d+)\s+offers?\s+scraped\s+live/)
      if (m) families.push({ family: m[1].trim(), status: 'live', count: parseInt(m[2]) })
    } else if (level === 'WARN') {
      const m = msg.match(/^([^:]+):.*(using fallback|unreachable)/)
      if (m) {
        const name = m[1].trim()
        families.push({ family: name, status: PERMANENT_FAMILIES.test(name) ? 'permanent' : 'fallback', count: null })
      }
    }
  }
  return families
}

function timeSince(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime()
  const h = Math.floor(diff / 3600000)
  const m = Math.floor((diff % 3600000) / 60000)
  if (h > 24) return `${Math.floor(h / 24)}d ago`
  if (h > 0) return `${h}h ${m}m ago`
  if (m > 0) return `${m}m ago`
  return 'just now'
}

function getNextRun(): string {
  const now = new Date()
  const alg = new Date(now.toLocaleString('en-US', { timeZone: 'Africa/Algiers' }))
  const next = new Date(alg)
  next.setHours(3, 0, 0, 0)
  if (alg.getHours() >= 3) next.setDate(next.getDate() + 1)
  const diff = next.getTime() - alg.getTime()
  const h = Math.floor(diff / 3600000)
  const m = Math.floor((diff % 3600000) / 60000)
  return `${h}h ${m}m`
}

export default function AdminPageWrapper() {
  return (
    <Suspense fallback={
      <div style={{ minHeight: '100vh', background: 'var(--bg-dark)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ width: 36, height: 36, border: '3px solid rgba(139,92,246,0.3)', borderTopColor: '#8B5CF6', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
      </div>
    }>
      <AdminPage />
    </Suspense>
  )
}

function AdminPage() {
  const { t } = useLang()
  const { data: session, status } = useSession()
  const router = useRouter()
  const searchParams = useSearchParams()
  const [stats, setStats] = useState<AdminStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [expandedSession, setExpandedSession] = useState<number | null>(0)
  const [activeTab, setActiveTab] = useState<'overview' | 'history' | 'notifications'>('overview')
  const [scraping, setScraping] = useState(false)
  const [scrapeMsg, setScrapeMsg] = useState<{ text: string; ok: boolean } | null>(null)

  // Support ?tab= deep link (e.g. from notification click)
  useEffect(() => {
    const tab = searchParams.get('tab') as typeof activeTab | null
    if (tab && ['overview', 'history', 'notifications'].includes(tab)) setActiveTab(tab)
  }, [searchParams])

  useEffect(() => {
    if (status === 'unauthenticated') router.push('/login')
    else if (status === 'authenticated' && (session?.user as any)?.role !== 'ADMIN') router.push('/')
  }, [status, session, router])

  useEffect(() => {
    fetchStats()
    const t = setInterval(fetchStats, 30_000)
    return () => clearInterval(t)
  }, [])

  async function fetchStats() {
    try {
      const res = await fetch('/api/admin/stats')
      if (res.ok) setStats(await res.json())
    } finally {
      setLoading(false)
    }
  }

  async function runScrapeNow() {
    setScraping(true)
    setScrapeMsg(null)
    try {
      const res = await fetch('/api/admin/scrape', { method: 'POST' })
      const data = await res.json()
      if (data.success) {
        const deactivatedPart = data.totalDeactivated > 0 ? `, −${data.totalDeactivated} removed` : ''
        setScrapeMsg({ text: `Done — ${data.totalFound} offers found, +${data.totalAdded} added${deactivatedPart}`, ok: true })
        await fetchStats()
      } else {
        setScrapeMsg({ text: `Error: ${data.error || 'Unknown error'}`, ok: false })
      }
    } catch {
      setScrapeMsg({ text: 'Network error — check console', ok: false })
    } finally {
      setScraping(false)
    }
  }

  function downloadReport() {
    if (!stats?.sessions?.length) return
    const lines: string[] = ['Mobile Match Algeria — Scrape Report', `Generated: ${new Date().toLocaleString('en-GB')}`, '='.repeat(60), '']
    stats.sessions.forEach((s, idx) => {
      lines.push(`Session ${idx + 1}: ${new Date(s.startedAt).toLocaleString('en-GB')}`)
      s.logs.forEach(l => {
        lines.push(`  ${l.operator.padEnd(10)} ${l.status.padEnd(8)} found:${l.offersFound} added:${l.offersAdded} ${l.duration ? `${(l.duration / 1000).toFixed(1)}s` : ''}`)
        if (l.errorMessage) lines.push(`    ⚠ ERROR: ${l.errorMessage}`)
        if (l.details) {
          try {
            const entries: Array<{ts: number; level: string; msg: string}> = JSON.parse(l.details)
            entries.forEach(e => {
              const t = new Date(e.ts).toLocaleTimeString('en-GB')
              lines.push(`    ${t} [${e.level.padEnd(5)}] ${e.msg}`)
            })
          } catch {}
        }
      })
      lines.push('')
    })
    const blob = new Blob([lines.join('\n')], { type: 'text/plain' })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = `scrape-report-${new Date().toISOString().slice(0, 10)}.txt`
    a.click()
  }

  if (loading) return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-dark)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ width: 36, height: 36, border: '3px solid rgba(139,92,246,0.3)', borderTopColor: '#8B5CF6', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
    </div>
  )

  const lastSession = stats?.sessions?.[0]
  const hasErrors = lastSession?.logs.some(l => l.status === 'FAILED' || l.errorMessage)

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-dark)' }}>

      {/* ── Top bar ── */}
      <div style={{ borderBottom: '1px solid var(--border-base)', padding: '0 1.5rem', background: 'rgba(7,11,20,0.9)', backdropFilter: 'blur(20px)', position: 'sticky', top: 60, zIndex: 50 }}>
        <div style={{ maxWidth: 1100, margin: '0 auto', height: 56, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <Link href="/" style={{ color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: 6, textDecoration: 'none', fontSize: 13 }}>
              <ArrowLeft size={14} /> Back
            </Link>
            <span style={{ color: 'var(--border-base)' }}>|</span>
            <span style={{ fontWeight: 800, fontSize: 15 }}>Admin</span>

            {/* System health dot */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '3px 10px', borderRadius: 50, background: hasErrors ? 'rgba(248,113,113,0.1)' : 'rgba(74,222,128,0.1)', border: `1px solid ${hasErrors ? 'rgba(248,113,113,0.3)' : 'rgba(74,222,128,0.3)'}` }}>
              <div style={{ width: 7, height: 7, borderRadius: '50%', background: hasErrors ? '#f87171' : '#4ade80', boxShadow: `0 0 6px ${hasErrors ? '#f87171' : '#4ade80'}` }} />
              <span style={{ fontSize: 11, fontWeight: 700, color: hasErrors ? '#f87171' : '#4ade80' }}>{hasErrors ? 'Issues detected' : 'All systems OK'}</span>
            </div>
          </div>

        </div>
      </div>

      <div style={{ maxWidth: 1100, margin: '0 auto', padding: '2rem 1.5rem' }}>

        {/* ── OPERATOR HEALTH — main focus ── */}
        <div style={{ marginBottom: '2rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.875rem', flexWrap: 'wrap', gap: 8 }}>
            <h2 style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.06em', margin: 0 }}>{t('admin.section.health')}</h2>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              {scrapeMsg && (
                <span style={{ fontSize: 11, fontWeight: 600, color: scrapeMsg.ok ? '#4ade80' : '#f87171' }}>
                  {scrapeMsg.text}
                </span>
              )}
              <button
                onClick={runScrapeNow}
                disabled={scraping}
                style={{
                  display: 'flex', alignItems: 'center', gap: 5,
                  padding: '5px 14px', borderRadius: 8,
                  background: scraping ? 'rgba(139,92,246,0.08)' : 'rgba(139,92,246,0.15)',
                  border: '1px solid rgba(139,92,246,0.35)',
                  color: '#A78BFA', cursor: scraping ? 'not-allowed' : 'pointer',
                  fontSize: 12, fontWeight: 700, fontFamily: 'inherit',
                  opacity: scraping ? 0.7 : 1, transition: 'all 0.15s',
                }}
              >
                {scraping
                  ? <RefreshCw size={12} style={{ animation: 'spin 1s linear infinite' }} />
                  : <Play size={12} />}
                {scraping ? t('admin.btn.scraping') : t('admin.btn.runScrape')}
              </button>
            </div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1rem' }}>
            {stats?.lastScrapePerOperator.map(op => {
              const opSession = lastSession?.logs.find(l => l.operator === op.name)
              const isError = opSession?.status === 'FAILED'
              const hasError = !!opSession?.errorMessage
              const statusOk = opSession?.status === 'SUCCESS' && !hasError
              const isRunning = opSession?.status === 'RUNNING' || scraping
              const neverScraped = !op.lastScrapedAt
              return (
                <div key={op.slug} style={{ borderRadius: 16, padding: '1.25rem', background: 'var(--bg-card)', border: `1px solid ${isError || hasError ? 'rgba(248,113,113,0.3)' : 'var(--border-base)'}`, position: 'relative', overflow: 'hidden' }}>
                  {/* Status stripe */}
                  <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 3, background: isError ? '#f87171' : statusOk ? 'rgba(74,222,128,0.5)' : isRunning ? 'rgba(96,165,250,0.5)' : neverScraped ? 'rgba(107,114,128,0.3)' : 'rgba(245,158,11,0.4)' }} />

                  <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '1rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <div style={{ width: 36, height: 36, borderRadius: 10, background: 'rgba(255,255,255,0.05)', border: '1px solid var(--border-base)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <Signal size={16} color="var(--text-secondary)" />
                      </div>
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                          <span style={{ fontSize: 15, fontWeight: 800, color: 'var(--text-primary)' }}>{op.name}</span>
                          <a href={`https://${op.slug === 'djezzy' ? 'www.djezzy.dz' : op.slug === 'ooredoo' ? 'www.ooredoo.dz' : 'mobilis.dz'}`} target="_blank" rel="noreferrer" style={{ color: 'var(--text-muted)', display: 'flex' }}>
                            <ExternalLink size={11} />
                          </a>
                        </div>
                        <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 1 }}>{op.offerCount} active offer{op.offerCount !== 1 ? 's' : ''} in DB</div>
                      </div>
                    </div>
                    <div style={{
                      display: 'flex', alignItems: 'center', gap: 5, padding: '3px 10px', borderRadius: 50,
                      background: isError ? 'rgba(248,113,113,0.12)' : statusOk ? 'rgba(74,222,128,0.1)' : isRunning ? 'rgba(96,165,250,0.12)' : neverScraped ? 'rgba(107,114,128,0.1)' : 'rgba(245,158,11,0.1)',
                      border: `1px solid ${isError ? 'rgba(248,113,113,0.3)' : statusOk ? 'rgba(74,222,128,0.25)' : isRunning ? 'rgba(96,165,250,0.3)' : neverScraped ? 'rgba(107,114,128,0.25)' : 'rgba(245,158,11,0.25)'}`,
                    }}>
                      {isError ? <XCircle size={11} color="#f87171" /> : statusOk ? <CheckCircle size={11} color="#4ade80" /> : isRunning ? <RefreshCw size={11} color="#60a5fa" style={{ animation: 'spin 1s linear infinite' }} /> : <Clock size={11} color={neverScraped ? '#9ca3af' : '#f59e0b'} />}
                      <span style={{ fontSize: 11, fontWeight: 700, color: isError ? '#f87171' : statusOk ? '#4ade80' : isRunning ? '#60a5fa' : neverScraped ? '#9ca3af' : '#f59e0b' }}>
                        {isError ? 'Failed' : statusOk ? 'OK' : isRunning ? 'Scraping…' : neverScraped ? 'Never scraped' : 'Unknown'}
                      </span>
                    </div>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                    <div style={{ padding: '0.625rem', borderRadius: 8, background: 'rgba(255,255,255,0.03)' }}>
                      <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginBottom: 3 }}>Last scraped</div>
                      <div style={{ fontSize: 13, fontWeight: 700, color: op.lastScrapedAt ? 'var(--text-primary)' : '#f87171' }}>
                        {op.lastScrapedAt ? timeSince(op.lastScrapedAt) : 'Never'}
                      </div>
                    </div>
                    <div style={{ padding: '0.625rem', borderRadius: 8, background: 'rgba(255,255,255,0.03)' }}>
                      <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginBottom: 3 }}>Last run found</div>
                      <div style={{ fontSize: 13, fontWeight: 700 }}>{opSession?.offersFound ?? op.lastOffersFound} offers</div>
                    </div>
                  </div>

                  {/* Error message — shown prominently */}
                  {(isError || opSession?.errorMessage) && (
                    <div style={{ marginTop: '0.75rem', padding: '0.625rem 0.75rem', borderRadius: 8, background: 'rgba(248,113,113,0.08)', border: '1px solid rgba(248,113,113,0.2)' }}>
                      <div style={{ fontSize: 11, fontWeight: 700, color: '#f87171', marginBottom: 2 }}>⚠ Error</div>
                      <div style={{ fontSize: 12, color: '#fca5a5', lineHeight: 1.5 }}>
                        {opSession?.errorMessage || 'Scrape failed — check logs for details'}
                      </div>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>

        {/* ── TABS ── */}
        <div style={{ display: 'flex', gap: 4, marginBottom: '1.5rem', borderBottom: '1px solid var(--border-base)', paddingBottom: 0 }}>
          {([
            { id: 'overview',       label: t('admin.tab.overview') },
            { id: 'history',        label: `${t('admin.tab.history')} ${stats?.scrapeSessionCount ? `(${stats.scrapeSessionCount})` : ''}` },
            { id: 'notifications',  label: `${t('admin.tab.notifications')} ${stats?.unreadNotifications ? `· ${stats.unreadNotifications}` : ''}` },
          ] as const).map(tab => (
            <button key={tab.id} onClick={() => setActiveTab(tab.id)} style={{
              padding: '0.625rem 1rem', background: 'none', border: 'none', cursor: 'pointer',
              fontSize: 13, fontWeight: 600, fontFamily: 'inherit',
              color: activeTab === tab.id ? 'var(--text-primary)' : 'var(--text-secondary)',
              borderBottom: `2px solid ${activeTab === tab.id ? '#8B5CF6' : 'transparent'}`,
              marginBottom: -1, transition: 'color 0.15s',
            }}>{tab.label}</button>
          ))}
        </div>

        {/* ── TAB: OVERVIEW ── */}
        {activeTab === 'overview' && stats && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>

            {/* Platform numbers */}
            <div>
              <h2 style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '0.875rem' }}>{t('admin.section.platform')}</h2>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '0.875rem' }}>
                {[
                  { icon: <Database size={18} color="#a78bfa"/>, label: t('admin.stat.activeOffers'), value: stats.totalActiveOffers },
                  { icon: <Users size={18} color="#f59e0b"/>,    label: t('admin.stat.users'),        value: stats.totalUsers },
                  { icon: <Activity size={18} color="#A78BFA"/>, label: t('admin.stat.sessions'),     value: stats.scrapeSessionCount },
                  { icon: <CheckCircle size={18} color="#4ade80"/>, label: t('admin.stat.successRate'), value: `${stats.successRate}%` },
                ].map(s => (
                  <div key={s.label} className="glass" style={{ borderRadius: 12, padding: '1rem 1.25rem', display: 'flex', alignItems: 'center', gap: 12 }}>
                    {s.icon}
                    <div>
                      <div style={{ fontSize: '1.375rem', fontWeight: 900, lineHeight: 1 }}>{s.value}</div>
                      <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 3 }}>{s.label}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Plan family breakdown */}
            {lastSession && lastSession.logs.some(l => parseScraperFamilies(l.details).length > 0) && (
              <div>
                <h2 style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '0.875rem' }}>
                  Last Scrape — Plan Family Breakdown
                </h2>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '0.875rem' }}>
                  {lastSession.logs.map(log => {
                    const families = parseScraperFamilies(log.details)
                    if (!families.length) return null
                    const liveCount = families.filter(f => f.status === 'live').length
                    const fallbackCount = families.filter(f => f.status === 'fallback').length
                    return (
                      <div key={log.id} className="glass" style={{ borderRadius: 14, padding: '1.125rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
                          <span style={{ fontSize: 14, fontWeight: 800 }}>{log.operator}</span>
                          <div style={{ display: 'flex', gap: 6 }}>
                            {liveCount > 0 && <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 7px', borderRadius: 50, background: 'rgba(74,222,128,0.12)', color: '#4ade80' }}>{liveCount} live</span>}
                            {fallbackCount > 0 && <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 7px', borderRadius: 50, background: 'rgba(245,158,11,0.12)', color: '#f59e0b' }}>{fallbackCount} fallback</span>}
                          </div>
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                          {families.map((f, i) => (
                            <div key={i} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.3rem 0.5rem', borderRadius: 6, background: 'rgba(255,255,255,0.025)' }}>
                              <span style={{ fontSize: 12, color: 'var(--text-primary)', fontWeight: 500 }}>{f.family}</span>
                              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                {f.count !== null && <span style={{ fontSize: 11, color: 'var(--text-secondary)' }}>{f.count} offers</span>}
                                <span style={{
                                  fontSize: 10, fontWeight: 700, padding: '1px 7px', borderRadius: 50,
                                  background: f.status === 'live' ? 'rgba(74,222,128,0.12)' : f.status === 'permanent' ? 'rgba(107,114,128,0.12)' : 'rgba(245,158,11,0.12)',
                                  color: f.status === 'live' ? '#4ade80' : f.status === 'permanent' ? '#9ca3af' : '#f59e0b',
                                }}>
                                  {f.status === 'live' ? 'Live' : f.status === 'permanent' ? 'Fixed data' : 'Fallback'}
                                </span>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}

            {/* Automation status */}
            <div>
              <h2 style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '0.875rem' }}>{t('admin.section.automation')}</h2>
              <div className="glass" style={{ borderRadius: 14, padding: '1.25rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8, marginBottom: '1rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#4ade80', boxShadow: '0 0 8px rgba(74,222,128,0.7)', animation: 'pulse 2s ease-in-out infinite' }} />
                    <span style={{ fontSize: 14, fontWeight: 700 }}>Daily scraper active</span>
                    <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>— scheduled at 03:00 Algeria time</span>
                  </div>
                </div>
                <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
                  <div style={{ padding: '0.625rem 1rem', borderRadius: 8, background: 'rgba(139,92,246,0.08)', border: '1px solid rgba(139,92,246,0.15)' }}>
                    <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginBottom: 2 }}>Next scheduled run</div>
                    <div style={{ fontSize: 14, fontWeight: 800, color: '#A78BFA' }}>in {getNextRun()}</div>
                  </div>
                  <div style={{ padding: '0.625rem 1rem', borderRadius: 8, background: 'rgba(74,222,128,0.08)', border: '1px solid rgba(74,222,128,0.15)' }}>
                    <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginBottom: 2 }}>This page auto-refreshes</div>
                    <div style={{ fontSize: 14, fontWeight: 800, color: '#4ade80' }}>every 30s</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ── TAB: HISTORY ── */}
        {activeTab === 'history' && (
          <div>
            {!stats?.sessions?.length ? (
              <div className="glass" style={{ borderRadius: 14, padding: '3rem', textAlign: 'center' }}>
                <Activity size={36} style={{ opacity: 0.2, display: 'block', margin: '0 auto 1rem' }} />
                <p style={{ color: 'var(--text-secondary)', marginBottom: 4 }}>No scrape sessions yet</p>
                <p style={{ color: 'var(--text-secondary)', fontSize: 12, opacity: 0.6 }}>The scraper runs automatically every day at 03:00 Algeria time.</p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                {stats.sessions.map((s, si) => {
                  const anyFailed  = s.logs.some(l => l.status === 'FAILED')
                  const anyError   = s.logs.some(l => l.errorMessage)
                  const totalFound = s.logs.reduce((a, l) => a + l.offersFound, 0)
                  const totalAdded = s.logs.reduce((a, l) => a + l.offersAdded, 0)
                  const isOpen     = expandedSession === si
                  const sessionOk  = !anyFailed && !anyError
                  const sessionTs  = new Date(s.startedAt)

                  return (
                    <div key={si} style={{ borderRadius: 14, overflow: 'hidden', border: `1px solid ${anyFailed || anyError ? 'rgba(248,113,113,0.25)' : 'rgba(74,222,128,0.15)'}` }}>

                      {/* ── Session header ── */}
                      <div
                        onClick={() => setExpandedSession(isOpen ? null : si)}
                        style={{ padding: '0.875rem 1.25rem', display: 'flex', alignItems: 'center', gap: '1rem', cursor: 'pointer', background: anyFailed || anyError ? 'rgba(248,113,113,0.06)' : 'rgba(74,222,128,0.04)', userSelect: 'none' }}
                      >
                        <div style={{ width: 8, height: 8, borderRadius: '50%', flexShrink: 0, background: anyFailed ? '#f87171' : anyError ? '#f59e0b' : '#4ade80', boxShadow: `0 0 6px ${anyFailed ? '#f87171' : anyError ? '#f59e0b' : '#4ade80'}` }} />
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                            <span style={{ fontFamily: 'monospace', fontSize: 12, color: 'var(--text-secondary)' }}>
                              {sessionTs.toLocaleString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                            </span>
                            {si === 0 && <span style={{ fontSize: 10, padding: '1px 7px', borderRadius: 50, background: 'rgba(139,92,246,0.15)', color: '#A78BFA', fontWeight: 700 }}>LATEST</span>}
                            {anyFailed && <span style={{ fontSize: 10, padding: '1px 7px', borderRadius: 50, background: 'rgba(248,113,113,0.15)', color: '#f87171', fontWeight: 700 }}>FAILED</span>}
                            {!anyFailed && anyError && <span style={{ fontSize: 10, padding: '1px 7px', borderRadius: 50, background: 'rgba(245,158,11,0.15)', color: '#f59e0b', fontWeight: 700 }}>WARNING</span>}
                          </div>
                          <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 3, fontFamily: 'monospace' }}>
                            {s.logs.length} operators · {totalFound} offers found · +{totalAdded} new
                          </div>
                        </div>
                        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                          {s.logs.map(l => {
                            const ok = l.status === 'SUCCESS' && !l.errorMessage
                            return (
                              <span key={l.id} style={{ fontSize: 11, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 3, color: ok ? '#4ade80' : '#f87171' }}>
                                {ok ? <CheckCircle size={11}/> : <XCircle size={11}/>} {l.operator}
                              </span>
                            )
                          })}
                        </div>
                        <ChevronDown size={14} style={{ color: 'var(--text-secondary)', transform: isOpen ? 'rotate(180deg)' : 'none', transition: 'transform .2s', flexShrink: 0 }} />
                      </div>

                      {/* ── Log file view ── */}
                      {isOpen && (
                        <div style={{ background: '#0a0d14', borderTop: '1px solid rgba(255,255,255,0.06)', padding: '1rem 0' }}>

                          {/* Download button */}
                          <div style={{ display: 'flex', justifyContent: 'flex-end', padding: '0 1rem', marginBottom: '0.75rem' }}>
                            <button
                              onClick={downloadReport}
                              style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '3px 10px', borderRadius: 6, background: 'rgba(139,92,246,0.1)', border: '1px solid rgba(139,92,246,0.2)', color: '#A78BFA', cursor: 'pointer', fontSize: 11, fontWeight: 600, fontFamily: 'inherit' }}
                            >
                              <Download size={11} /> {t('admin.btn.export')}
                            </button>
                          </div>

                          {/* Log lines */}
                          <div style={{ fontFamily: 'monospace', fontSize: 12, lineHeight: 1.9, padding: '0 1.25rem', overflowX: 'auto' }}>

                            <LogLine ts={sessionTs} level="INFO" msg={`Scrape session started — ${s.logs.length} operator(s) queued`} />

                            {s.logs.map((l) => {
                              // Use real stored log entries if available
                              const stored: Array<{ts: number; level: string; msg: string}> | null =
                                l.details ? (() => { try { return JSON.parse(l.details!) } catch { return null } })() : null

                              if (stored && stored.length > 0) {
                                return (
                                  <span key={l.id}>
                                    <LogLine ts={new Date(l.startedAt)} level="INFO" msg={`── ${l.operator.toUpperCase()} ──────────────────`} />
                                    {stored.map((entry, ei) => (
                                      <LogLine
                                        key={ei}
                                        ts={new Date(entry.ts)}
                                        level={entry.level as 'INFO' | 'OK' | 'WARN' | 'ERROR'}
                                        msg={entry.msg}
                                      />
                                    ))}
                                  </span>
                                )
                              }

                              // Fallback: synthetic lines for legacy log entries without details
                              const ok = l.status === 'SUCCESS' && !l.errorMessage
                              const opSlug = l.operator.toLowerCase()
                              const opUrl = opSlug === 'djezzy' ? 'djezzy.dz' : opSlug === 'ooredoo' ? 'ooredoo.dz' : 'mobilis.dz'
                              const dur = l.duration ? `${(l.duration / 1000).toFixed(1)}s` : null
                              return (
                                <span key={l.id}>
                                  <LogLine ts={new Date(l.startedAt)} level="INFO" msg={`[${l.operator.toUpperCase()}] Launching browser → https://${opUrl}`} />
                                  {ok ? (
                                    <LogLine ts={new Date(new Date(l.startedAt).getTime() + (l.duration ?? 3000))} level="OK"
                                      msg={`[${l.operator.toUpperCase()}] Scrape complete — ${l.offersFound} found, +${l.offersAdded} added, ${l.offersUpdated} updated${l.offersDeactivated > 0 ? `, −${l.offersDeactivated} removed` : ''}${dur ? ` (${dur})` : ''}`}
                                    />
                                  ) : (
                                    <>
                                      <LogLine ts={new Date(new Date(l.startedAt).getTime() + (l.duration ?? 3000))} level="ERROR"
                                        msg={`[${l.operator.toUpperCase()}] Scrape FAILED${dur ? ` after ${dur}` : ''}`}
                                      />
                                      {l.errorMessage && (
                                        <LogLine ts={new Date(new Date(l.startedAt).getTime() + (l.duration ?? 3000) + 1)} level="ERROR"
                                          msg={`[${l.operator.toUpperCase()}] ${l.errorMessage}`}
                                        />
                                      )}
                                    </>
                                  )}
                                </span>
                              )
                            })}

                            {/* Session summary */}
                            {(() => {
                              const succeeded = s.logs.filter(l => l.status === 'SUCCESS').length
                              const failed    = s.logs.filter(l => l.status === 'FAILED').length
                              const endTs     = new Date(Math.max(...s.logs.map(l => new Date(l.startedAt).getTime() + (l.duration ?? 0))))
                              return (
                                <>
                                  <LogLine ts={endTs} level={failed > 0 ? 'WARN' : 'INFO'}
                                    msg={`── Session finished — ${succeeded}/${s.logs.length} succeeded${failed > 0 ? `, ${failed} FAILED` : ' — all OK'} ──`}
                                  />
                                  {failed > 0 && (
                                    <LogLine ts={endTs} level="WARN"
                                      msg="See ERROR lines above for the reason. The cron will retry at 03:00 Algeria time."
                                    />
                                  )}
                                </>
                              )
                            })()}
                          </div>
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        )}

        {/* ── TAB: NOTIFICATIONS ── */}
        {activeTab === 'notifications' && <AdminNotifications onNavigate={(href) => { router.push(href) }} />}

      </div>
    </div>
  )
}

/* ── Log Line ─────────────────────────────────────────────────────── */
function LogLine({ ts, level, msg }: { ts: Date; level: 'INFO' | 'OK' | 'WARN' | 'ERROR'; msg: string }) {
  const color = level === 'OK' ? '#4ade80' : level === 'ERROR' ? '#f87171' : level === 'WARN' ? '#f59e0b' : '#6b7280'
  const label = level === 'OK' ? ' OK  ' : level === 'ERROR' ? 'ERROR' : level === 'WARN' ? 'WARN ' : 'INFO '
  const tsStr = ts.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
  return (
    <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start', padding: '1px 0' }}>
      <span style={{ color: '#374151', flexShrink: 0 }}>{tsStr}</span>
      <span style={{ color, flexShrink: 0, fontWeight: 700 }}>[{label}]</span>
      <span style={{ color: level === 'ERROR' ? '#fca5a5' : level === 'WARN' ? '#fde68a' : level === 'OK' ? '#bbf7d0' : '#9ca3af', wordBreak: 'break-all' }}>{msg}</span>
    </div>
  )
}

/* ── Admin Notifications ──────────────────────────────────────────── */
function AdminNotifications({ onNavigate }: { onNavigate: (href: string) => void }) {
  const { t } = useLang()
  const [notifications, setNotifications] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/notifications')
      .then(r => r.json())
      .then(d => setNotifications(d.notifications || []))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  function getHref(n: any): string | null {
    if (n.offerId) return `/offers/${n.offerId}`
    if (n.type === 'scrape_failed' || n.type === 'scrape_complete' || n.type === 'data_stale') return '/admin?tab=history'
    if (n.type === 'recommendation') return '/recommend'
    // new_offer / price_drop without an offerId: legacy row, not navigable.
    return null
  }

  async function handleClick(n: any) {
    if (!n.isRead) {
      fetch('/api/notifications', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: n.id }),
      }).catch(() => {})
      setNotifications(prev => prev.map(x => x.id === n.id ? { ...x, isRead: true } : x))
    }
    const href = getHref(n)
    if (href) onNavigate(href)
  }

  async function markAllRead() {
    await fetch('/api/notifications', { method: 'PATCH' }).catch(() => {})
    setNotifications(prev => prev.map(n => ({ ...n, isRead: true })))
  }

  async function deleteNotif(id: string) {
    await fetch('/api/notifications', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id }) }).catch(() => {})
    setNotifications(prev => prev.filter(n => n.id !== id))
  }

  const unread = notifications.filter(n => !n.isRead).length

  if (loading) return <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-secondary)' }}>Loading...</div>

  const typeIcon: Record<string, string> = {
    scrape_failed: '⚠️',
    scrape_complete: '✅',
    data_stale: '🕒',
    new_offer: '🆕',
    recommendation: '✨',
    price_drop: '📉',
    promo: '🎁',
  }

  return (
    <div>
      {unread > 0 && (
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '1rem' }}>
          <button onClick={markAllRead} style={{ background: 'none', border: 'none', color: '#A78BFA', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>
            {t('admin.btn.markAllRead')}
          </button>
        </div>
      )}

      {notifications.length === 0 ? (
        <div className="glass" style={{ borderRadius: 14, padding: '3rem', textAlign: 'center' }}>
          <Bell size={32} style={{ opacity: 0.2, display: 'block', margin: '0 auto 1rem' }} />
          <p style={{ color: 'var(--text-secondary)', fontSize: 13 }}>No notifications yet</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {notifications.map(n => {
            const href = getHref(n)
            const clickable = !!href
            const icon = typeIcon[n.type] || '🔔'
            return (
              <div
                key={n.id}
                onClick={() => handleClick(n)}
                style={{
                  padding: '0.875rem 1rem', borderRadius: 10,
                  background: n.isRead ? 'var(--bg-card)' : 'rgba(139,92,246,0.06)',
                  border: `1px solid ${n.type === 'scrape_failed' ? 'rgba(248,113,113,0.25)' : n.isRead ? 'var(--border-base)' : 'rgba(139,92,246,0.2)'}`,
                  display: 'flex', alignItems: 'flex-start', gap: 12,
                  cursor: clickable ? 'pointer' : 'default',
                  transition: 'background 0.15s',
                }}
                onMouseEnter={e => { if (clickable) e.currentTarget.style.background = n.isRead ? 'rgba(255,255,255,0.04)' : 'rgba(139,92,246,0.1)' }}
                onMouseLeave={e => { e.currentTarget.style.background = n.isRead ? 'var(--bg-card)' : 'rgba(139,92,246,0.06)' }}
              >
                <div style={{ fontSize: 20, flexShrink: 0, marginTop: 1 }}>{icon}</div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 13, fontWeight: n.isRead ? 500 : 700, display: 'flex', alignItems: 'center', gap: 6 }}>
                    {n.title}
                    {clickable && <span style={{ fontSize: 12, color: '#A78BFA' }}>→</span>}
                  </div>
                  <div style={{ fontSize: 12, color: n.type === 'scrape_failed' ? '#fca5a5' : 'var(--text-secondary)', marginTop: 2, lineHeight: 1.5 }}>{n.message}</div>
                  <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginTop: 4, opacity: 0.5 }}>
                    {new Date(n.createdAt).toLocaleString('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                  </div>
                </div>
                <button
                  onClick={e => { e.stopPropagation(); deleteNotif(n.id) }}
                  style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', padding: 4, opacity: 0.4, flexShrink: 0 }}
                  onMouseEnter={e => (e.currentTarget.style.opacity = '1')}
                  onMouseLeave={e => (e.currentTarget.style.opacity = '0.4')}
                >
                  <Trash2 size={13} />
                </button>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
