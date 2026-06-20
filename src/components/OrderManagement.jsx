import { useState, useEffect } from 'react';
import { supabase } from '../utils/supabase';
import { 
  RefreshCw, 
  Package, 
  ChevronDown, 
  Search, 
  X, 
  Clock, 
  Truck, 
  MapPin,
  TrendingUp,
  ChevronRight,
  Phone
} from 'lucide-react';
import PremiumLoader from './ui/PremiumLoader';
import EmptyStateCard from './EmptyStateCard';

const STATUSES = ['all', 'pending', 'confirmed', 'dispatched', 'delivered'];

const STATUS_CFG = {
  pending:    { color: '#f59e0b', bg: 'rgba(245,158,11,0.08)',  label: 'Pending',    next: 'confirmed',  action: 'Confirm Order',  gradient: 'linear-gradient(135deg, #f59e0b, #ea580c)' },
  confirmed:  { color: '#0ea5e9', bg: 'rgba(14,165,233,0.08)', label: 'Confirmed',  next: 'dispatched', action: 'Ship Order',     gradient: 'linear-gradient(135deg, #0ea5e9, #6366f1)' },
  dispatched: { color: '#6366f1', bg: 'rgba(99,102,241,0.08)', label: 'Dispatched', next: 'delivered',  action: 'Deliver Order',  gradient: 'linear-gradient(135deg, #6366f1, #10b981)' },
  delivered:  { color: '#10b981', bg: 'rgba(16,185,129,0.08)', label: 'Delivered',  next: null,         action: null,             gradient: null },
  cancelled:  { color: '#ef4444', bg: 'rgba(239,68,68,0.08)',  label: 'Cancelled',  next: null,         action: null,             gradient: null },
};

const STEP_LABELS = {
  pending: 'Pending',
  confirmed: 'Confirmed',
  dispatched: 'Shipped',
  delivered: 'Delivered'
};

const getInitials = (name) => {
  if (!name) return 'Dr';
  return name
    .split(' ')
    .filter(Boolean)
    .map(n => n[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();
};

export default function OrderManagement() {
  const [orders, setOrders] = useState([]);
  const [profiles, setProfiles] = useState({});
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState('all');
  const [updating, setUpdating] = useState(null);
  const [expanded, setExpanded] = useState(null);
  const [dispatchModal, setDispatchModal] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchFocused, setSearchFocused] = useState(false);

  const fetchOrders = async () => {
    setLoading(true);
    const { data: ordersData } = await supabase
      .from('orders')
      .select('*, order_items(qty, unit_price, product:products(name, category))')
      .order('created_at', { ascending: false });

    const allOrders = ordersData || [];

    const doctorIds = [...new Set(allOrders.map(o => o.doctor_id).filter(Boolean))];
    if (doctorIds.length) {
      const { data: profilesData } = await supabase
        .from('profiles')
        .select('id, name, clinic_name, phone')
        .in('id', doctorIds);
      const map = Object.fromEntries((profilesData || []).map(p => [p.id, p]));
      setProfiles(map);
    }

    setOrders(allOrders);
    setLoading(false);
  };

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchOrders();
  }, []);

  const updateStatus = async (orderId, newStatus) => {
    setUpdating(orderId);
    await supabase.from('orders').update({ status: newStatus }).eq('id', orderId);
    await fetchOrders();
    setUpdating(null);
  };

  // Calculations for dashboard
  const activeCount = orders.filter(o => ['pending', 'confirmed'].includes(o.status)).length;
  const inTransitCount = orders.filter(o => o.status === 'dispatched').length;
  const totalRevenue = orders
    .filter(o => o.status !== 'cancelled')
    .reduce((sum, o) => sum + (o.total || 0), 0);

  const formatCurrency = (val) => {
    return '₹' + val.toLocaleString('en-IN');
  };

  const parseTracking = (notes) => {
    if (!notes) return null;
    const match = notes.match(/\[TRACKING\]\s*Courier:\s*([^\s|]+[^|]*)\s*\|\s*Tracking:\s*([^\s\n]+)/i);
    if (match) {
      return { courier: match[1].trim(), tracking: match[2].trim() };
    }
    return null;
  };

  const filtered = orders.filter(order => {
    // 1. Tab filter
    if (tab !== 'all' && order.status !== tab) return false;

    // 2. Search filter
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    const doctor = profiles[order.doctor_id] || {};
    const doctorName = (doctor.name || '').toLowerCase();
    const clinicName = (doctor.clinic_name || '').toLowerCase();
    const orderId = order.id.toLowerCase();
    const shortId = order.id.slice(-8).toLowerCase();
    
    return (
      doctorName.includes(query) ||
      clinicName.includes(query) ||
      orderId.includes(query) ||
      shortId.includes(query)
    );
  });

  const counts = STATUSES.slice(1).reduce((acc, s) => {
    acc[s] = orders.filter(o => o.status === s).length;
    return acc;
  }, {});

  const filterOptions = [
    { key: 'all',        label: 'All',        color: '#64748b', count: orders.length },
    { key: 'pending',    label: 'Pending',    color: STATUS_CFG.pending.color,    count: counts.pending    || 0 },
    { key: 'confirmed',  label: 'Confirmed',  color: STATUS_CFG.confirmed.color,  count: counts.confirmed  || 0 },
    { key: 'dispatched', label: 'Dispatched', color: STATUS_CFG.dispatched.color, count: counts.dispatched || 0 },
    { key: 'delivered',  label: 'Delivered',  color: STATUS_CFG.delivered.color,  count: counts.delivered  || 0 },
  ];

  return (
    <div style={{ paddingBottom: 24, maxWidth: '1000px', margin: '0 auto' }}>
      
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <div>
          <h2 style={{ fontFamily: 'Outfit', fontWeight: 900, fontSize: '1.4rem', color: 'hsl(var(--text-primary))', margin: '0 0 4px', letterSpacing: '-0.02em' }}>
            Orders Panel
          </h2>
          <p style={{ fontSize: '0.78rem', color: 'hsl(var(--text-muted))', fontWeight: 500 }}>
            Manage & track doctor orders
          </p>
        </div>
        <button 
          onClick={fetchOrders} 
          style={{ 
            display: 'flex', 
            alignItems: 'center', 
            gap: 6, 
            padding: '8px 14px', 
            borderRadius: 12, 
            border: '1px solid hsl(var(--border-color))', 
            background: 'hsl(var(--bg-card))', 
            color: 'hsl(var(--text-muted))', 
            fontSize: '0.74rem', 
            fontWeight: 700, 
            cursor: 'pointer', 
            fontFamily: 'Outfit',
            boxShadow: '0 2px 6px rgba(0,0,0,0.02)',
            transition: 'all 0.2s ease'
          }}
          onMouseEnter={(e) => e.currentTarget.style.borderColor = 'hsl(var(--primary) / 30%)'}
          onMouseLeave={(e) => e.currentTarget.style.borderColor = 'hsl(var(--border-color))'}
        >
          <RefreshCw size={13} className={loading ? 'animate-spin' : ''} style={{ animation: loading ? 'spin 1s linear infinite' : 'none' }} /> 
          Refresh
        </button>
      </div>

      {/* Premium Statistics Overview Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16, marginBottom: 24 }}>
        {/* Active Stats */}
        <div style={{ 
          background: 'hsl(var(--bg-card))', borderRadius: '16px', padding: '20px', 
          border: '1px solid hsl(var(--border-color))', borderTop: '4px solid #f59e0b',
          boxShadow: '0 4px 20px rgba(0, 0, 0, 0.02)', display: 'flex', flexDirection: 'column',
          alignItems: 'center', justifyContent: 'center', textAlign: 'center', transition: 'transform 0.2s',
          cursor: 'default'
        }} onMouseEnter={e => e.currentTarget.style.transform = 'translateY(-4px)'} onMouseLeave={e => e.currentTarget.style.transform = 'translateY(0)'}>
          <div style={{ width: 44, height: 44, borderRadius: '12px', background: 'rgba(245, 158, 11, 0.1)', color: '#f59e0b', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '12px' }}>
            <Clock size={20} />
          </div>
          <div style={{ fontSize: '0.68rem', fontWeight: 800, color: 'hsl(var(--text-muted))', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '4px' }}>Active Orders</div>
          <div style={{ fontSize: '1.75rem', fontWeight: 900, color: 'hsl(var(--text-primary))', fontFamily: 'Outfit', lineHeight: 1 }}>{activeCount}</div>
        </div>

        {/* Shipped Stats */}
        <div style={{ 
          background: 'hsl(var(--bg-card))', borderRadius: '16px', padding: '20px', 
          border: '1px solid hsl(var(--border-color))', borderTop: '4px solid #6366f1',
          boxShadow: '0 4px 20px rgba(0, 0, 0, 0.02)', display: 'flex', flexDirection: 'column',
          alignItems: 'center', justifyContent: 'center', textAlign: 'center', transition: 'transform 0.2s',
          cursor: 'default'
        }} onMouseEnter={e => e.currentTarget.style.transform = 'translateY(-4px)'} onMouseLeave={e => e.currentTarget.style.transform = 'translateY(0)'}>
          <div style={{ width: 44, height: 44, borderRadius: '12px', background: 'rgba(99, 102, 241, 0.1)', color: '#6366f1', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '12px' }}>
            <Truck size={20} />
          </div>
          <div style={{ fontSize: '0.68rem', fontWeight: 800, color: 'hsl(var(--text-muted))', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '4px' }}>In Transit</div>
          <div style={{ fontSize: '1.75rem', fontWeight: 900, color: 'hsl(var(--text-primary))', fontFamily: 'Outfit', lineHeight: 1 }}>{inTransitCount}</div>
        </div>

        {/* Revenue Stats */}
        <div style={{ 
          background: 'hsl(var(--bg-card))', borderRadius: '16px', padding: '20px', 
          border: '1px solid hsl(var(--border-color))', borderTop: '4px solid #10b981',
          boxShadow: '0 4px 20px rgba(0, 0, 0, 0.02)', display: 'flex', flexDirection: 'column',
          alignItems: 'center', justifyContent: 'center', textAlign: 'center', transition: 'transform 0.2s',
          cursor: 'default'
        }} onMouseEnter={e => e.currentTarget.style.transform = 'translateY(-4px)'} onMouseLeave={e => e.currentTarget.style.transform = 'translateY(0)'}>
          <div style={{ width: 44, height: 44, borderRadius: '12px', background: 'rgba(16, 185, 129, 0.1)', color: '#10b981', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '12px' }}>
            <TrendingUp size={20} />
          </div>
          <div style={{ fontSize: '0.68rem', fontWeight: 800, color: 'hsl(var(--text-muted))', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '4px' }}>Total Value</div>
          <div style={{ fontSize: '1.75rem', fontWeight: 900, color: 'hsl(var(--text-primary))', fontFamily: 'Outfit', lineHeight: 1, textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap', maxWidth: '100%' }}>
            {formatCurrency(totalRevenue)}
          </div>
        </div>
      </div>

      {/* Search Input Box */}
      <div style={{ 
        position: 'relative', 
        marginBottom: 16,
        transition: 'all 0.3s ease'
      }}>
        <Search size={16} color={searchFocused ? 'hsl(var(--primary))' : 'hsl(var(--text-dim))'} style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', transition: 'color 0.2s' }} />
        <input
          type="text"
          placeholder="Search by doctor name, clinic, or order ID..."
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
          onFocus={() => setSearchFocused(true)}
          onBlur={() => setSearchFocused(false)}
          style={{
            width: '100%',
            padding: '12px 14px 12px 42px',
            borderRadius: 14,
            border: searchFocused ? '1.5px solid hsl(var(--primary))' : '1.5px solid hsl(var(--border-color))',
            background: 'hsl(var(--bg-card))',
            color: 'hsl(var(--text-primary))',
            fontSize: '0.82rem',
            fontFamily: 'Outfit',
            fontWeight: 500,
            outline: 'none',
            transition: 'all 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
            boxShadow: searchFocused ? '0 4px 18px hsl(var(--primary-glow))' : '0 2px 6px rgba(0,0,0,0.01)'
          }}
        />
        {searchQuery && (
          <button 
            onClick={() => setSearchQuery('')} 
            style={{ 
              position: 'absolute', 
              right: 12, 
              top: '50%', 
              transform: 'translateY(-50%)', 
              background: 'hsl(var(--border-color) / 40%)', 
              border: 'none', 
              cursor: 'pointer', 
              borderRadius: '50%', 
              width: 20, 
              height: 20, 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center',
              padding: 0
            }}
          >
            <X size={12} color="hsl(var(--text-muted))" />
          </button>
        )}
      </div>

      {/* Modern Filter Chips */}
      <div className="om-chips" style={{ display: 'flex', justifyContent: 'flex-start', alignItems: 'center', gap: 8, overflowX: 'auto', scrollbarWidth: 'none', marginBottom: 18, paddingBottom: 6 }}>
        <style>{`.om-chips::-webkit-scrollbar{display:none}`}</style>
        {filterOptions.map(({ key, label, color, count }) => {
          const active = tab === key;
          return (
            <button 
              key={key} 
              className="tab-btn"
              onClick={() => setTab(key)} 
              style={{
                flexShrink: 0, 
                display: 'flex', 
                alignItems: 'center', 
                gap: 7,
                padding: '8px 16px', 
                borderRadius: 22,
                border: active ? `1.5px solid ${color}` : '1.5px solid hsl(var(--border-color))',
                background: active ? `${color}15` : 'hsl(var(--bg-card))',
                color: active ? color : 'hsl(var(--text-muted))',
                cursor: 'pointer', 
                fontFamily: 'Outfit', 
                transition: 'all 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
                boxShadow: active ? `0 4px 12px ${color}15` : '0 2px 4px rgba(0,0,0,0.01)',
                fontWeight: 700
              }}
              onMouseEnter={(e) => {
                if (!active) e.currentTarget.style.borderColor = color;
              }}
              onMouseLeave={(e) => {
                if (!active) e.currentTarget.style.borderColor = 'hsl(var(--border-color))';
              }}
            >
              <span style={{ width: 6, height: 6, borderRadius: '50%', background: color, flexShrink: 0 }} />
              <span style={{ fontSize: '0.74rem', letterSpacing: '0.01em' }}>{label}</span>
              <span style={{
                fontSize: '0.62rem', 
                fontWeight: 800, 
                padding: '2px 7px', 
                borderRadius: 10, 
                minWidth: 18, 
                textAlign: 'center',
                background: active ? `${color}25` : 'hsl(var(--border-color) / 50%)',
                color: active ? color : 'hsl(var(--text-muted))',
              }}>{count}</span>
            </button>
          );
        })}
      </div>

      {/* Main Order List Section */}
      {loading ? (
        <PremiumLoader text="Retrieving dental orders..." />
      ) : filtered.length === 0 ? (
        <EmptyStateCard 
          icon={Package} 
          title="No Orders Found" 
          message={searchQuery ? `No orders match "${searchQuery}". Try editing the keyword.` : `No orders in status tab "${tab}".`} 
        />
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {filtered.map(order => {
            const cfg = STATUS_CFG[order.status] || STATUS_CFG.pending;
            const doctor = profiles[order.doctor_id];
            const isUpdating = updating === order.id;
            const isExpanded = expanded === order.id;
            const tracking = parseTracking(order.notes);

            // Stepper progress index
            const steps = ['pending', 'confirmed', 'dispatched', 'delivered'];
            const currentIdx = steps.indexOf(order.status);

            return (
              <div 
                key={order.id} 
                className="glass-card" 
                style={{ 
                  margin: 0, 
                  padding: 0, 
                  borderLeft: `4.5px solid ${cfg.color}`, 
                  overflow: 'hidden', 
                  boxShadow: '0 4px 20px rgba(15,23,42,0.02)',
                  transition: 'all 0.25s cubic-bezier(0.4, 0, 0.2, 1)'
                }}
              >
                <div style={{ padding: '16px 20px' }}>
                  
                  {/* Card Header: Doctor Info & Status Badge */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                      <div style={{
                        width: 40,
                        height: 40,
                        borderRadius: '50%',
                        background: 'linear-gradient(135deg, hsl(var(--primary)) 0%, hsl(var(--secondary)) 100%)',
                        color: '#fff',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '0.82rem',
                        fontWeight: 900,
                        fontFamily: 'Outfit',
                        boxShadow: '0 4px 10px hsl(var(--primary-glow))'
                      }}>
                        {getInitials(doctor?.name)}
                      </div>
                      <div>
                        <div style={{ fontSize: '0.62rem', color: 'hsl(var(--text-dim))', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                          ID: #{order.id.slice(-8).toUpperCase()} · {new Date(order.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                        </div>
                        <div style={{ fontFamily: 'Outfit', fontWeight: 800, fontSize: '0.98rem', color: 'hsl(var(--text-primary))', marginTop: 1 }}>
                          {doctor?.name || 'Doctor Client'}
                        </div>
                        {doctor?.clinic_name && (
                          <div style={{ fontSize: '0.72rem', color: 'hsl(var(--text-muted))', display: 'flex', alignItems: 'center', gap: 4, marginTop: 1 }}>
                            <MapPin size={10} color="hsl(var(--text-dim))" />
                            {doctor.clinic_name}
                          </div>
                        )}
                      </div>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4 }}>
                      <span style={{ 
                        fontSize: '0.58rem', 
                        fontWeight: 800, 
                        color: cfg.color, 
                        background: cfg.bg, 
                        padding: '4px 10px', 
                        borderRadius: 8, 
                        textTransform: 'uppercase', 
                        letterSpacing: '0.06em', 
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 4
                      }}>
                        <span style={{ width: 5, height: 5, borderRadius: '50%', background: cfg.color, animation: order.status === 'pending' ? 'dotPulse 1.5s infinite' : 'none' }} />
                        {cfg.label}
                      </span>
                      {doctor?.phone && (
                        <a href={`tel:${doctor.phone}`} style={{ fontSize: '0.65rem', color: 'hsl(var(--text-muted))', display: 'flex', alignItems: 'center', gap: 3, textDecoration: 'none', fontWeight: 600 }}>
                          <Phone size={10} /> {doctor.phone}
                        </a>
                      )}
                    </div>
                  </div>

                  {/* Stepper tracking progress bar inside each card (Visual & Interactive!) */}
                  {order.status !== 'cancelled' && (
                    <div style={{ 
                      background: 'hsl(var(--bg-dark) / 50%)', 
                      borderRadius: 14, 
                      padding: '12px 14px', 
                      margin: '14px 0', 
                      border: '1px solid hsl(var(--border-color) / 40%)' 
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', position: 'relative' }}>
                        {/* Connecting Line */}
                        <div style={{ position: 'absolute', top: 10, left: '6%', right: '6%', height: 3, background: 'hsl(var(--border-color))', zIndex: 1 }} />
                        {currentIdx > 0 && (
                          <div style={{ 
                            position: 'absolute', 
                            top: 10, 
                            left: '6%', 
                            width: `${(currentIdx / 3) * 88}%`, 
                            height: 3, 
                            background: 'linear-gradient(90deg, #f59e0b, #6366f1)', 
                            zIndex: 2,
                            transition: 'width 0.3s ease'
                          }} />
                        )}

                        {steps.map((step, idx) => {
                          const active = idx <= currentIdx;
                          const isCurrent = idx === currentIdx;
                          const stepColor = STATUS_CFG[step]?.color || '#cbd5e1';
                          
                          // Determine if this step is clickable
                          const isClickable = idx === currentIdx + 1 || (idx < currentIdx && step !== 'pending');

                          return (
                            <div 
                              key={step} 
                              onClick={() => {
                                if (isUpdating) return;
                                if (idx === currentIdx + 1) {
                                  // Trigger next step
                                  if (step === 'dispatched') {
                                    setDispatchModal({ orderId: order.id, notes: order.notes || '' });
                                  } else {
                                    updateStatus(order.id, step);
                                  }
                                } else if (idx < currentIdx && idx >= 0) {
                                  // Allow moving backward (Admin power override)
                                  if (window.confirm(`Move order status back to "${STEP_LABELS[step]}"?`)) {
                                    updateStatus(order.id, step);
                                  }
                                }
                              }}
                              style={{ 
                                display: 'flex', 
                                flexDirection: 'column', 
                                alignItems: 'center', 
                                zIndex: 3, 
                                cursor: isClickable ? 'pointer' : 'default',
                                flex: 1
                              }}
                            >
                              <div style={{ 
                                width: 20, 
                                height: 20, 
                                borderRadius: '50%', 
                                background: isCurrent ? stepColor : active ? '#4f46e5' : 'hsl(var(--bg-card))', 
                                border: active ? 'none' : '2px solid hsl(var(--border-color))',
                                color: active ? '#fff' : 'hsl(var(--text-dim))',
                                display: 'flex', 
                                alignItems: 'center', 
                                justifyContent: 'center', 
                                fontSize: '0.6rem', 
                                fontWeight: 900, 
                                fontFamily: 'Outfit',
                                boxShadow: isCurrent ? `0 0 10px ${stepColor}80` : 'none',
                                transition: 'all 0.2s ease',
                              }}
                              onMouseEnter={(e) => {
                                if (isClickable) {
                                  e.currentTarget.style.transform = 'scale(1.2)';
                                  e.currentTarget.style.boxShadow = `0 0 8px ${stepColor}`;
                                }
                              }}
                              onMouseLeave={(e) => {
                                if (isClickable) {
                                  e.currentTarget.style.transform = 'scale(1)';
                                  e.currentTarget.style.boxShadow = isCurrent ? `0 0 10px ${stepColor}80` : 'none';
                                }
                              }}
                              >
                                {active ? '✓' : idx + 1}
                              </div>
                              <span style={{ 
                                fontSize: '0.56rem', 
                                fontWeight: active ? 800 : 500, 
                                color: active ? 'hsl(var(--text-primary))' : 'hsl(var(--text-dim))', 
                                marginTop: 5, 
                                fontFamily: 'Outfit',
                                textTransform: 'capitalize'
                              }}>
                                {STEP_LABELS[step]}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Tracking info if dispatched or delivered */}
                  {tracking && (
                    <div style={{ 
                      display: 'flex', 
                      alignItems: 'center', 
                      gap: 10, 
                      background: 'linear-gradient(135deg, hsl(var(--bg-dark)) 0%, hsl(var(--border-color)/15%) 100%)', 
                      borderRadius: 12, 
                      padding: '10px 14px', 
                      border: '1px dashed hsl(var(--border-color))', 
                      marginBottom: 12 
                    }}>
                      <Truck size={14} color="#6366f1" style={{ flexShrink: 0 }} />
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: '0.62rem', fontWeight: 800, color: 'hsl(var(--text-muted))', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                          Courier & Tracking
                        </div>
                        <div style={{ fontSize: '0.72rem', color: 'hsl(var(--text-primary))', fontWeight: 700, marginTop: 1, textOverflow: 'ellipsis', overflow: 'hidden' }}>
                          {tracking.courier} · <span style={{ color: '#6366f1', textDecoration: 'underline' }}>{tracking.tracking}</span>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Expandable Order Items list */}
                  {order.order_items?.length > 0 && (
                    <div style={{ marginBottom: 12 }}>
                      <button 
                        onClick={() => setExpanded(isExpanded ? null : order.id)} 
                        style={{ 
                          width: '100%', 
                          display: 'flex', 
                          alignItems: 'center', 
                          justifyContent: 'space-between', 
                          background: 'hsl(var(--bg-dark) / 40%)', 
                          border: '1px solid hsl(var(--border-color))', 
                          borderRadius: 10, 
                          padding: '8px 14px', 
                          cursor: 'pointer', 
                          fontFamily: 'Outfit',
                          transition: 'all 0.2s'
                        }}
                        onMouseEnter={(e) => e.currentTarget.style.background = 'hsl(var(--bg-dark) / 80%)'}
                        onMouseLeave={(e) => e.currentTarget.style.background = 'hsl(var(--bg-dark) / 40%)'}
                      >
                        <span style={{ fontSize: '0.72rem', fontWeight: 700, color: 'hsl(var(--text-muted))', display: 'flex', alignItems: 'center', gap: 6 }}>
                          <Package size={12} />
                          {order.order_items.length} product{order.order_items.length !== 1 ? 's' : ''} details
                        </span>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                          <span style={{ fontSize: '0.68rem', color: 'hsl(var(--primary))', fontWeight: 700 }}>
                            {isExpanded ? 'Hide' : 'Show'}
                          </span>
                          <ChevronDown size={13} color="hsl(var(--text-dim))" style={{ transform: isExpanded ? 'rotate(180deg)' : 'none', transition: 'transform 0.25s' }} />
                        </div>
                      </button>

                      {isExpanded && (
                        <div style={{ 
                          background: 'hsl(var(--bg-dark) / 15%)', 
                          borderRadius: '0 0 10px 10px', 
                          padding: '6px 14px 10px', 
                          marginTop: -2, 
                          border: '1px solid hsl(var(--border-color))', 
                          borderTop: 'none',
                          animation: 'animate-fade-in 0.25s ease-out'
                        }}>
                          {order.order_items.map((item, i) => (
                            <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.72rem', color: 'hsl(var(--text-muted))', padding: '8px 0', borderTop: i > 0 ? '1px solid hsl(var(--border-color) / 40%)' : 'none' }}>
                              <div style={{ display: 'flex', flexDirection: 'column' }}>
                                <span style={{ fontWeight: 700, color: 'hsl(var(--text-primary))' }}>{item.product?.name || 'Product Item'}</span>
                                <span style={{ fontSize: '0.62rem', color: 'hsl(var(--text-dim))', marginTop: 1 }}>
                                  Category: {item.product?.category || 'General'} · Qty: {item.qty}
                                </span>
                              </div>
                              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
                                <span style={{ fontWeight: 800, color: 'hsl(var(--text-primary))' }}>{formatCurrency(item.qty * item.unit_price)}</span>
                                <span style={{ fontSize: '0.6rem', color: 'hsl(var(--text-dim))' }}>
                                  {formatCurrency(item.unit_price)} each
                                </span>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Card Footer: Cost & Action Button */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 14, borderTop: '1px solid hsl(var(--border-color)/40%)', paddingTop: 12 }}>
                    <div>
                      <div style={{ fontSize: '0.62rem', color: 'hsl(var(--text-dim))', fontWeight: 700, textTransform: 'uppercase' }}>Total Amount</div>
                      <span style={{ fontFamily: 'Outfit', fontWeight: 900, fontSize: '1.2rem', color: 'hsl(var(--text-primary))' }}>
                        {formatCurrency(order.total || 0)}
                      </span>
                    </div>

                    {cfg.next && (
                      <button
                        onClick={() => {
                          if (cfg.next === 'dispatched') {
                            setDispatchModal({ orderId: order.id, notes: order.notes || '' });
                          } else {
                            updateStatus(order.id, cfg.next);
                          }
                        }}
                        disabled={isUpdating}
                        style={{ 
                          padding: '9px 18px', 
                          borderRadius: 12, 
                          border: 'none', 
                          background: cfg.gradient || '#0ea5e9', 
                          color: '#fff', 
                          fontSize: '0.74rem', 
                          fontWeight: 700, 
                          cursor: isUpdating ? 'not-allowed' : 'pointer', 
                          fontFamily: 'Outfit', 
                          opacity: isUpdating ? 0.7 : 1, 
                          boxShadow: `0 4px 12px ${cfg.color}35`, 
                          transition: 'all 0.2s ease',
                          display: 'flex',
                          alignItems: 'center',
                          gap: 6
                        }}
                        onMouseEnter={(e) => e.currentTarget.style.transform = 'translateY(-1.5px)'}
                        onMouseLeave={(e) => e.currentTarget.style.transform = 'translateY(0)'}
                      >
                        {isUpdating ? 'Updating...' : cfg.action}
                        <ChevronRight size={13} />
                      </button>
                    )}
                  </div>

                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Premium Glassmorphic Dispatch Tracking Modal */}
      {dispatchModal && (
        <div className="modal-overlay-container animate-fade-in" style={{ zIndex: 100000, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(15, 23, 42, 0.3)', backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)', position: 'fixed', inset: 0 }}>
          <div onClick={() => setDispatchModal(null)} style={{ position: 'absolute', inset: 0 }} />
          
          <div className="confirm-dialog-card" style={{ 
            background: 'rgba(255, 255, 255, 0.92)', 
            backdropFilter: 'blur(20px)',
            WebkitBackdropFilter: 'blur(20px)',
            border: '1px solid rgba(255, 255, 255, 0.7)', 
            padding: '24px 22px', 
            maxWidth: 380, 
            width: 'calc(100% - 32px)', 
            borderRadius: 24, 
            boxShadow: '0 20px 40px rgba(15,23,42,0.15)',
            position: 'relative',
            zIndex: 100001,
            animation: 'fadeInUp 0.3s cubic-bezier(0.16, 1, 0.3, 1)'
          }}>
            
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
              <div>
                <h3 style={{ fontFamily: 'Outfit', fontWeight: 900, fontSize: '1.15rem', color: 'hsl(var(--text-primary))', margin: 0 }}>
                  Dispatch Information
                </h3>
                <p style={{ fontSize: '0.7rem', color: 'hsl(var(--text-muted))', marginTop: 2 }}>
                  Add tracking details for the courier shipment
                </p>
              </div>
              <button onClick={() => setDispatchModal(null)} style={{ background: 'hsl(var(--border-color)/40%)', border: 'none', borderRadius: '50%', width: 22, height: 22, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 0 }}>
                <X size={12} color="hsl(var(--text-muted))" />
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 14, width: '100%', textAlign: 'left', marginBottom: 20 }}>
              <div>
                <label style={{ fontSize: '0.65rem', fontWeight: 800, color: 'hsl(var(--text-muted))', textTransform: 'uppercase', display: 'block', marginBottom: 5, letterSpacing: '0.03em' }}>
                  Courier Carrier *
                </label>
                <div style={{ position: 'relative' }}>
                  <Truck size={14} color="hsl(var(--text-dim))" style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)' }} />
                  <input 
                    type="text" 
                    id="courier-input"
                    placeholder="e.g. BlueDart, FedEx, DHL" 
                    className="form-input"
                    style={{ 
                      width: '100%', 
                      padding: '10px 12px 10px 34px', 
                      borderRadius: 10, 
                      fontSize: '0.8rem', 
                      border: '1px solid hsl(var(--border-color))',
                      background: '#fff',
                      fontFamily: 'Outfit',
                      outline: 'none'
                    }}
                  />
                </div>
              </div>
              
              <div>
                <label style={{ fontSize: '0.65rem', fontWeight: 800, color: 'hsl(var(--text-muted))', textTransform: 'uppercase', display: 'block', marginBottom: 5, letterSpacing: '0.03em' }}>
                  Tracking Reference ID / AWB *
                </label>
                <div style={{ position: 'relative' }}>
                  <Package size={14} color="hsl(var(--text-dim))" style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)' }} />
                  <input 
                    type="text" 
                    id="tracking-input"
                    placeholder="e.g. BD-8928839" 
                    className="form-input"
                    style={{ 
                      width: '100%', 
                      padding: '10px 12px 10px 34px', 
                      borderRadius: 10, 
                      fontSize: '0.8rem', 
                      border: '1px solid hsl(var(--border-color))',
                      background: '#fff',
                      fontFamily: 'Outfit',
                      outline: 'none'
                    }}
                  />
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', gap: 10, width: '100%' }}>
              <button 
                onClick={() => setDispatchModal(null)} 
                style={{ 
                  flex: 1, 
                  padding: '10px', 
                  fontSize: '0.78rem', 
                  fontWeight: 700, 
                  fontFamily: 'Outfit', 
                  background: 'transparent', 
                  border: '1px solid hsl(var(--border-color))', 
                  cursor: 'pointer', 
                  color: 'hsl(var(--text-primary))', 
                  borderRadius: 12,
                }}
                onMouseEnter={(e) => e.currentTarget.style.background = 'hsl(var(--bg-dark))'}
                onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
              >
                Cancel
              </button>
              
              <button 
                onClick={async () => {
                  const courier = document.getElementById('courier-input')?.value?.trim();
                  const tracking = document.getElementById('tracking-input')?.value?.trim();
                  if (!courier || !tracking) {
                    alert('Please enter both Courier Name and Tracking ID.');
                    return;
                  }
                  const trackingStr = `[TRACKING] Courier: ${courier} | Tracking: ${tracking}`;
                  const finalNotes = dispatchModal.notes ? `${trackingStr}\n${dispatchModal.notes}` : trackingStr;
                  
                  setUpdating(dispatchModal.orderId);
                  setDispatchModal(null);
                  await supabase.from('orders').update({ status: 'dispatched', notes: finalNotes }).eq('id', dispatchModal.orderId);
                  await fetchOrders();
                  setUpdating(null);
                }} 
                className="btn-primary"
                style={{ 
                  flex: 1, 
                  padding: '10px', 
                  fontSize: '0.78rem', 
                  fontWeight: 700, 
                  fontFamily: 'Outfit', 
                  background: 'linear-gradient(135deg, #0ea5e9, #6366f1)', 
                  border: 'none', 
                  color: '#fff', 
                  cursor: 'pointer', 
                  borderRadius: 12,
                  boxShadow: '0 4px 14px rgba(99, 102, 241, 0.3)'
                }}
              >
                Confirm Shipment
              </button>
            </div>

          </div>
        </div>
      )}
    </div>
  );
}
