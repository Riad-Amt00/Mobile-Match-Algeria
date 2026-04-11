'use client'

import { useState, useEffect, useCallback, createContext, useContext, useRef } from 'react'
import { CheckCircle, XCircle, AlertTriangle, Info, X } from 'lucide-react'

/* ── Types ───────────────────────────────────────────────────────── */
type ToastType = 'success' | 'error' | 'warning' | 'info'

interface Toast {
  id: string
  type: ToastType
  message: string
  duration?: number
}

interface ToastContextValue {
  toast: (message: string, type?: ToastType, duration?: number) => void
  success: (message: string) => void
  error: (message: string) => void
  warning: (message: string) => void
  info: (message: string) => void
}

/* ── Context ─────────────────────────────────────────────────────── */
const ToastContext = createContext<ToastContextValue | null>(null)

export function useToast() {
  const ctx = useContext(ToastContext)
  if (!ctx) throw new Error('useToast must be used within <ToastProvider>')
  return ctx
}

/* ── Toast Item ──────────────────────────────────────────────────── */
function ToastItem({ toast, onDismiss }: { toast: Toast; onDismiss: (id: string) => void }) {
  const [visible, setVisible] = useState(false)
  const timerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)

  useEffect(() => {
    // Animate in
    requestAnimationFrame(() => setVisible(true))
    // Auto-dismiss
    timerRef.current = setTimeout(() => {
      setVisible(false)
      setTimeout(() => onDismiss(toast.id), 300)
    }, toast.duration ?? 3500)
    return () => clearTimeout(timerRef.current)
  }, [toast.id, toast.duration, onDismiss])

  const config = {
    success: { icon: <CheckCircle size={16}/>, bg: 'rgba(74,222,128,0.12)', border: 'rgba(74,222,128,0.3)', color: '#4ade80' },
    error:   { icon: <XCircle size={16}/>,     bg: 'rgba(248,113,113,0.12)', border: 'rgba(248,113,113,0.3)', color: '#f87171' },
    warning: { icon: <AlertTriangle size={16}/>,bg: 'rgba(245,158,11,0.12)', border: 'rgba(245,158,11,0.3)',  color: '#f59e0b' },
    info:    { icon: <Info size={16}/>,         bg: 'rgba(79,127,255,0.12)', border: 'rgba(79,127,255,0.3)',  color: '#6b93ff' },
  }[toast.type]

  return (
    <div
      role="alert"
      style={{
        display: 'flex', alignItems: 'center', gap: 10,
        padding: '0.75rem 1rem', borderRadius: 12,
        background: config.bg, border: `1px solid ${config.border}`,
        backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)',
        boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
        minWidth: 260, maxWidth: 380,
        transform: visible ? 'translateX(0)' : 'translateX(120%)',
        opacity: visible ? 1 : 0,
        transition: 'all 0.3s cubic-bezier(0.4,0,0.2,1)',
        cursor: 'pointer',
      }}
      onClick={() => { setVisible(false); setTimeout(() => onDismiss(toast.id), 300) }}
    >
      <span style={{ color: config.color, flexShrink: 0 }}>{config.icon}</span>
      <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', flex: 1 }}>
        {toast.message}
      </span>
      <button
        style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', padding: 2, display: 'flex', flexShrink: 0 }}
        onClick={e => { e.stopPropagation(); setVisible(false); setTimeout(() => onDismiss(toast.id), 300) }}
        aria-label="Dismiss"
      >
        <X size={13}/>
      </button>
    </div>
  )
}

/* ── Provider ────────────────────────────────────────────────────── */
export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([])

  const dismiss = useCallback((id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id))
  }, [])

  const toast = useCallback((message: string, type: ToastType = 'info', duration?: number) => {
    const id = `${Date.now()}-${Math.random().toString(36).slice(2)}`
    setToasts(prev => [...prev.slice(-4), { id, type, message, duration }])
  }, [])

  const value: ToastContextValue = {
    toast,
    success: (msg) => toast(msg, 'success'),
    error:   (msg) => toast(msg, 'error'),
    warning: (msg) => toast(msg, 'warning'),
    info:    (msg) => toast(msg, 'info'),
  }

  return (
    <ToastContext.Provider value={value}>
      {children}
      {/* Toast container */}
      <div
        aria-live="polite"
        style={{
          position: 'fixed', bottom: '1.5rem', right: '1.5rem',
          display: 'flex', flexDirection: 'column', gap: 10,
          zIndex: 9999, pointerEvents: 'none',
        }}
      >
        {toasts.map(t => (
          <div key={t.id} style={{ pointerEvents: 'all' }}>
            <ToastItem toast={t} onDismiss={dismiss}/>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  )
}
