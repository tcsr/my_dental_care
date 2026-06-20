import React from 'react';

export default function PremiumLoader({ text = "Loading..." }) {
  return (
    <div style={{ 
      display: 'flex', 
      flexDirection: 'column', 
      alignItems: 'center', 
      justifyContent: 'center', 
      padding: '60px 20px',
      gap: '20px',
      animation: 'animate-fade-in 0.4s ease-out'
    }}>
      <div style={{ position: 'relative', width: '60px', height: '60px' }}>
        {/* Outer glowing pulse */}
        <div style={{
          position: 'absolute',
          inset: 0,
          borderRadius: '50%',
          border: '3px solid hsl(var(--primary))',
          opacity: 0.2,
          animation: 'ping 1.5s cubic-bezier(0, 0, 0.2, 1) infinite'
        }} />
        
        {/* Inner spinning gradient ring */}
        <div style={{
          position: 'absolute',
          inset: '8px',
          borderRadius: '50%',
          border: '4px solid transparent',
          borderTopColor: 'hsl(var(--primary))',
          borderRightColor: 'hsl(var(--secondary))',
          animation: 'spin 1s linear infinite'
        }} />
        
        {/* Center glowing dot */}
        <div style={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          width: '12px',
          height: '12px',
          borderRadius: '50%',
          background: 'hsl(var(--primary))',
          boxShadow: '0 0 10px hsl(var(--primary))'
        }} />
      </div>
      
      <div style={{
        fontSize: '0.85rem',
        fontWeight: '700',
        fontFamily: 'Outfit',
        color: 'hsl(var(--text-primary))',
        letterSpacing: '0.05em',
        textTransform: 'uppercase',
        animation: 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite'
      }}>
        {text}
      </div>
      
      <style>{`
        @keyframes ping {
          0% { transform: scale(1); opacity: 0.8; }
          100% { transform: scale(1.8); opacity: 0; }
        }
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }
      `}</style>
    </div>
  );
}
