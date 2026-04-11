'use client'

import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useSession, signOut } from 'next-auth/react'
import { Zap, BarChart2, Star, User, Bell, LogOut, Shield, Menu, X } from 'lucide-react'

export function Navbar() {
  const pathname = usePathname()
  const { data: session } = useSession()
  const [notifCount, setNotifCount] = useState(0)
  const [menuOpen, setMenuOpen] = useState(false)
  const [dropOpen, setDropOpen] = useState(false)
  const dropRef = useRef<HTMLDivElement>(null)

  // Fetch unread notification count
  useEffect(() => {
    if (!session?.user) return
    fetch('/api/notifications')
      .then(r => r.json())
      .then(d => setNotifCount((d.notifications || []).filter((n: any) => !n.isRead).length))
      .catch(() => {})
  }, [session])

  // Close dropdown on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (dropRef.current && !dropRef.current.contains(e.target as Node)) {
        setDropOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  const navLinks = [
    { href: '/recommend', icon: <Zap size={14}/>, label: 'Recommandations' },
    { href: '/compare',   icon: <BarChart2 size={14}/>, label: 'Comparer' },
    { href: '/saved',     icon: <Star size={14}/>,    label: 'Favoris' },
  ]

  return (
    <nav style={{
      position: 'sticky', top: 0, zIndex: 100,
      background: 'rgba(10, 12, 24, 0.85)', backdropFilter: 'blur(20px)',
      borderBottom: '1px solid rgba(255,255,255,0.07)',
      padding: '0 1.5rem',
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      height: 60,
    }}>
      {/* Logo */}
      <Link href="/" style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 8 }}>
        <div style={{ width: 28, height: 28, borderRadius: 8, background: 'linear-gradient(135deg, #4f7fff, #7c3aed)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Zap size={14} color="white"/>
        </div>
        <span style={{ fontWeight: 800, fontSize: '0.9375rem', color: 'white', letterSpacing: '-0.01em' }}>
          Mobile<span style={{ color: '#6b93ff' }}>Match</span> <span style={{ opacity: 0.7 }}>Algeria</span>
        </span>
      </Link>

      {/* Desktop nav links */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 4 }} className="desktop-nav">
        {navLinks.map(link => (
          <Link
            key={link.href}
            href={link.href}
            style={{
              display: 'flex', alignItems: 'center', gap: 6, padding: '0.4rem 0.85rem',
              borderRadius: 8, fontSize: 13, fontWeight: 600, textDecoration: 'none',
              color: pathname === link.href ? 'white' : 'var(--text-secondary)',
              background: pathname === link.href ? 'rgba(79,127,255,0.15)' : 'transparent',
              transition: 'all .15s',
            }}
          >
            {link.icon} {link.label}
          </Link>
        ))}
      </div>

      {/* Right side */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        {session?.user ? (
          <>
            {/* Notification bell */}
            <Link href="/profile" style={{ position: 'relative', display: 'flex', textDecoration: 'none' }}>
              <div style={{ padding: '0.4rem', borderRadius: 8, background: 'rgba(255,255,255,0.06)', cursor: 'pointer', display: 'flex' }}>
                <Bell size={16} color="var(--text-secondary)"/>
              </div>
              {notifCount > 0 && (
                <div style={{
                  position: 'absolute', top: -2, right: -2, width: 16, height: 16,
                  borderRadius: '50%', background: '#4f7fff',
                  fontSize: 9, fontWeight: 800, color: 'white',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  {notifCount > 9 ? '9+' : notifCount}
                </div>
              )}
            </Link>

            {/* Avatar dropdown */}
            <div ref={dropRef} style={{ position: 'relative' }}>
              <button
                onClick={() => setDropOpen(!dropOpen)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 6, padding: '0.3rem 0.65rem 0.3rem 0.3rem',
                  borderRadius: 10, background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.1)',
                  cursor: 'pointer', color: 'white',
                }}
              >
                <div style={{ width: 26, height: 26, borderRadius: '50%', background: 'linear-gradient(135deg, #4f7fff, #7c3aed)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 800 }}>
                  {session.user.name?.[0]?.toUpperCase() || 'U'}
                </div>
                <span style={{ fontSize: 12, fontWeight: 600, maxWidth: 80, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {session.user.name?.split(' ')[0]}
                </span>
              </button>

              {dropOpen && (
                <div style={{
                  position: 'absolute', top: '100%', right: 0, marginTop: 8,
                  background: '#1a1f35', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 12,
                  padding: '0.5rem', minWidth: 180, boxShadow: '0 20px 40px rgba(0,0,0,0.5)',
                  zIndex: 200,
                }}>
                  <div style={{ padding: '0.5rem 0.75rem', fontSize: 12, color: 'var(--text-secondary)', borderBottom: '1px solid rgba(255,255,255,0.07)', marginBottom: '0.4rem' }}>
                    {session.user.email}
                  </div>
                  <DropLink href="/profile" icon={<User size={13}/>} label="Mon profil" onClick={() => setDropOpen(false)}/>
                  <DropLink href="/saved"   icon={<Star size={13}/>}   label="Mes favoris"  onClick={() => setDropOpen(false)}/>
                  {(session.user as any).role === 'ADMIN' && (
                    <DropLink href="/admin" icon={<Shield size={13}/>} label="Administration" onClick={() => setDropOpen(false)}/>
                  )}
                  <button
                    onClick={() => signOut({ callbackUrl: '/' })}
                    style={{ display: 'flex', alignItems: 'center', gap: 8, width: '100%', padding: '0.5rem 0.75rem', borderRadius: 8, background: 'transparent', border: 'none', cursor: 'pointer', fontSize: 13, color: '#f87171', marginTop: 4 }}
                  >
                    <LogOut size={13}/> Déconnexion
                  </button>
                </div>
              )}
            </div>
          </>
        ) : (
          <Link href="/login" style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '0.45rem 1rem', borderRadius: 8, background: 'linear-gradient(135deg, #4f7fff, #7c3aed)', color: 'white', textDecoration: 'none', fontSize: 13, fontWeight: 700 }}>
            <User size={13}/> Connexion
          </Link>
        )}

        {/* Mobile hamburger */}
        <button
          onClick={() => setMenuOpen(!menuOpen)}
          style={{ display: 'none', padding: '0.4rem', background: 'rgba(255,255,255,0.06)', border: 'none', borderRadius: 8, cursor: 'pointer', color: 'white' }}
          className="mobile-menu-btn"
        >
          {menuOpen ? <X size={18}/> : <Menu size={18}/>}
        </button>
      </div>

      {/* Mobile dropdown */}
      {menuOpen && (
        <div style={{ position: 'absolute', top: 60, left: 0, right: 0, background: 'rgba(10,12,24,0.97)', backdropFilter: 'blur(20px)', borderBottom: '1px solid rgba(255,255,255,0.07)', padding: '1rem 1.5rem', display: 'flex', flexDirection: 'column', gap: 4 }}>
          {navLinks.map(link => (
            <Link key={link.href} href={link.href} onClick={() => setMenuOpen(false)} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '0.65rem 0.75rem', borderRadius: 8, textDecoration: 'none', color: 'white', fontSize: 14, fontWeight: 600 }}>
              {link.icon} {link.label}
            </Link>
          ))}
        </div>
      )}
    </nav>
  )
}

function DropLink({ href, icon, label, onClick }: { href: string; icon: React.ReactNode; label: string; onClick?: () => void }) {
  return (
    <Link href={href} onClick={onClick} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '0.5rem 0.75rem', borderRadius: 8, textDecoration: 'none', fontSize: 13, color: 'var(--text-primary)', transition: 'background .15s' }}
      onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.07)')}
      onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
    >
      {icon} {label}
    </Link>
  )
}
