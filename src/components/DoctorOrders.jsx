import { useState, useEffect } from 'react';
import { supabase } from '../utils/supabase';
import { 
  Package, 
  RefreshCw, 
  Truck, 
  ChevronDown, 
  Clock, 
  CheckCircle2, 
  Calendar,
  TrendingUp,
  CreditCard,
  Check
} from 'lucide-react';
import EmptyStateCard from './EmptyStateCard';
import PremiumLoader from './ui/PremiumLoader';

const STATUS_CFG = {
  pending:    { color: '#f59e0b', bg: 'rgba(245,158,11,0.08)',  label: 'Pending' },
  confirmed:  { color: '#0ea5e9', bg: 'rgba(14,165,233,0.08)', label: 'Confirmed' },
  dispatched: { color: '#6366f1', bg: 'rgba(99,102,241,0.08)', label: 'Dispatched' },
  delivered:  { color: '#10b981', bg: 'rgba(16,185,129,0.08)', label: 'Delivered' },
  cancelled:  { color: '#ef4444', bg: 'rgba(239,68,68,0.08)',  label: 'Cancelled' },
};

const STATUS_STEPS = ['pending', 'confirmed', 'dispatched', 'delivered'];
const STEP_LABELS = ['Placed', 'Confirmed', 'Shipped', 'Delivered'];

function parseTracking(notes) {
  if (!notes) return null;
  const match = notes.match(/\[TRACKING\]\s*Courier:\s*([^\s|]+[^|]*)\s*\|\s*Tracking:\s*([^\s\n]+)/i);
  if (match) {
    return { courier: match[1].trim(), tracking: match[2].trim() };
  }
  return null;
}

// ── SUB-COMPONENT: STAT CARD ──
function StatCard({ title, value, icon, color }) {
  const [hovered, setHovered] = useState(false);
  return (
    <div 
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        background: 'hsl(var(--bg-card))',
        borderRadius: '20px',
        padding: '18px 22px',
        display: 'flex',
        alignItems: 'center',
        gap: '16px',
        border: '1.5px solid hsl(var(--border-color))',
        boxShadow: hovered 
          ? `0 16px 36px rgba(15,23,42,0.08), 0 4px 14px ${color}18`
          : '0 4px 20px rgba(15,23,42,0.02)',
        transform: hovered ? 'translateY(-2px)' : 'translateY(0)',
        transition: 'all 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
        cursor: 'pointer'
      }}
    >
      <div style={{ 
        width: 44, 
        height: 44, 
        borderRadius: 14, 
        background: hovered ? `linear-gradient(135deg, ${color}20, ${color}35)` : `${color}08`, 
        color: color, 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center', 
        flexShrink: 0,
        boxShadow: hovered ? `0 6px 16px ${color}25` : 'none',
        transition: 'all 0.3s'
      }}>
        {icon}
      </div>
      <div>
        <div style={{ fontSize: '0.62rem', fontWeight: 800, color: 'hsl(var(--text-muted))', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{title}</div>
        <div style={{ fontSize: '1.35rem', fontWeight: 900, color: 'hsl(var(--text-primary))', fontFamily: 'Outfit', marginTop: 2 }}>{value}</div>
      </div>
    </div>
  );
}

// ── SUB-COMPONENT: ORDER CARD ──
function OrderCard({ order, formatCurrency }) {
  const [hovered, setHovered] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);

  const cfg = STATUS_CFG[order.status] || STATUS_CFG.pending;
  const tracking = parseTracking(order.notes);
  const currentStepIndex = STATUS_STEPS.indexOf(order.status);

  // Check for Razorpay transaction details
  const isPaid = order.notes?.includes('Paid via Razorpay') || order.notes?.includes('pay_');
  const rzpId = order.notes?.match(/Transaction ID:\s*([^\s\n\(\)]+)/i)?.[1] || order.notes?.match(/(pay_[a-zA-Z0-9]+)/)?.[1];

  // Clean up display notes (strip payment transaction text)
  let displayNotes = order.notes || '';
  if (isPaid && rzpId) {
    displayNotes = displayNotes.replace(`Paid via Razorpay. Transaction ID: ${rzpId}`, '').trim();
    displayNotes = displayNotes.replace(`Paid via Razorpay. Transaction ID:  ${rzpId}`, '').trim();
    displayNotes = displayNotes.replace(/^[|,\s\-\.\:]+/, '').trim();
  }

  return (
    <div 
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{ 
        background: 'hsl(var(--bg-card))',
        borderRadius: 22, 
        padding: '20px 24px', 
        border: '1.5px solid hsl(var(--border-color))',
        borderLeft: `5px solid ${cfg.color}`,
        boxShadow: hovered 
          ? `0 16px 36px rgba(15,23,42,0.06), 0 4px 14px ${cfg.color}08`
          : '0 4px 20px rgba(15,23,42,0.015)',
        transform: hovered ? 'translateY(-1px)' : 'translateY(0)',
        transition: 'all 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
      }}
    >
      
      {/* Card Header: Reference & Badges */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
        <div>
          <div style={{ fontSize: '0.62rem', color: 'hsl(var(--text-dim))', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
            ORDER #{order.id.slice(-8).toUpperCase()}
          </div>
          <div style={{ fontSize: '0.74rem', color: 'hsl(var(--text-muted))', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 4, marginTop: 2 }}>
            <Calendar size={12} color="hsl(var(--text-dim))" />
            {new Date(order.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
          </div>
        </div>
        
        <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
          {isPaid && (
            <span style={{ 
              fontSize: '0.58rem', 
              fontWeight: 800, 
              color: '#10b981', 
              background: 'rgba(16,185,129,0.08)', 
              padding: '4px 10px', 
              borderRadius: 8, 
              textTransform: 'uppercase', 
              letterSpacing: '0.06em', 
              display: 'inline-flex',
              alignItems: 'center',
              gap: 4
            }} title={rzpId ? `Transaction ID: ${rzpId}` : ''}>
              <CreditCard size={10} />
              Paid
            </span>
          )}
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
        </div>
      </div>

      {/* Progress Visual Stepper */}
      {order.status !== 'cancelled' && (
        <div style={{ 
          background: 'rgba(15, 23, 42, 0.02)', 
          borderRadius: 16, 
          padding: '14px 16px', 
          margin: '18px 0', 
          border: '1.5px solid hsl(var(--border-color) / 45%)' 
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', position: 'relative' }}>
            {/* Connecting Line */}
            <div style={{ position: 'absolute', top: 12, left: '6%', right: '6%', height: 2, background: 'hsl(var(--border-color))', zIndex: 1 }} />
            {currentStepIndex > 0 && (
              <div style={{ 
                position: 'absolute', 
                top: 12, 
                left: '6%', 
                width: `${(currentStepIndex / 3) * 88}%`, 
                height: 2, 
                background: 'linear-gradient(90deg, #0ea5e9, #6366f1)', 
                zIndex: 2,
                transition: 'width 0.3s ease'
              }} />
            )}

            {STATUS_STEPS.map((step, idx) => {
              const active = idx <= currentStepIndex;
              const isCurrent = idx === currentStepIndex;
              const stepColor = STATUS_CFG[step]?.color || '#cbd5e1';
              
              return (
                <div key={step} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', zIndex: 3, flex: 1 }}>
                  <div style={{ 
                    width: 24, 
                    height: 24, 
                    borderRadius: '50%', 
                    background: isCurrent ? stepColor : active ? 'linear-gradient(135deg, #0ea5e9, #6366f1)' : 'hsl(var(--bg-card))', 
                    border: active ? 'none' : '2px solid hsl(var(--border-color))',
                    color: active ? '#fff' : 'hsl(var(--text-dim))',
                    display: 'flex', 
                    alignItems: 'center', 
                    justifyContent: 'center', 
                    boxShadow: isCurrent ? `0 0 12px ${stepColor}80` : active ? '0 4px 10px rgba(14,165,233,0.2)' : 'none',
                    transition: 'all 0.25s ease',
                    position: 'relative'
                  }}>
                    {active ? (
                      <Check size={12} strokeWidth={3} />
                    ) : (
                      <span style={{ fontSize: '0.68rem', fontWeight: 800 }}>{idx + 1}</span>
                    )}
                  </div>
                  <span style={{ 
                    fontSize: '0.6rem', 
                    fontWeight: active ? 800 : 600, 
                    color: active ? 'hsl(var(--text-primary))' : 'hsl(var(--text-dim))', 
                    marginTop: 6, 
                    fontFamily: 'Outfit',
                    textAlign: 'center'
                  }}>
                    {STEP_LABELS[idx]}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Dispatch/Tracking Details */}
      {tracking && (
        <div style={{ 
          display: 'flex', 
          alignItems: 'center', 
          gap: 12, 
          background: 'linear-gradient(135deg, hsl(var(--bg-dark)) 0%, hsl(var(--border-color)/15%) 100%)', 
          borderRadius: 14, 
          padding: '12px 16px', 
          border: '1.5px dashed hsl(var(--border-color))', 
          marginBottom: 14 
        }}>
          <div style={{ width: 32, height: 32, borderRadius: 10, background: 'rgba(99, 102, 241, 0.1)', color: '#6366f1', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <Truck size={15} />
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: '0.62rem', fontWeight: 800, color: 'hsl(var(--text-muted))', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Shipment Tracking
            </div>
            <div style={{ fontSize: '0.76rem', color: 'hsl(var(--text-primary))', fontWeight: 700, marginTop: 1 }}>
              {tracking.courier} · <span style={{ color: '#6366f1', fontFamily: 'monospace' }}>{tracking.tracking}</span>
            </div>
          </div>
        </div>
      )}

      {/* Order Items Breakdown */}
      {order.order_items?.length > 0 && (
        <div style={{ marginBottom: 14 }}>
          <button 
            onClick={() => setIsExpanded(!isExpanded)} 
            style={{ 
              width: '100%', 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'space-between', 
              background: 'rgba(15, 23, 42, 0.02)', 
              border: '1.5px solid hsl(var(--border-color))', 
              borderRadius: 12, 
              padding: '10px 16px', 
              cursor: 'pointer', 
              fontFamily: 'Outfit',
              transition: 'background 0.2s'
            }}
            onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(15, 23, 42, 0.05)'}
            onMouseLeave={(e) => e.currentTarget.style.background = 'rgba(15, 23, 42, 0.02)'}
          >
            <span style={{ fontSize: '0.74rem', fontWeight: 800, color: 'hsl(var(--text-muted))', display: 'flex', alignItems: 'center', gap: 6 }}>
              <Package size={14} color="hsl(var(--text-dim))" />
              {order.order_items.length} item{order.order_items.length !== 1 ? 's' : ''} ordered
            </span>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginLeft: 16 }}>
              <span style={{ fontSize: '0.72rem', color: 'hsl(var(--primary))', fontWeight: 800, letterSpacing: '0.01em' }}>
                {isExpanded ? 'Hide Details' : 'View Details'}
              </span>
              <ChevronDown size={14} color="hsl(var(--text-dim))" style={{ transform: isExpanded ? 'rotate(180deg)' : 'none', transition: 'transform 0.25s' }} />
            </div>
          </button>

          {isExpanded && (
            <div style={{ 
              background: 'rgba(0, 0, 0, 0.01)', 
              borderRadius: '0 0 12px 12px', 
              padding: '8px 16px 12px', 
              marginTop: -2, 
              border: '1.5px solid hsl(var(--border-color))', 
              borderTop: 'none',
              animation: 'animate-fade-in 0.25s ease-out'
            }}>
              {order.order_items.map((item, i) => (
                <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.74rem', color: 'hsl(var(--text-muted))', padding: '10px 0', borderTop: i > 0 ? '1px solid hsl(var(--border-color) / 40%)' : 'none' }}>
                  <div style={{ display: 'flex', flexDirection: 'column' }}>
                    <span style={{ fontWeight: 800, color: 'hsl(var(--text-primary))' }}>{item.product?.name || 'Product'}</span>
                    <span style={{ fontSize: '0.64rem', color: 'hsl(var(--text-dim))', marginTop: 2 }}>
                      Qty: {item.qty} · Category: {item.product?.category || 'General'}
                    </span>
                  </div>
                  <span style={{ fontWeight: 900, color: 'hsl(var(--text-primary))', fontFamily: 'Outfit' }}>{formatCurrency(item.qty * item.unit_price)}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Card Cost & Notes Footer */}
      <div style={{ borderTop: '1px solid hsl(var(--border-color)/40%)', paddingTop: 14 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontSize: '0.7rem', color: 'hsl(var(--text-muted))', fontWeight: 700 }}>
            Order Total
          </span>
          <span style={{ fontFamily: 'Outfit', fontWeight: 900, fontSize: '1.25rem', color: '#0ea5e9' }}>
            {formatCurrency(order.total || 0)}
          </span>
        </div>

        {displayNotes && (
          <div style={{ 
            marginTop: 10, 
            padding: '10px 14px', 
            background: 'rgba(15, 23, 42, 0.02)', 
            borderRadius: 10, 
            fontSize: '0.72rem', 
            color: 'hsl(var(--text-muted))',
            fontStyle: 'italic',
            borderLeft: '2.5px solid hsl(var(--border-color))',
            lineHeight: 1.45
          }}>
            " {displayNotes} "
          </div>
        )}
      </div>

    </div>
  );
}

// ── MAIN EXPORT COMPONENT ──
export default function DoctorOrders({ authUser, onGoToCatalog }) {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchOrders = async () => {
    setLoading(true);
    try {
      const { data } = await supabase
        .from('orders')
        .select('*, order_items(qty, unit_price, product:products(name, category))')
        .eq('doctor_id', authUser.user.id)
        .order('created_at', { ascending: false });
      setOrders(data || []);
    } catch (e) {
      console.error('Failed to fetch doctor orders:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders();
  }, []);

  const formatCurrency = (val) => {
    return '₹' + val.toLocaleString('en-IN');
  };

  // Calculations for doctor dashboard
  const activeOrders = orders.filter(o => ['pending', 'confirmed', 'dispatched'].includes(o.status)).length;
  const completedOrders = orders.filter(o => o.status === 'delivered').length;
  const totalSpent = orders
    .filter(o => o.status !== 'cancelled')
    .reduce((sum, o) => sum + (o.total || 0), 0);

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '60vh' }}>
      <PremiumLoader text="Loading your orders..." />
    </div>
  );

  return (
    <div style={{ paddingBottom: 60, maxWidth: '1000px', margin: '0 auto' }}>
      
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24 }}>
        <div>
          <h2 style={{ fontFamily: 'Outfit', fontWeight: 900, fontSize: '1.45rem', color: 'hsl(var(--text-primary))', margin: '0 0 4px', letterSpacing: '-0.02em' }}>
            My Orders
          </h2>
          <p style={{ fontSize: '0.76rem', color: 'hsl(var(--text-muted))', fontWeight: 500 }}>
            Track details and delivery status of cases
          </p>
        </div>
        <button 
          onClick={fetchOrders} 
          style={{ 
            display: 'flex', 
            alignItems: 'center', 
            gap: 5, 
            padding: '8px 14px', 
            borderRadius: 12, 
            border: '1.5px solid hsl(var(--border-color))', 
            background: 'hsl(var(--bg-card))', 
            color: 'hsl(var(--text-muted))', 
            fontSize: '0.72rem', 
            fontWeight: 800, 
            cursor: 'pointer', 
            fontFamily: 'Outfit',
            transition: 'all 0.2s',
            boxShadow: '0 2px 8px rgba(0,0,0,0.02)'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.borderColor = '#0ea5e9';
            e.currentTarget.style.color = '#0ea5e9';
            e.currentTarget.style.boxShadow = '0 4px 12px rgba(14,165,233,0.1)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.borderColor = 'hsl(var(--border-color))';
            e.currentTarget.style.color = 'hsl(var(--text-muted))';
            e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.02)';
          }}
        >
          <RefreshCw size={13} /> Refresh
        </button>
      </div>

      {/* Spend and Orders Statistics Row */}
      {orders.length > 0 && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 14, marginBottom: 28 }}>
          <StatCard 
            title="In Progress" 
            value={activeOrders} 
            icon={<Clock size={18} />} 
            color="#f59e0b" 
          />
          <StatCard 
            title="Delivered" 
            value={completedOrders} 
            icon={<CheckCircle2 size={18} />} 
            color="#10b981" 
          />
          <StatCard 
            title="Total Spend" 
            value={formatCurrency(totalSpent)} 
            icon={<TrendingUp size={18} />} 
            color="#0ea5e9" 
          />
        </div>
      )}

      {/* Orders List / Empty State */}
      {orders.length === 0 ? (
        <div style={{ padding: '24px 0' }}>
          <EmptyStateCard 
            icon={Package} 
            title="No orders yet" 
            message="Browse our premium products in the catalog to place your first order and track its progress here."
          />
          <div style={{ textAlign: 'center', marginTop: 20 }}>
            <button 
              onClick={onGoToCatalog} 
              style={{ 
                padding: '12px 28px', 
                borderRadius: 14, 
                fontSize: '0.82rem', 
                fontWeight: 800, 
                fontFamily: 'Outfit',
                background: 'linear-gradient(135deg, #0ea5e9, #6366f1)',
                color: '#fff',
                border: 'none',
                cursor: 'pointer',
                boxShadow: '0 6px 20px rgba(14, 165, 233, 0.35)',
                transition: 'all 0.2s'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'translateY(-1px)';
                e.currentTarget.style.boxShadow = '0 8px 24px rgba(14, 165, 233, 0.45)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'none';
                e.currentTarget.style.boxShadow = '0 6px 20px rgba(14, 165, 233, 0.35)';
              }}
            >
              Browse Products Catalog
            </button>
          </div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {orders.map(order => (
            <OrderCard 
              key={order.id} 
              order={order} 
              formatCurrency={formatCurrency} 
            />
          ))}
        </div>
      )}

    </div>
  );
}
