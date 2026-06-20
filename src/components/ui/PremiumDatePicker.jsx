import React, { useState, useRef, useEffect } from 'react';
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight } from 'lucide-react';

export default function PremiumDatePicker({ value, onChange, min, max, style = {} }) {
  const [isOpen, setIsOpen] = useState(false);
  const [placement, setPlacement] = useState('bottom');
  const containerRef = useRef(null);
  const dropdownRef = useRef(null);

  // Parse initial date or default to today
  const initDate = value ? new Date(value) : new Date();
  const [currentMonth, setCurrentMonth] = useState(new Date(initDate.getFullYear(), initDate.getMonth(), 1));

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    if (isOpen && containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      // Dropdown is roughly 340px tall for datepicker
      if (rect.bottom + 340 > window.innerHeight && rect.top > 340) {
        setPlacement('top');
      } else {
        setPlacement('bottom');
      }
    }
  }, [isOpen]);

  const daysInMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0).getDate();
  const firstDayOfMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1).getDay();

  const handlePrevMonth = (e) => {
    e.preventDefault();
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1));
  };

  const handleNextMonth = (e) => {
    e.preventDefault();
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1));
  };

  const handleDateClick = (day) => {
    const d = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), day);
    // Format YYYY-MM-DD local
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    const dateStr = `${yyyy}-${mm}-${dd}`;
    onChange({ target: { value: dateStr } });
    setIsOpen(false);
  };

  const displayFormat = value ? new Date(value).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : 'Select Date';

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
          width: '100%', flex: 1, display: 'flex', alignItems: 'center', gap: '8px',
          padding: '10px 14px', background: isOpen ? 'hsl(var(--bg-dark))' : 'hsl(var(--bg-card))',
          border: `1.5px solid ${isOpen ? 'hsl(var(--primary))' : 'hsl(var(--border-color))'}`,
          borderRadius: '10px', cursor: 'pointer', transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
          boxShadow: isOpen ? '0 0 0 3px rgba(14, 165, 233, 0.15)' : 'none',
          color: value ? 'hsl(var(--text-primary))' : 'hsl(var(--text-muted))',
          fontSize: '0.82rem', fontWeight: 600, outline: 'none', justifyContent: 'flex-start'
        }}
      >
        <CalendarIcon size={14} style={{ color: isOpen ? 'hsl(var(--primary))' : 'hsl(var(--text-muted))' }} />
        <span>{displayFormat}</span>
      </button>

      {isOpen && (
        <div 
          ref={dropdownRef}
          className="animate-fade-in"
          style={{
            position: 'absolute', 
            ...(placement === 'top' ? { bottom: 'calc(100% + 6px)' } : { top: 'calc(100% + 6px)' }),
            left: 0, zIndex: 1000,
            background: 'hsl(var(--bg-card))', border: '1px solid hsl(var(--border-color))',
            borderRadius: '12px', padding: '20px', boxShadow: '0 10px 40px rgba(0,0,0,0.12)',
            minWidth: '320px'
          }}
        >
          {/* Header */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
            <button type="button" onClick={handlePrevMonth} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '6px', display: 'flex' }}><ChevronLeft size={20} color="hsl(var(--text-primary))" /></button>
            <div style={{ fontWeight: 800, fontSize: '1.05rem', color: 'hsl(var(--text-primary))' }}>
              {currentMonth.toLocaleString('en-IN', { month: 'long', year: 'numeric' })}
            </div>
            <button type="button" onClick={handleNextMonth} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '6px', display: 'flex' }}><ChevronRight size={20} color="hsl(var(--text-primary))" /></button>
          </div>

          {/* Days Grid */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '6px' }}>
            {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map(d => (
              <div key={d} style={{ textAlign: 'center', fontSize: '0.78rem', fontWeight: 800, color: 'hsl(var(--text-muted))', paddingBottom: '8px' }}>{d}</div>
            ))}
            
            {[...Array(firstDayOfMonth)].map((_, i) => <div key={`empty-${i}`} />)}
            
            {[...Array(daysInMonth)].map((_, i) => {
              const day = i + 1;
              const isSelected = value && new Date(value).getDate() === day && new Date(value).getMonth() === currentMonth.getMonth() && new Date(value).getFullYear() === currentMonth.getFullYear();
              const isToday = new Date().getDate() === day && new Date().getMonth() === currentMonth.getMonth() && new Date().getFullYear() === currentMonth.getFullYear();
              
              const currentItemDate = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), day);
              let disabled = false;
              if (min && currentItemDate < new Date(min)) disabled = true;
              if (max && currentItemDate > new Date(max)) disabled = true;

              return (
                <button
                  type="button"
                  key={day}
                  disabled={disabled}
                  onClick={() => handleDateClick(day)}
                  style={{
                    aspectRatio: '1', display: 'flex', alignItems: 'center', justifyContent: 'center',
                    background: isSelected ? 'hsl(var(--primary))' : isToday ? 'hsl(var(--primary) / 10%)' : 'transparent',
                    color: isSelected ? '#fff' : isToday ? 'hsl(var(--primary))' : disabled ? 'hsl(var(--border-color))' : 'hsl(var(--text-primary))',
                    border: 'none', borderRadius: '8px', fontSize: '0.88rem', fontWeight: isSelected || isToday ? 800 : 600,
                    cursor: disabled ? 'not-allowed' : 'pointer', transition: 'all 0.2s',
                    opacity: disabled ? 0.5 : 1
                  }}
                  onMouseEnter={(e) => { if (!isSelected && !disabled) e.currentTarget.style.background = 'hsl(var(--bg-dark))'; }}
                  onMouseLeave={(e) => { if (!isSelected && !disabled) e.currentTarget.style.background = isToday ? 'hsl(var(--primary) / 10%)' : 'transparent'; }}
                >
                  {day}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
