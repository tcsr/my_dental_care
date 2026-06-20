export default function EmptyStateCard({ icon: Icon, title, message, action }) {
  return (
    <div style={{
      padding: '40px 20px',
      textAlign: 'center',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      border: '1.5px dashed hsl(var(--border-color))',
      borderRadius: '24px',
      background: 'linear-gradient(145deg, hsl(var(--bg-card)) 0%, hsl(var(--bg-dark)) 100%)',
      boxShadow: 'inset 0 2px 20px rgba(255,255,255,0.5), 0 10px 40px rgba(0,0,0,0.02)',
      gap: '16px',
      margin: '10px 0',
      animation: 'animate-fade-in 0.4s ease-out'
    }}>
      <div style={{
        width: '64px',
        height: '64px',
        borderRadius: '20px',
        background: 'linear-gradient(135deg, hsl(var(--primary-glow)), hsl(var(--secondary-glow)))',
        color: 'hsl(var(--primary))',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        boxShadow: '0 8px 24px rgba(0,0,0,0.06)',
        transform: 'rotate(-5deg)',
        transition: 'transform 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
        cursor: 'default'
      }} onMouseEnter={e => e.currentTarget.style.transform = 'rotate(0deg) scale(1.05)'} onMouseLeave={e => e.currentTarget.style.transform = 'rotate(-5deg)'}>
        {Icon ? <Icon size={28} /> : <span style={{ fontSize: '28px' }}>📭</span>}
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
        <h4 style={{ margin: 0, fontSize: '1.05rem', fontWeight: '800', color: 'hsl(var(--text-primary))', fontFamily: 'Outfit', letterSpacing: '-0.02em' }}>
          {title}
        </h4>
        <p style={{ margin: 0, fontSize: '0.8rem', color: 'hsl(var(--text-muted))', lineHeight: 1.5, maxWidth: '280px', marginInline: 'auto' }}>
          {message}
        </p>
        {action && (
          <div style={{ marginTop: '12px' }}>
            {action}
          </div>
        )}
      </div>
    </div>
  );
}
