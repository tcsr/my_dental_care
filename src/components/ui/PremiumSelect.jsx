import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown, Check } from 'lucide-react';

export default function PremiumSelect({ 
  value, 
  onChange, 
  options, 
  placeholder = 'Select...',
  icon = null,
  style = {},
  children
}) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Parse children into options if options prop is not provided
  let parsedOptions = options || [];
  if (!options && children) {
    const extractOptions = (nodes) => {
      let opts = [];
      React.Children.forEach(nodes, child => {
        if (!child) return;
        if (child.type === 'option') {
          opts.push({ label: child.props.children, value: child.props.value });
        } else if (Array.isArray(child)) {
          opts.push(...extractOptions(child));
        } else if (child.props && child.props.children) {
           // Handle fragments or nested arrays
           opts.push(...extractOptions(child.props.children));
        }
      });
      return opts;
    };
    parsedOptions = extractOptions(children);
  }

  const selectedOption = parsedOptions.find(o => String(o.value) === String(value)) || { label: placeholder, value: '' };

  // Filter out visual styles intended for the button so the wrapper doesn't double-render borders
  const { border, padding, background, borderRadius, fontSize, color, outline, ...wrapperStyle } = style;

  return (
    <div ref={containerRef} style={{ boxSizing: 'border-box', display: 'flex', flexDirection: 'column', alignItems: 'stretch', position: 'relative', width: '100%', flex: 1, fontFamily: 'Inter', ...wrapperStyle }}>
      <button
        type="button"
        className="premium-select-btn"
        onClick={() => setIsOpen(!isOpen)}
        style={{
          boxSizing: 'border-box',
          width: '100%', flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '10px 14px', background: isOpen ? 'hsl(var(--bg-dark))' : 'hsl(var(--bg-card))',
          border: `1.5px solid ${isOpen ? 'hsl(var(--primary))' : 'hsl(var(--border-color))'}`,
          borderRadius: '10px', cursor: 'pointer', transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
          boxShadow: isOpen ? '0 0 0 3px rgba(14, 165, 233, 0.15)' : 'none',
          color: value ? 'hsl(var(--text-primary))' : 'hsl(var(--text-muted))',
          fontSize: '0.82rem', fontWeight: 600, outline: 'none'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          {icon && <span style={{ color: isOpen ? 'hsl(var(--primary))' : 'hsl(var(--text-muted))', display: 'flex' }}>{icon}</span>}
          <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {selectedOption.label}
          </span>
        </div>
        <ChevronDown size={14} style={{ transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.2s', color: 'hsl(var(--text-dim))' }} />
      </button>

      {isOpen && (
        <div 
          className="animate-fade-in"
          style={{
            position: 'absolute', top: 'calc(100% + 6px)', left: 0, zIndex: 1000,
            background: 'hsl(var(--bg-card))', border: '1px solid hsl(var(--border-color))',
            borderRadius: '12px', padding: '6px', boxShadow: '0 10px 30px rgba(0,0,0,0.1)',
            maxHeight: '240px', overflowY: 'auto', minWidth: '100%', width: 'max-content'
          }}
        >
          {parsedOptions.map((opt, i) => (
            <div
              key={i}
              onClick={() => { onChange({ target: { value: opt.value } }); setIsOpen(false); }}
              style={{
                padding: '10px 12px', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                cursor: 'pointer', borderRadius: '8px', fontSize: '0.8rem', fontWeight: 600,
                background: value === opt.value ? 'hsl(var(--primary) / 10%)' : 'transparent',
                color: value === opt.value ? 'hsl(var(--primary))' : 'hsl(var(--text-primary))',
                transition: 'background 0.15s'
              }}
              onMouseEnter={(e) => { if (value !== opt.value) e.currentTarget.style.background = 'hsl(var(--bg-dark))'; }}
              onMouseLeave={(e) => { if (value !== opt.value) e.currentTarget.style.background = 'transparent'; }}
            >
              <span>{opt.label}</span>
              {value === opt.value && <Check size={14} color="hsl(var(--primary))" />}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
