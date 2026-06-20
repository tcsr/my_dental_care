
export default function EmptyStateCard({ icon: Icon, title, message }) {
  return (
    <div className="glass-card" style={{
      padding: '40px 20px',
      textAlign: 'center',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      border: '1.5px dashed hsl(var(--border-color))',
      borderRadius: '16px',
      background: 'hsl(var(--bg-card) / 40%)',
      backdropFilter: 'blur(8px)',
      gap: '12px',
      margin: '10px 0',
      animation: 'animate-fade-in 0.3s ease-out'
    }}>
      <div style={{
        width: '56px',
        height: '56px',
        borderRadius: '50%',
        background: 'hsl(var(--primary-glow))',
        color: 'hsl(var(--primary))',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        boxShadow: '0 8px 20px rgba(0,0,0,0.05)'
      }}>
        {Icon ? <Icon size={24} /> : <span style={{ fontSize: '24px' }}>📭</span>}
      </div>
      <div>
        <h4 style={{ margin: 0, fontSize: '0.92rem', fontWeight: '800', color: 'hsl(var(--text-primary))', fontFamily: 'Outfit' }}>
          {title}
        </h4>
        <p style={{ margin: '4px 0 0', fontSize: '0.75rem', color: 'hsl(var(--text-muted))', lineHeight: 1.4, maxWidth: '280px', marginInline: 'auto' }}>
          {message}
        </p>
      </div>
    </div>
  );
}
