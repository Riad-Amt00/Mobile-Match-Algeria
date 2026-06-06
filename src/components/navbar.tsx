'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useSession, signOut } from 'next-auth/react'
import { AnimatePresence, motion, type Variants } from 'framer-motion'
import {
  Smartphone, Bell, User, LogOut, Menu, X as XIcon, ChevronDown,
  Bookmark, Shield, Settings, BarChart3, Target, Check, Trash2,
  Sun, Moon, LayoutGrid, HelpCircle,
} from 'lucide-react'
import { useLang } from '@/lib/lang-context'
import type { Lang } from '@/lib/i18n'

const LANGS: { code: Lang; label: string }[] = [
  { code: 'en', label: 'EN' },
  { code: 'fr', label: 'FR' },
  { code: 'ar', label: 'AR' },
]

const dropdownVariants: Variants = {
  hidden: { opacity: 0, y: -6, scale: 0.97 },
  visible: { opacity: 1, y: 0, scale: 1, transition: { duration: 0.15, ease: 'easeOut' } },
  exit: { opacity: 0, y: -6, scale: 0.97, transition: { duration: 0.1, ease: 'easeIn' } },
}

const mobileMenuVariants: Variants = {
  hidden: { height: 0, opacity: 0 },
  visible: { height: 'auto', opacity: 1, transition: { duration: 0.22, ease: 'easeOut' } },
  exit: { height: 0, opacity: 0, transition: { duration: 0.16, ease: 'easeIn' } },
}

export function Navbar() {
  const pathname = usePathname()
  const router = useRouter()
  const { data: session, status } = useSession()
  const isLoggedIn = status === 'authenticated'
  const isAdmin = isLoggedIn && (session?.user as any)?.role === 'ADMIN'
  const userName = session?.user?.name || 'User'
  const userEmail = session?.user?.email || ''

  const { lang, setLang, t } = useLang()
  const isHome = pathname === '/'
  const currentLangIdx = LANGS.findIndex(l => l.code === lang)
  const currentEntry = LANGS[currentLangIdx >= 0 ? currentLangIdx : 0]

  const [mobileOpen, setMobileOpen] = useState(false)
  const [userMenuOpen, setUserMenuOpen] = useState(false)
  const [notifOpen, setNotifOpen] = useState(false)
  const [langOpen, setLangOpen] = useState(false)
  const [notifications, setNotifications] = useState<any[]>([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [theme, setTheme] = useState<'dark' | 'light'>('dark')
  const [scrolled, setScrolled] = useState(false)

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8)
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  const userMenuRef = useRef<HTMLDivElement>(null)
  const notifRef = useRef<HTMLDivElement>(null)
  const langRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const saved = localStorage.getItem('theme') as 'dark' | 'light' | null
    const initial = saved || 'dark'
    setTheme(initial)
    document.documentElement.setAttribute('data-theme', initial)
  }, [])

  function toggleTheme() {
    const next = theme === 'dark' ? 'light' : 'dark'
    setTheme(next)
    localStorage.setItem('theme', next)
    document.documentElement.setAttribute('data-theme', next)
  }

  const fetchNotifs = useCallback(async () => {
    if (!isLoggedIn) return
    try {
      const res = await fetch('/api/notifications')
      const data = await res.json()
      const list = data.notifications || []
      setNotifications(list)
      setUnreadCount(list.filter((n: any) => !n.isRead).length)
    } catch {}
  }, [isLoggedIn])

  useEffect(() => { fetchNotifs() }, [fetchNotifs])
  useEffect(() => {
    if (!isLoggedIn) return
    const interval = setInterval(fetchNotifs, 60000)
    return () => clearInterval(interval)
  }, [isLoggedIn, fetchNotifs])

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (userMenuRef.current && !userMenuRef.current.contains(e.target as Node)) setUserMenuOpen(false)
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) setNotifOpen(false)
      if (langRef.current && !langRef.current.contains(e.target as Node)) setLangOpen(false)
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  useEffect(() => { setMobileOpen(false) }, [pathname])

  async function markAllRead() {
    try {
      await fetch('/api/notifications', { method: 'PATCH' })
      setNotifications(prev => prev.map(n => ({ ...n, isRead: true })))
      setUnreadCount(0)
    } catch {}
  }

  function getNotifHref(n: any): string | null {
    if (n.offerId) return `/offers/${n.offerId}`
    // Admin-only operational notifications → scrape history
    if (n.type === 'scrape_failed' || n.type === 'scrape_complete' || n.type === 'data_stale') return '/admin?tab=history'
    // new_offer / price_drop without an offerId: legacy row from an older
    // scraper version that did not store the reference. Not navigable — the
    // notification stays visible but becomes non-clickable so the user is
    // not silently redirected to the generic catalogue.
    return null
  }

  async function handleNotifClick(n: any) {
    setNotifOpen(false)
    if (!n.isRead) {
      fetch('/api/notifications', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: n.id }),
      }).catch(() => {})
      setNotifications(prev => {
        const next = prev.map(x => x.id === n.id ? { ...x, isRead: true } : x)
        setUnreadCount(next.filter(x => !x.isRead).length)
        return next
      })
    }
    const href = getNotifHref(n)
    if (href) router.push(href)
  }

  async function deleteNotif(id: string) {
    try {
      await fetch('/api/notifications', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id }),
      })
      setNotifications(prev => {
        const next = prev.filter(n => n.id !== id)
        setUnreadCount(next.filter(n => !n.isRead).length)
        return next
      })
    } catch {}
  }

  const navLinks = [
    { href: '/offers', icon: <LayoutGrid size={14} />, label: t('nav.browse') },
    { href: '/recommend', icon: <Target size={14} />, label: t('nav.recommend') },
    { href: '/compare', icon: <BarChart3 size={14} />, label: t('nav.compare') },
    ...(isLoggedIn ? [{ href: '/saved', icon: <Bookmark size={14} />, label: t('nav.saved') }] : []),
    { href: '/help', icon: <HelpCircle size={14} />, label: t('nav.help') },
  ]

  const isActive = (href: string) => pathname === href

  return (
    <nav style={{
      position: 'sticky', top: 0, zIndex: 100,
      background: 'var(--bg-card)',
      borderBottom: '1px solid var(--border-subtle)',
      boxShadow: scrolled ? '0 4px 16px rgba(16,24,40,0.08)' : '0 1px 3px rgba(16,24,40,0.04)',
      transition: 'box-shadow 0.25s ease',
    }}>
      <div style={{ maxWidth: 1280, margin: '0 auto', padding: '0 1.5rem', height: 60, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>

        {/* Logo */}
        <Link href="/offers" style={{ display: 'flex', alignItems: 'center', gap: 9, textDecoration: 'none', flexShrink: 0 }}>
          <div style={{
            width: 32, height: 32, borderRadius: 9,
            background: 'var(--accent)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <Smartphone size={15} color="white" />
          </div>
          <span style={{ fontWeight: 800, fontSize: '1rem', color: 'var(--text-primary)', letterSpacing: '-0.01em' }}>
            Mobile<span style={{ color: 'var(--accent)' }}>Match</span>
            <span style={{ color: 'var(--text-secondary)', fontWeight: 600, fontSize: 12, marginLeft: 4 }}>Algeria</span>
          </span>
        </Link>

        {/* Desktop nav links */}
        {!isHome && (
          <div className="desktop-nav" style={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            {navLinks.map(link => (
              <Link key={link.href} href={link.href}
                className={`nav-link${isActive(link.href) ? ' active' : ''}`}
                style={{
                  display: 'flex', alignItems: 'center', gap: 5,
                  textDecoration: 'none', fontSize: 13.5, fontWeight: isActive(link.href) ? 600 : 500,
                  color: isActive(link.href) ? 'var(--accent)' : 'var(--text-secondary)',
                  background: isActive(link.href) ? 'var(--accent-muted)' : 'transparent',
                }}>
                {link.icon} {link.label}
              </Link>
            ))}
          </div>
        )}

        {/* Right side controls */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>

          {/* Theme toggle */}
          <button
            onClick={toggleTheme}
            title={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
            style={{
              background: 'none', border: '1px solid var(--border-base)', cursor: 'pointer',
              padding: '5px 7px', borderRadius: 7,
              color: 'var(--text-secondary)', display: 'flex', alignItems: 'center',
              transition: 'color 0.15s, border-color 0.15s',
            }}>
            {theme === 'dark' ? <Sun size={15} /> : <Moon size={15} />}
          </button>

          {/* Language dropdown */}
          <div ref={langRef} style={{ position: 'relative' }}>
            <button
              onClick={() => { setLangOpen(!langOpen); setUserMenuOpen(false); setNotifOpen(false) }}
              style={{
                display: 'flex', alignItems: 'center', gap: 4,
                background: 'none',
                border: '1px solid var(--border-base)',
                borderRadius: 7, cursor: 'pointer', padding: '5px 9px',
                fontSize: 12, fontWeight: 700, color: 'var(--text-secondary)',
                fontFamily: 'inherit', transition: 'background 0.15s, border-color 0.15s',
              }}>
              <span>{currentEntry.label}</span>
              <ChevronDown size={11} style={{ opacity: 0.55, transform: langOpen ? 'rotate(180deg)' : 'none', transition: 'transform 0.18s' }} />
            </button>
            <AnimatePresence>
              {langOpen && (
                <motion.div
                  variants={dropdownVariants}
                  initial="hidden" animate="visible" exit="exit"
                  style={{
                    position: 'absolute', right: 0, top: 'calc(100% + 6px)', width: 120, padding: '4px',
                    background: 'var(--bg-card)', border: '1px solid var(--border-base)',
                    borderRadius: 10, boxShadow: '0 8px 24px rgba(15,23,42,0.12)',
                    zIndex: 200,
                  }}
                >
                  {LANGS.map(l => (
                    <button
                      key={l.code}
                      onClick={() => { setLang(l.code); setLangOpen(false) }}
                      style={{
                        display: 'flex', alignItems: 'center', gap: 8, width: '100%',
                        padding: '0.5rem 0.75rem', borderRadius: 7,
                        background: l.code === lang ? 'var(--accent-muted)' : 'none',
                        border: 'none', cursor: 'pointer', fontFamily: 'inherit',
                        color: l.code === lang ? 'var(--accent)' : 'var(--text-secondary)',
                        fontSize: 13, fontWeight: l.code === lang ? 700 : 500,
                      }}>
                      <span style={{ flex: 1 }}>{l.label}</span>
                      {l.code === lang && <Check size={12} />}
                    </button>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Notification bell */}
          {isLoggedIn && (
            <div ref={notifRef} style={{ position: 'relative' }}>
              <button
                onClick={() => { setNotifOpen(!notifOpen); setUserMenuOpen(false) }}
                style={{
                  background: 'none', border: '1px solid var(--border-base)', cursor: 'pointer',
                  padding: '5px 7px', borderRadius: 7,
                  color: notifOpen ? 'var(--accent)' : 'var(--text-secondary)',
                  display: 'flex', position: 'relative', transition: 'color 0.15s',
                }}>
                <Bell size={15} />
                {unreadCount > 0 && (
                  <span style={{
                    position: 'absolute', top: -4, right: -4, width: 16, height: 16, borderRadius: '50%',
                    background: 'var(--accent)', color: 'white', fontSize: 10, fontWeight: 800,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}>
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </span>
                )}
              </button>

              <AnimatePresence>
                {notifOpen && (
                  <motion.div
                    variants={dropdownVariants}
                    initial="hidden" animate="visible" exit="exit"
                    style={{
                      position: 'absolute', right: 0, top: 'calc(100% + 8px)',
                      width: 340, maxHeight: 420, overflowY: 'auto',
                      background: 'var(--bg-card)', border: '1px solid var(--border-base)',
                      borderRadius: 12, boxShadow: '0 8px 32px rgba(15,23,42,0.14)',
                      zIndex: 200,
                    }}
                  >
                    <div style={{ padding: '0.875rem 1rem', borderBottom: '1px solid var(--border-base)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontWeight: 700, fontSize: 14, color: 'var(--text-primary)' }}>{t('profile.notifications')}</span>
                      {unreadCount > 0 && (
                        <button onClick={markAllRead} style={{ background: 'none', border: 'none', color: 'var(--accent)', fontSize: 12, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4, fontFamily: 'inherit' }}>
                          <Check size={11} /> {t('profile.markAllRead')}
                        </button>
                      )}
                    </div>
                    {notifications.length === 0 ? (
                      <div style={{ padding: '2.5rem 1rem', textAlign: 'center', color: 'var(--text-muted)', fontSize: 13 }}>
                        <Bell size={24} style={{ opacity: 0.3, marginBottom: 8, display: 'block', margin: '0 auto 8px' }} />
                        {t('profile.noNotif')}
                      </div>
                    ) : (
                      notifications.slice(0, 8).map(n => {
                        const href = getNotifHref(n)
                        const clickable = !!href
                        return (
                          <div key={n.id}
                            onClick={() => handleNotifClick(n)}
                            style={{
                              padding: '0.75rem 1rem', display: 'flex', gap: 8, alignItems: 'flex-start',
                              cursor: clickable ? 'pointer' : 'default',
                              borderBottom: '1px solid var(--border-subtle)',
                              background: n.isRead ? 'transparent' : 'var(--accent-muted)',
                              transition: 'background 0.15s',
                            }}
                          >
                            {!n.isRead && <div style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--accent)', flexShrink: 0, marginTop: 5 }} />}
                            <div style={{ flex: 1, paddingLeft: n.isRead ? 14 : 0 }}>
                              <div style={{ fontSize: 13, fontWeight: n.isRead ? 500 : 700, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: 6 }}>
                                {n.title}
                                {clickable && <span style={{ fontSize: 11, color: 'var(--accent)', opacity: 0.7 }}>→</span>}
                              </div>
                              <div style={{ fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.4, marginTop: 2 }}>{n.message}</div>
                              <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 3 }}>
                                {new Date(n.createdAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                              </div>
                            </div>
                            <button onClick={e => { e.stopPropagation(); deleteNotif(n.id) }}
                              style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: 4, flexShrink: 0 }}>
                              <Trash2 size={12} />
                            </button>
                          </div>
                        )
                      })
                    )}
                    {notifications.length > 8 && (
                      <Link href="/profile" onClick={() => setNotifOpen(false)}
                        style={{ display: 'block', textAlign: 'center', padding: '0.75rem', color: 'var(--accent)', fontSize: 13, fontWeight: 600, textDecoration: 'none', borderTop: '1px solid var(--border-base)' }}>
                        {t('profile.viewAll')}
                      </Link>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          )}

          {/* User menu */}
          {isLoggedIn ? (
            <div ref={userMenuRef} style={{ position: 'relative' }}>
              <button
                onClick={() => { setUserMenuOpen(!userMenuOpen); setNotifOpen(false) }}
                style={{
                  display: 'flex', alignItems: 'center', gap: 7,
                  padding: '0.3rem 0.65rem 0.3rem 0.3rem',
                  borderRadius: 8,
                  background: 'transparent',
                  border: '1px solid var(--border-base)',
                  cursor: 'pointer', transition: 'background 0.15s, border-color 0.15s',
                }}>
                <div style={{
                  width: 26, height: 26, borderRadius: 7,
                  background: isAdmin ? '#FEF3C7' : 'var(--accent-muted)',
                  border: isAdmin ? '1px solid #FCD34D' : '1px solid var(--accent-border)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 12, fontWeight: 800,
                  color: isAdmin ? '#B45309' : 'var(--accent)',
                }}>
                  {isAdmin ? <Shield size={12} /> : (userName[0]?.toUpperCase() || 'U')}
                </div>
                <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>
                  {isAdmin ? 'Admin' : userName.split(' ')[0]}
                </span>
                <ChevronDown size={12} style={{ color: 'var(--text-muted)', transform: userMenuOpen ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }} />
              </button>

              <AnimatePresence>
                {userMenuOpen && (
                  <motion.div
                    variants={dropdownVariants}
                    initial="hidden" animate="visible" exit="exit"
                    style={{
                      position: 'absolute', right: 0, top: 'calc(100% + 8px)', width: 220, padding: '4px',
                      background: 'var(--bg-card)', border: '1px solid var(--border-base)',
                      borderRadius: 12, boxShadow: '0 8px 32px rgba(15,23,42,0.14)',
                      zIndex: 200,
                    }}
                  >
                    <div style={{ padding: '0.75rem 0.875rem', borderBottom: '1px solid var(--border-base)' }}>
                      <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)' }}>{userName}</div>
                      <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 2 }}>{userEmail}</div>
                      {isAdmin && (
                        <span style={{
                          display: 'inline-flex', alignItems: 'center', gap: 4, marginTop: 6,
                          fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 'var(--radius-full)',
                          background: '#FEF3C7', color: '#B45309', border: '1px solid #FCD34D',
                        }}>
                          <Shield size={10} /> ADMIN
                        </span>
                      )}
                    </div>

                    <div style={{ padding: '4px 0' }}>
                      <Link href="/profile" onClick={() => setUserMenuOpen(false)}
                        style={{
                          display: 'flex', alignItems: 'center', gap: 8,
                          padding: '0.6rem 0.875rem', color: 'var(--text-secondary)',
                          textDecoration: 'none', fontSize: 13, fontWeight: 500, borderRadius: 8,
                          transition: 'background 0.12s, color 0.12s',
                        }}>
                        <User size={14} /> {t('nav.profile')}
                      </Link>
                      {isAdmin && (
                        <Link href="/admin" onClick={() => setUserMenuOpen(false)}
                          style={{
                            display: 'flex', alignItems: 'center', gap: 8,
                            padding: '0.6rem 0.875rem', color: '#B45309',
                            textDecoration: 'none', fontSize: 13, fontWeight: 600, borderRadius: 8,
                          }}>
                          <Settings size={14} /> {t('nav.admin')}
                        </Link>
                      )}
                    </div>

                    <div style={{ padding: '4px', borderTop: '1px solid var(--border-base)' }}>
                      <button
                        onClick={() => signOut({ callbackUrl: '/' })}
                        style={{
                          display: 'flex', alignItems: 'center', gap: 8, width: '100%',
                          padding: '0.6rem 0.875rem', background: 'none', border: 'none',
                          color: '#EF4444', fontSize: 13, fontWeight: 500,
                          cursor: 'pointer', borderRadius: 8, fontFamily: 'inherit',
                        }}>
                        <LogOut size={14} /> {t('nav.signOut')}
                      </button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          ) : (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <Link href="/login" style={{
                padding: '0.4rem 0.9rem', borderRadius: 8, fontSize: 13, fontWeight: 600,
                color: 'var(--text-secondary)', textDecoration: 'none',
                border: '1px solid var(--border-base)', transition: 'all 0.15s',
              }}>
                {t('nav.signIn')}
              </Link>
              <Link href="/register" style={{
                padding: '0.4rem 0.9rem', borderRadius: 8, fontSize: 13, fontWeight: 600,
                background: 'var(--accent)', color: 'white', textDecoration: 'none',
                transition: 'background 0.15s',
              }}>
                {t('nav.register')}
              </Link>
            </div>
          )}

          {/* Mobile menu toggle */}
          <button
            className="mobile-menu-btn"
            onClick={() => setMobileOpen(!mobileOpen)}
            style={{ display: 'none', background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', padding: 4, marginLeft: 4 }}>
            {mobileOpen ? <XIcon size={20} /> : <Menu size={20} />}
          </button>
        </div>
      </div>

      {/* Mobile menu */}
      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            variants={mobileMenuVariants}
            initial="hidden" animate="visible" exit="exit"
            style={{ overflow: 'hidden', borderTop: '1px solid var(--border-base)', background: 'var(--bg-card)' }}
          >
            <div style={{ padding: '1rem 1.5rem 1.5rem' }}>
              {!isHome && navLinks.map(link => (
                <Link key={link.href} href={link.href}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 10, padding: '0.875rem 0',
                    color: isActive(link.href) ? 'var(--accent)' : 'var(--text-secondary)',
                    textDecoration: 'none', fontSize: 15, fontWeight: 500,
                    borderBottom: '1px solid var(--border-subtle)',
                  }}>
                  {link.icon} {link.label}
                </Link>
              ))}
              {!isLoggedIn && (
                <div style={{ display: 'flex', gap: 8, marginTop: '1rem' }}>
                  <Link href="/login" style={{
                    flex: 1, padding: '0.75rem', borderRadius: 10, fontSize: 14, fontWeight: 600,
                    color: 'var(--text-secondary)', border: '1px solid var(--border-base)',
                    textDecoration: 'none', textAlign: 'center',
                  }}>
                    {t('nav.signIn')}
                  </Link>
                  <Link href="/register" style={{
                    flex: 1, padding: '0.75rem', borderRadius: 10, fontSize: 14, fontWeight: 700,
                    background: 'var(--accent)', color: 'white', textDecoration: 'none', textAlign: 'center',
                  }}>
                    {t('nav.register')}
                  </Link>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </nav>
  )
}
