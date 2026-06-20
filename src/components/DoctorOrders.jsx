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
  TrendingUp
} from 'lucide-react';
import EmptyStateCard from './EmptyStateCard';

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

export default function DoctorOrders({ authUser, onGoToCatalog }) {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState(null);

  const fetchOrders = async () => {
    setLoading(true);
    const { data } = await supabase
      .from('orders')
      .select('*, order_items(qty, unit_price, product:products(name, category))')
      .eq('doctor_id', authUser.user.id)
      .order('created_at', { ascending: false });
    setOrders(data || []);
    setLoading(false);
  };

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchOrders();
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '60vh', flexDirection: 'column', gap: 12 }}>
      <div style={{ width: 32, height: 32, borderRadius: '50%', border: '3px solid hsl(var(--border-color))', borderTopColor: 'hsl(var(--primary))', animation: 'spin 0.8s linear infinite' }} />
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
      <p style={{ fontSize: '0.78rem', color: 'hsl(var(--text-muted))', fontWeight: 600, fontFamily: 'Outfit' }}>Loading your orders...</p>
    </div>
  );

  return (
    <div style={{ paddingBottom: 24, maxWidth: '1000px', margin: '0 auto' }}>
      
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 }}>
        <div>
          <h2 style={{ fontFamily: 'Outfit', fontWeight: 900, fontSize: '1.3rem', color: 'hsl(var(--text-primary))', margin: '0 0 2px', letterSpacing: '-0.02em' }}>
            My Orders
          </h2>
          <p style={{ fontSize: '0.74rem', color: 'hsl(var(--text-muted))', fontWeight: 500 }}>
            Track details and delivery status of cases
          </p>
        </div>
        <button 
          onClick={fetchOrders} 
          style={{ 
            display: 'flex', 
            alignItems: 'center', 
            gap: 5, 
            padding: '7px 12px', 
            borderRadius: 10, 
            border: '1px solid hsl(var(--border-color))', 
            background: 'hsl(var(--bg-card))', 
            color: 'hsl(var(--text-muted))', 
            fontSize: '0.7rem', 
            fontWeight: 700, 
            cursor: 'pointer', 
            fontFamily: 'Outfit',
            transition: 'border-color 0.2s'
          }}
          onMouseEnter={(e) => e.currentTarget.style.borderColor = 'hsl(var(--primary) / 30%)'}
          onMouseLeave={(e) => e.currentTarget.style.borderColor = 'hsl(var(--border-color))'}
        >
          <RefreshCw size={12} className={loading ? 'animate-spin' : ''} /> Refresh
        </button>
      </div>

      {/* Spend and Orders Statistics Row */}
      {orders.length > 0 && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: 12, marginBottom: 20 }}>
          <div className="glass-card" style={{ padding: '14px 16px', margin: 0, display: 'flex', alignItems: 'center', gap: 12, borderLeft: '4px solid #f59e0b' }}>
            <div style={{ width: 34, height: 34, borderRadius: 10, background: 'rgba(245, 158, 11, 0.1)', color: '#f59e0b', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <Clock size={16} />
            </div>
            <div>
              <div style={{ fontSize: '0.62rem', fontWeight: 700, color: 'hsl(var(--text-muted))', textTransform: 'uppercase', letterSpacing: '0.04em' }}>In Progress</div>
              <div style={{ fontSize: '1.15rem', fontWeight: 900, color: 'hsl(var(--text-primary))', fontFamily: 'Outfit', marginTop: 2 }}>{activeOrders}</div>
            </div>
          </div>

          <div className="glass-card" style={{ padding: '14px 16px', margin: 0, display: 'flex', alignItems: 'center', gap: 12, borderLeft: '4px solid #10b981' }}>
            <div style={{ width: 34, height: 34, borderRadius: 10, background: 'rgba(16, 185, 129, 0.1)', color: '#10b981', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <CheckCircle2 size={16} />
            </div>
            <div>
              <div style={{ fontSize: '0.62rem', fontWeight: 700, color: 'hsl(var(--text-muted))', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Delivered</div>
              <div style={{ fontSize: '1.15rem', fontWeight: 900, color: 'hsl(var(--text-primary))', fontFamily: 'Outfit', marginTop: 2 }}>{completedOrders}</div>
            </div>
          </div>

          <div className="glass-card" style={{ padding: '14px 16px', margin: 0, display: 'flex', alignItems: 'center', gap: 12, borderLeft: '4px solid #0ea5e9' }}>
            <div style={{ width: 34, height: 34, borderRadius: 10, background: 'rgba(14, 165, 233, 0.1)', color: '#0ea5e9', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <TrendingUp size={16} />
            </div>
            <div style={{ minWidth: 0 }}>
              <div style={{ fontSize: '0.62rem', fontWeight: 700, color: 'hsl(var(--text-muted))', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Total Spend</div>
              <div style={{ fontSize: '1.15rem', fontWeight: 900, color: 'hsl(var(--text-primary))', fontFamily: 'Outfit', marginTop: 2, textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>
                {formatCurrency(totalSpent)}
              </div>
            </div>
          </div>
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
          <div style={{ textAlign: 'center', marginTop: 16 }}>
            <button 
              onClick={onGoToCatalog} 
              className="btn-primary"
              style={{ 
                padding: '11px 24px', 
                borderRadius: 14, 
                fontSize: '0.8rem', 
                fontWeight: 700, 
                fontFamily: 'Outfit',
                boxShadow: '0 6px 20px rgba(14, 165, 233, 0.25)'
              }}
            >
              Browse Products Catalog
            </button>
          </div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {orders.map(order => {
            const cfg = STATUS_CFG[order.status] || STATUS_CFG.pending;
            const tracking = parseTracking(order.notes);
            const currentStepIndex = STATUS_STEPS.indexOf(order.status);
            const isExpanded = expanded === order.id;

            return (
              <div 
                key={order.id} 
                className="glass-card" 
                style={{ 
                  margin: 0, 
                  padding: '16px 20px', 
                  borderLeft: `4px solid ${cfg.color}`,
                  boxShadow: '0 4px 18px rgba(15,23,42,0.015)',
                  transition: 'all 0.25s cubic-bezier(0.4, 0, 0.2, 1)'
                }}
              >
                
                {/* Card Header: Order Reference & Status Pill */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
                  <div>
                    <div style={{ fontSize: '0.62rem', color: 'hsl(var(--text-dim))', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                      ORDER #{order.id.slice(-8).toUpperCase()}
                    </div>
                    <div style={{ fontSize: '0.72rem', color: 'hsl(var(--text-muted))', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 4, marginTop: 1 }}>
                      <Calendar size={11} color="hsl(var(--text-dim))" />
                      {new Date(order.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                    </div>
                  </div>
                  
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

                {/* Progress Visual Stepper */}
                {order.status !== 'cancelled' && (
                  <div style={{ 
                    background: 'hsl(var(--bg-dark) / 50%)', 
                    borderRadius: 12, 
                    padding: '12px 14px', 
                    margin: '14px 0', 
                    border: '1px solid hsl(var(--border-color) / 40%)' 
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', position: 'relative' }}>
                      {/* Connecting Line */}
                      <div style={{ position: 'absolute', top: 10, left: '6%', right: '6%', height: 2, background: 'hsl(var(--border-color))', zIndex: 1 }} />
                      {currentStepIndex > 0 && (
                        <div style={{ 
                          position: 'absolute', 
                          top: 10, 
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
                              width: 20, 
                              height: 20, 
                              borderRadius: '50%', 
                              background: isCurrent ? stepColor : active ? '#0ea5e9' : 'hsl(var(--bg-card))', 
                              border: active ? 'none' : '2px solid hsl(var(--border-color))',
                              color: active ? '#fff' : 'hsl(var(--text-dim))',
                              display: 'flex', 
                              alignItems: 'center', 
                              justifyContent: 'center', 
                              fontSize: '0.6rem', 
                              fontWeight: 900, 
                              fontFamily: 'Outfit',
                              boxShadow: isCurrent ? `0 0 10px ${stepColor}80` : 'none',
                              transition: 'all 0.2s ease'
                            }}>
                              {active ? '✓' : idx + 1}
                            </div>
                            <span style={{ 
                              fontSize: '0.56rem', 
                              fontWeight: active ? 800 : 500, 
                              color: active ? 'hsl(var(--text-primary))' : 'hsl(var(--text-dim))', 
                              marginTop: 5, 
                              fontFamily: 'Outfit' 
                            }}>
                              {STEP_LABELS[idx]}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Dispatch Details Tag */}
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
                        Shipment Status
                      </div>
                      <div style={{ fontSize: '0.72rem', color: 'hsl(var(--text-primary))', fontWeight: 700, marginTop: 1 }}>
                        {tracking.courier} · <span style={{ color: '#6366f1' }}>{tracking.tracking}</span>
                      </div>
                    </div>
                  </div>
                )}

                {/* Order Items Breakdown */}
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
                        transition: 'background 0.2s'
                      }}
                      onMouseEnter={(e) => e.currentTarget.style.background = 'hsl(var(--bg-dark) / 80%)'}
                      onMouseLeave={(e) => e.currentTarget.style.background = 'hsl(var(--bg-dark) / 40%)'}
                    >
                      <span style={{ fontSize: '0.72rem', fontWeight: 700, color: 'hsl(var(--text-muted))', display: 'flex', alignItems: 'center', gap: 6 }}>
                        <Package size={12} />
                        {order.order_items.length} item{order.order_items.length !== 1 ? 's' : ''} ordered
                      </span>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                        <span style={{ fontSize: '0.68rem', color: 'hsl(var(--primary))', fontWeight: 700 }}>
                          {isExpanded ? 'Hide Details' : 'View Details'}
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
                              <span style={{ fontWeight: 700, color: 'hsl(var(--text-primary))' }}>{item.product?.name || 'Product'}</span>
                              <span style={{ fontSize: '0.62rem', color: 'hsl(var(--text-dim))', marginTop: 1 }}>
                                Qty: {item.qty} · Category: {item.product?.category || 'General'}
                              </span>
                            </div>
                            <span style={{ fontWeight: 800, color: 'hsl(var(--text-primary))' }}>{formatCurrency(item.qty * item.unit_price)}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* Card Cost Footer */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 14, borderTop: '1px solid hsl(var(--border-color)/40%)', paddingTop: 12 }}>
                  <span style={{ fontSize: '0.68rem', color: 'hsl(var(--text-muted))', fontWeight: 600 }}>
                    Order Total
                  </span>
                  <span style={{ fontFamily: 'Outfit', fontWeight: 900, fontSize: '1.15rem', color: 'hsl(var(--text-primary))' }}>
                    {formatCurrency(order.total || 0)}
                  </span>
                </div>

              </div>
            );
          })}
        </div>
      )}

    </div>
  );
}
