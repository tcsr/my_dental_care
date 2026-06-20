import { useState, useEffect } from 'react';
import { supabase } from '../utils/supabase';
import {
  TrendingUp, Users, AlertTriangle,
  Clock, Truck, Package
} from 'lucide-react';

export default function DashboardScreen({ authUser, onNavigate }) {
  const [stats, setStats] = useState(null);
  const [recentOrders, setRecentOrders] = useState([]);
  const [lowStock, setLowStock] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchData = async () => {
    setLoading(true);
    const [ordersRes, productsRes, profilesRes] = await Promise.all([
      supabase.from('orders').select('*, order_items(qty, unit_price, product_id, products(name))').order('created_at', { ascending: false }),
      supabase.from('products').select('*').eq('active', true),
      supabase.from('profiles').select('id, approved').neq('role', 'admin'),
    ]);

    const orders = ordersRes.data || [];
    const products = productsRes.data || [];
    const profiles = profilesRes.data || [];

    const totalRevenue = orders
      .filter(o => o.status === 'delivered')
      .reduce((sum, o) => sum + (o.total || 0), 0);

    const pendingOrders = orders.filter(o => o.status === 'pending').length;
    const dispatchedOrders = orders.filter(o => o.status === 'dispatched').length;
    const totalOrders = orders.length;
    const approvedDoctors = profiles.filter(p => p.approved).length;
    const pendingDoctors = profiles.filter(p => !p.approved).length;
    const totalProducts = products.length;

    // Last 7 days daily revenue calculation
    const last7Days = Array.from({ length: 7 }, (_, i) => {
      const d = new Date();
      d.setDate(d.getDate() - i);
      return d.toISOString().split('T')[0];
    }).reverse();

    const dailyRevenue = last7Days.map(date => {
      const dayOrders = orders.filter(o => o.created_at && o.created_at.startsWith(date));
      const revenue = dayOrders.reduce((sum, o) => sum + (o.total || 0), 0);
      return {
        date: new Date(date).toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric' }),
        revenue
      };
    });

    // Top selling products aggregation
    const salesMap = {};
    orders.forEach(o => {
      if (o.status !== 'cancelled' && o.order_items) {
        o.order_items.forEach(item => {
          const name = item.products?.name || 'Unknown Product';
          salesMap[name] = (salesMap[name] || 0) + (item.qty || 0);
        });
      }
    });
    const topProducts = Object.entries(salesMap)
      .map(([name, qty]) => ({ name, qty }))
      .sort((a, b) => b.qty - a.qty)
      .slice(0, 4);

    const low = products.filter(p => p.stock_qty <= 5);

    setStats({
      totalRevenue,
      pendingOrders,
      dispatchedOrders,
      totalOrders,
      approvedDoctors,
      pendingDoctors,
      totalProducts,
      dailyRevenue,
      topProducts
    });
    setRecentOrders(orders.slice(0, 5));
    setLowStock(low);
    setLoading(false);
  };

  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { fetchData(); }, []);

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '60vh', flexDirection: 'column', gap: 12 }}>
        <div style={{ width: 32, height: 32, borderRadius: '50%', border: '3px solid hsl(var(--border-color))', borderTopColor: '#0ea5e9', animation: 'spin 0.8s linear infinite' }} />
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        <p style={{ fontSize: '0.78rem', color: 'hsl(var(--text-muted))' }}>Loading dashboard...</p>
      </div>
    );
  }

  const fmt = (n) => n >= 100000
    ? `₹${(n / 100000).toFixed(1)}L`
    : n >= 1000 ? `₹${(n / 1000).toFixed(1)}K` : `₹${n}`;

  // Custom SVG line chart drawing
  const drawLineChart = (data) => {
    if (!data || data.length === 0) return null;
    const width = 450;
    const height = 180;
    const paddingLeft = 45;
    const paddingRight = 15;
    const paddingTop = 25;
    const paddingBottom = 30;

    const maxVal = Math.max(...data.map(d => d.revenue), 1000);
    const chartWidth = width - paddingLeft - paddingRight;
    const chartHeight = height - paddingTop - paddingBottom;

    // Generate points
    const points = data.map((d, i) => {
      const x = paddingLeft + (i / (data.length - 1)) * chartWidth;
      const y = paddingTop + chartHeight - (d.revenue / maxVal) * chartHeight;
      return { x, y, revenue: d.revenue, label: d.date };
    });

    const polylinePoints = points.map(p => `${p.x},${p.y}`).join(' ');

    const firstPoint = points[0];
    const lastPoint = points[points.length - 1];
    const fillPoints = `${firstPoint.x},${paddingTop + chartHeight} ${polylinePoints} ${lastPoint.x},${paddingTop + chartHeight}`;

    return (
      <div className="glass-card" style={{ padding: '16px 18px', margin: 0 }}>
        <h4 style={{ fontFamily: 'Outfit', fontWeight: 800, fontSize: '0.82rem', color: 'hsl(var(--text-primary))', margin: '0 0 14px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
          📈 7-Day Sales Trend (₹)
        </h4>
        <div style={{ position: 'relative', width: '100%' }}>
          <svg width="100%" height={height} viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="xMidYMid meet">
            <defs>
              <linearGradient id="areaGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity="0.25" />
                <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity="0.00" />
              </linearGradient>
            </defs>

            {/* Grid lines */}
            <line x1={paddingLeft} y1={paddingTop} x2={width - paddingRight} y2={paddingTop} stroke="hsl(var(--border-color) / 40%)" strokeDasharray="3,3" />
            <line x1={paddingLeft} y1={paddingTop + chartHeight / 2} x2={width - paddingRight} y2={paddingTop + chartHeight / 2} stroke="hsl(var(--border-color) / 40%)" strokeDasharray="3,3" />
            <line x1={paddingLeft} y1={paddingTop + chartHeight} x2={width - paddingRight} y2={paddingTop + chartHeight} stroke="hsl(var(--border-color))" strokeWidth="1.5" />

            {/* Fill Area */}
            <polygon points={fillPoints} fill="url(#areaGrad)" />

            {/* Line */}
            <polyline points={polylinePoints} fill="none" stroke="hsl(var(--primary))" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />

            {/* Dots and Labels */}
            {points.map((p, i) => (
              <g key={i}>
                <circle
                  cx={p.x}
                  cy={p.y}
                  r="4.5"
                  fill="#ffffff"
                  stroke="hsl(var(--primary))"
                  strokeWidth="2.5"
                  style={{ cursor: 'pointer' }}
                />
                {p.revenue > 0 && (
                  <text
                    x={p.x}
                    y={p.y - 10}
                    textAnchor="middle"
                    style={{ fontSize: '0.58rem', fontWeight: 800, fill: 'hsl(var(--text-primary))', fontFamily: 'Outfit' }}
                  >
                    ₹{p.revenue >= 1000 ? `${(p.revenue / 1000).toFixed(1)}k` : p.revenue}
                  </text>
                )}
                <text
                  x={p.x}
                  y={paddingTop + chartHeight + 18}
                  textAnchor="middle"
                  style={{ fontSize: '0.58rem', fontWeight: 700, fill: 'hsl(var(--text-muted))', fontFamily: 'Inter' }}
                >
                  {p.label}
                </text>
              </g>
            ))}
          </svg>
        </div>
      </div>
    );
  };

  // Custom horizontal progress/bar chart for top products
  const drawTopProductsChart = (data) => {
    if (!data || data.length === 0) return null;
    const maxQty = Math.max(...data.map(d => d.qty), 1);

    return (
      <div className="glass-card" style={{ padding: '16px 18px', margin: 0 }}>
        <h4 style={{ fontFamily: 'Outfit', fontWeight: 800, fontSize: '0.82rem', color: 'hsl(var(--text-primary))', margin: '0 0 14px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
          🔥 Top Selling Products
        </h4>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {data.map((item, idx) => {
            const percentage = (item.qty / maxQty) * 100;
            const colors = ['#6366f1', '#0ea5e9', '#10b981', '#f59e0b'];
            const barColor = colors[idx % colors.length];

            return (
              <div key={idx} style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '0.72rem', fontWeight: 700, color: 'hsl(var(--text-primary))', textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap', maxWidth: '80%' }}>
                    {idx + 1}. {item.name}
                  </span>
                  <span style={{ fontSize: '0.68rem', fontWeight: 800, color: barColor, background: `${barColor}10`, padding: '2px 8px', borderRadius: 6 }}>
                    {item.qty} sold
                  </span>
                </div>
                <div style={{ width: '100%', height: 8, background: 'rgba(0,0,0,0.04)', borderRadius: 4, overflow: 'hidden' }}>
                  <div
                    style={{
                      width: `${percentage}%`,
                      height: '100%',
                      background: barColor,
                      borderRadius: 4,
                      transition: 'width 0.8s cubic-bezier(0.16, 1, 0.3, 1)'
                    }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  return (
    <div style={{ paddingBottom: 12 }}>
      {/* Welcome */}
      <div style={{ marginBottom: 20 }}>
        <h2 style={{ fontFamily: 'Outfit', fontWeight: 900, fontSize: '1.25rem', color: 'hsl(var(--text-primary))', margin: '0 0 2px', letterSpacing: '-0.02em' }}>
          Good {greeting()}, {authUser?.name?.split(' ')[0] || 'Admin'} 👋
        </h2>
        <p style={{ fontSize: '0.78rem', color: 'hsl(var(--text-muted))' }}>Here's your business overview</p>
      </div>

      {/* Revenue hero */}
      <div style={{
        borderRadius: 24, padding: '24px 20px', marginBottom: 18,
        background: 'linear-gradient(135deg, hsl(var(--primary)) 0%, hsl(var(--secondary)) 100%)',
        boxShadow: '0 10px 30px hsl(var(--primary) / 25%), inset 0 1px 0 rgba(255, 255, 255, 0.25)',
        position: 'relative', overflow: 'hidden',
        border: '1px solid hsla(0, 0%, 100%, 0.1)'
      }}>
        <div style={{ position: 'absolute', top: -20, right: -20, width: 100, height: 100, borderRadius: '50%', background: 'rgba(255,255,255,0.08)' }} />
        <div style={{ position: 'absolute', bottom: -30, right: 20, width: 80, height: 80, borderRadius: '50%', background: 'rgba(255,255,255,0.05)' }} />
        <p style={{ fontSize: '0.65rem', fontWeight: 800, color: 'rgba(255,255,255,0.85)', textTransform: 'uppercase', letterSpacing: '0.12em', margin: '0 0 6px' }}>
          Total Revenue (Delivered)
        </p>
        <h1 style={{ fontFamily: 'Outfit', fontWeight: 900, fontSize: '2.1rem', color: '#fff', margin: '0 0 4px', letterSpacing: '-0.03em', textShadow: '0 2px 4px rgba(15,23,42,0.1)' }}>
          {fmt(stats.totalRevenue)}
        </h1>
        <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
          <TrendingUp size={13} color="rgba(255,255,255,0.9)" />
          <span style={{ fontSize: '0.72rem', color: 'rgba(255,255,255,0.9)', fontWeight: 600 }}>
            {stats.totalOrders} total orders
          </span>
        </div>
      </div>

      {/* Stat grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: 10, marginBottom: 16 }}>
        <StatCard icon={<Clock size={14} />} label="Pending Orders" value={stats.pendingOrders} color="#f59e0b" alert={stats.pendingOrders > 0} onClick={() => onNavigate?.('orders')} />
        <StatCard icon={<Truck size={14} />} label="Dispatched" value={stats.dispatchedOrders} color="#0ea5e9" />
        <StatCard icon={<Users size={14} />} label="Active Doctors" value={stats.approvedDoctors} color="#6366f1" />
        <StatCard icon={<AlertTriangle size={14} />} label="Pending Signups" value={stats.pendingDoctors} color="#ef4444" alert={stats.pendingDoctors > 0} onClick={() => onNavigate?.('admin')} />
        <StatCard icon={<Package size={14} />} label="Total Products" value={stats.totalProducts} color="#ec4899" onClick={() => onNavigate?.('products')} />
      </div>

      {/* Analytics Charts Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 16, marginBottom: 16 }}>
        {drawLineChart(stats.dailyRevenue)}
        {drawTopProductsChart(stats.topProducts)}
      </div>

      {/* Low stock alert */}
      {lowStock.length > 0 && (
        <div style={{ background: 'hsl(var(--color-hyper) / 5%)', border: '1px solid hsl(var(--color-hyper) / 20%)', borderRadius: 16, padding: '14px 16px', marginBottom: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
            <AlertTriangle size={15} color="hsl(var(--color-hyper))" />
            <span style={{ fontSize: '0.78rem', fontWeight: 800, color: 'hsl(var(--color-hyper))', fontFamily: 'Outfit' }}>
              Low Stock Alert ({lowStock.length} items)
            </span>
          </div>
          {lowStock.map(p => (
            <div key={p.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '6px 0', borderTop: '1px solid hsl(var(--color-hyper) / 8%)' }}>
              <span style={{ fontSize: '0.75rem', color: 'hsl(var(--text-primary))', fontWeight: 600 }}>{p.name}</span>
              <span style={{ fontSize: '0.65rem', fontWeight: 800, color: p.stock_qty === 0 ? 'hsl(var(--color-hyper))' : '#f59e0b', background: p.stock_qty === 0 ? 'hsl(var(--color-hyper) / 10%)' : 'rgba(245,158,11,0.1)', padding: '2px 8px', borderRadius: 6 }}>
                {p.stock_qty === 0 ? 'Out of Stock' : `${p.stock_qty} left`}
              </span>
            </div>
          ))}
        </div>
      )}

      {/* Recent orders */}
      <div className="glass-card" style={{ marginBottom: 0, padding: '16px 18px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
          <h3 style={{ fontFamily: 'Outfit', fontWeight: 800, fontSize: '0.88rem', color: 'hsl(var(--text-primary))', margin: 0 }}>
            Recent Orders
          </h3>
          <span style={{ fontSize: '0.65rem', color: 'hsl(var(--primary))', fontWeight: 700 }}>Last 5</span>
        </div>

        {recentOrders.length === 0 ? (
          <p style={{ fontSize: '0.75rem', color: 'hsl(var(--text-muted))', textAlign: 'center', padding: '16px 0' }}>No orders yet</p>
        ) : (
          recentOrders.map(order => (
            <div key={order.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 0', borderTop: '1px solid hsl(var(--border-color))' }}>
              <div>
                <p style={{ fontSize: '0.75rem', fontWeight: 750, color: 'hsl(var(--text-primary))', margin: '0 0 2px' }}>
                  Order #{order.id.slice(-6).toUpperCase()}
                </p>
                <p style={{ fontSize: '0.65rem', color: 'hsl(var(--text-muted))', margin: 0 }}>
                  {new Date(order.created_at).toLocaleDateString('en-IN')}
                </p>
              </div>
              <div style={{ textAlign: 'right' }}>
                <p style={{ fontSize: '0.78rem', fontWeight: 800, color: 'hsl(var(--text-primary))', margin: '0 0 3px' }}>
                  ₹{(order.total || 0).toLocaleString('en-IN')}
                </p>
                <StatusBadge status={order.status} />
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

function StatCard({ icon, label, value, color, alert, onClick }) {
  return (
    <div
      className="glass-card"
      onClick={onClick}
      style={{
        margin: 0,
        padding: '16px',
        display: 'flex',
        flexDirection: 'column',
        gap: 10,
        position: 'relative',
        overflow: 'hidden',
        borderLeft: `4px solid ${color}`,
        background: `linear-gradient(135deg, hsl(var(--bg-card)) 0%, ${color}04 100%)`,
        transition: 'all 0.3s cubic-bezier(0.25, 0.8, 0.25, 1)',
        cursor: onClick ? 'pointer' : 'default',
      }}
      onMouseEnter={e => {
        e.currentTarget.style.transform = 'translateY(-3px) scale(1.02)';
        e.currentTarget.style.boxShadow = `0 12px 28px ${color}12, 0 2px 8px rgba(0, 0, 0, 0.01)`;
        e.currentTarget.style.borderColor = `${color}40`;
      }}
      onMouseLeave={e => {
        e.currentTarget.style.transform = 'none';
        e.currentTarget.style.boxShadow = 'none';
        e.currentTarget.style.borderColor = 'hsl(var(--border-color))';
      }}
    >
      {alert && value > 0 && (
        <span style={{ position: 'absolute', top: 10, right: 10, width: 8, height: 8, borderRadius: '50%', background: color, boxShadow: `0 0 6px ${color}` }} />
      )}
      <div style={{ color, display: 'flex', background: `${color}12`, width: 28, height: 28, borderRadius: 8, alignItems: 'center', justifyContent: 'center' }}>
        {icon}
      </div>
      <div>
        <div style={{ fontFamily: 'Outfit', fontWeight: 900, fontSize: '1.5rem', color: 'hsl(var(--text-primary))', lineHeight: 1 }}>{value}</div>
        <div style={{ fontSize: '0.65rem', color: 'hsl(var(--text-muted))', fontWeight: 700, marginTop: 4, textTransform: 'uppercase', letterSpacing: '0.02em' }}>{label}</div>
      </div>
    </div>
  );
}

function StatusBadge({ status }) {
  const map = {
    pending:    { color: '#f59e0b', bg: 'rgba(245,158,11,0.1)',  label: 'Pending' },
    confirmed:  { color: '#0ea5e9', bg: 'rgba(14,165,233,0.1)', label: 'Confirmed' },
    dispatched: { color: '#6366f1', bg: 'rgba(99,102,241,0.1)', label: 'Dispatched' },
    delivered:  { color: '#10b981', bg: 'rgba(16,185,129,0.1)', label: 'Delivered' },
    cancelled:  { color: '#ef4444', bg: 'rgba(239,68,68,0.1)',  label: 'Cancelled' },
  };
  const s = map[status] || map.pending;
  return (
    <span style={{ fontSize: '0.58rem', fontWeight: 800, color: s.color, background: s.bg, padding: '2px 7px', borderRadius: 6, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
      {s.label}
    </span>
  );
}

function greeting() {
  const h = new Date().getHours();
  if (h < 12) return 'Morning';
  if (h < 17) return 'Afternoon';
  return 'Evening';
}
