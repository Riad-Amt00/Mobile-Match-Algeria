export default function Loading() {
  return (
    <div style={{
      minHeight: '80vh', background: 'var(--bg-dark)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
    }}>
      <div style={{ textAlign: 'center' }}>
        <div style={{
          width: 48, height: 48, margin: '0 auto 1rem',
          border: '3px solid rgba(79,127,255,0.2)',
          borderTopColor: '#4f7fff',
          borderRadius: '50%',
          animation: 'spin 0.8s linear infinite',
        }}/>
        <p style={{ color: 'var(--text-secondary)', fontSize: 14 }}>Loading...</p>
      </div>
    </div>
  )
}
