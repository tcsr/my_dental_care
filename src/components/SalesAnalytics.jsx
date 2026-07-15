import { useMemo, useState, useEffect } from 'react';
import { supabase } from '../utils/supabase';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../utils/db';
import { TrendingUp, Package, CreditCard, ShoppingBag, Users, Calendar } from 'lucide-react';

const RANGE_OPTIONS = [
  { label: '7 Days', days: 7 },
  { label: '30 Days', days: 30 },
  { label: '90 Days', days: 90 },
  { label: 'All Time', days: null },
];

const CHART_COLORS = ['#6366f1', '#0ea5e9', '#10b981', '#f59e0b', '#ec4899', '#a855f7'];

const fmt = (n) =>
  n >= 100000 ? `₹${(n / 100000).toFixed(1)}L`
  : n >= 1000 ? `₹${(n / 1000).toFixed(1)}K`
  : `₹${Math.round(n)}`;

/* ─── SVG Line / Area Chart ─── */
function LineChart({ data, color = '#6366f1', labelKey = 'label', valueKey = 'value' }) {
  if (!data || data.length === 0) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 160, color: 'hsl(var(--text-muted))', fontSize: '0.75rem' }}>
      No data for this period
    </div>
  );

  const W = 460, H = 180, PL = 48, PR = 16, PT = 28, PB = 32;
  const cW = W - PL - PR;
  const cH = H - PT - PB;
  const maxVal = Math.max(...data.map(d => d[valueKey]), 1);
  const gridLines = 4;

  const pts = data.map((d, i) => ({
    x: PL + (data.length > 1 ? (i / (data.length - 1)) * cW : cW / 2),
    y: PT + cH - (d[valueKey] / maxVal) * cH,
    v: d[valueKey],
    l: d[labelKey],
  }));

  const poly = pts.map(p => `${p.x},${p.y}`).join(' ');
  const fill = `${pts[0].x},${PT + cH} ${poly} ${pts[pts.length - 1].x},${PT + cH}`;

  return (
    <svg width="100%" height={H} viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="xMidYMid meet">
      <defs>
        <linearGradient id={`grad-${color.replace('#', '')}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.22" />
          <stop offset="100%" stopColor={color} stopOpacity="0.01" />
        </linearGradient>
      </defs>

      {/* Y grid lines */}
      {Array.from({ length: gridLines + 1 }, (_, i) => {
        const y = PT + (i / gridLines) * cH;
        const val = maxVal - (i / gridLines) * maxVal;
        return (
          <g key={i}>
            <line x1={PL} y1={y} x2={W - PR} y2={y} stroke="hsl(var(--border-color))" strokeOpacity="0.4" strokeDasharray={i === gridLines ? '0' : '3,3'} strokeWidth={i === gridLines ? 1.5 : 1} />
            <text x={PL - 4} y={y + 4} textAnchor="end" style={{ fontSize: '0.52rem', fill: 'hsl(var(--text-muted))', fontFamily: 'Outfit' }}>
              {val >= 1000 ? `${(val / 1000).toFixed(0)}k` : Math.round(val)}
            </text>
          </g>
        );
      })}

      <polygon points={fill} fill={`url(#grad-${color.replace('#', '')})`} />
      <polyline points={poly} fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />

      {pts.map((p, i) => (
        <g key={i}>
          <circle cx={p.x} cy={p.y} r="4" fill="#fff" stroke={color} strokeWidth="2" />
          {p.v > 0 && (
            <text x={p.x} y={p.y - 9} textAnchor="middle" style={{ fontSize: '0.5rem', fontWeight: 800, fill: 'hsl(var(--text-primary))', fontFamily: 'Outfit' }}>
              {fmt(p.v)}
            </text>
          )}
          <text x={p.x} y={H - 6} textAnchor="middle" style={{ fontSize: '0.5rem', fill: 'hsl(var(--text-muted))', fontFamily: 'Inter' }}>
            {p.l}
          </text>
        </g>
      ))}
    </svg>
  );
}

/* ─── Horizontal Bar Chart ─── */
function HBarChart({ data, labelKey = 'label', valueKey = 'value', prefix = '' }) {
  if (!data || data.length === 0) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 120, color: 'hsl(var(--text-muted))', fontSize: '0.75rem' }}>
      No data for this period
    </div>
  );
  const max = Math.max(...data.map(d => d[valueKey]), 1);
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      {data.map((item, idx) => {
        const pct = (item[valueKey] / max) * 100;
        const color = CHART_COLORS[idx % CHART_COLORS.length];
        return (
          <div key={idx}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 5 }}>
              <span style={{ fontSize: '0.72rem', fontWeight: 700, color: 'hsl(var(--text-primary))', maxWidth: '65%', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {idx + 1}. {item[labelKey]}
              </span>
              <span style={{ fontSize: '0.68rem', fontWeight: 800, color, background: `${color}14`, padding: '2px 8px', borderRadius: 6 }}>
                {prefix}{typeof item[valueKey] === 'number' && item[valueKey] >= 1000 ? fmt(item[valueKey]) : item[valueKey]}
              </span>
            </div>
            <div style={{ width: '100%', height: 8, background: 'hsl(var(--border-color) / 30%)', borderRadius: 4, overflow: 'hidden' }}>
              <div style={{ width: `${pct}%`, height: '100%', background: color, borderRadius: 4, transition: 'width 0.8s cubic-bezier(0.16,1,0.3,1)' }} />
            </div>
          </div>
        );
      })}
    </div>
  );
}

/* ─── Donut Chart ─── */
function DonutChart({ data, labelKey = 'label', valueKey = 'value' }) {
  if (!data || data.length === 0 || data.every(d => d[valueKey] === 0)) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 160, color: 'hsl(var(--text-muted))', fontSize: '0.75rem' }}>
      No data for this period
    </div>
  );
  const total = data.reduce((s, d) => s + d[valueKey], 0);
  const R = 60, r = 36, cx = 80, cy = 75;
  let angle = -Math.PI / 2;
  const slices = data.map((d, i) => {
    const ratio = d[valueKey] / total;
    const sweep = ratio * 2 * Math.PI;
    const x1 = cx + R * Math.cos(angle);
    const y1 = cy + R * Math.sin(angle);
    angle += sweep;
    const x2 = cx + R * Math.cos(angle);
    const y2 = cy + R * Math.sin(angle);
    const large = sweep > Math.PI ? 1 : 0;
    const mx = cx + r * Math.cos(angle - sweep / 2);
    const my = cy + r * Math.sin(angle - sweep / 2);
    return { path: `M ${cx} ${cy} L ${x1} ${y1} A ${R} ${R} 0 ${large} 1 ${x2} ${y2} Z`, color: CHART_COLORS[i % CHART_COLORS.length], ratio, mx, my, label: d[labelKey], value: d[valueKey] };
  });

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
      <svg width={160} height={150} viewBox={`0 0 160 150`} style={{ flexShrink: 0 }}>
        {slices.map((s, i) => (
          <path key={i} d={s.path} fill={s.color} stroke="hsl(var(--bg-card))" strokeWidth="2" />
        ))}
        <circle cx={cx} cy={cy} r={r} fill="hsl(var(--bg-card))" />
        <text x={cx} y={cy - 6} textAnchor="middle" style={{ fontSize: '0.6rem', fontWeight: 800, fill: 'hsl(var(--text-muted))', fontFamily: 'Outfit' }}>TOTAL</text>
        <text x={cx} y={cy + 10} textAnchor="middle" style={{ fontSize: '0.82rem', fontWeight: 900, fill: 'hsl(var(--text-primary))', fontFamily: 'Outfit' }}>{total}</text>
      </svg>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, flex: 1 }}>
        {slices.map((s, i) => (
          <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
            <div style={{ width: 10, height: 10, borderRadius: 3, background: s.color, flexShrink: 0 }} />
            <span style={{ fontSize: '0.68rem', color: 'hsl(var(--text-primary))', fontWeight: 700, flex: 1 }}>{s.label}</span>
            <span style={{ fontSize: '0.65rem', fontWeight: 800, color: s.color }}>{s.value} ({(s.ratio * 100).toFixed(0)}%)</span>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ─── Card wrapper ─── */
function ChartCard({ title, icon, children }) {
  return (
    <div className="sales-card-premium" style={{ padding: '16px 18px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
        <div style={{ color: '#0ea5e9', display: 'flex', background: 'rgba(14,165,233,0.1)', width: 28, height: 28, borderRadius: 8, alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          {icon}
        </div>
        <h4 style={{ fontFamily: 'Outfit', fontWeight: 800, fontSize: '0.82rem', color: 'hsl(var(--text-primary))', margin: 0, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
          {title}
        </h4>
      </div>
      {children}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════
   MAIN COMPONENT
═══════════════════════════════════════════════════════════ */
export default function SalesAnalytics({ setActiveSubTab, setOrderDispatchFilter, setOrderCurrentPage, onNavigate }) {
  const [rangeDays, setRangeDays] = useState(30);

  const [cloudOrders, setCloudOrders] = useState([]);

  useEffect(() => {
    const fetchCloudOrders = async () => {
      const { data } = await supabase.from('orders').select('*');
      if (data) {
        const mapped = data.map(o => ({
          id: `cloud-${o.id}`,
          orderDate: new Date(o.created_at).getTime(),
          finalAmount: o.total || 0,
          paymentMethod: 'Cloud Order',
          status: o.status,
          isCloud: true
        }));
        setCloudOrders(mapped);
      }
    };
    fetchCloudOrders();
  }, []);

  const localOrders = useLiveQuery(() => db.b2bOrders.toArray()) || [];
  const orders = useMemo(() => [...localOrders, ...cloudOrders], [localOrders, cloudOrders]);

  const products = useLiveQuery(() => db.b2bProducts.toArray()) || [];
  const clients = useLiveQuery(() => db.b2bClients.toArray()) || [];

  const cutoff = useMemo(() => {
    if (!rangeDays) return null;
    const d = new Date();
    d.setDate(d.getDate() - rangeDays);
    return d.getTime();
  }, [rangeDays]);

  const filtered = useMemo(() =>
    cutoff ? orders.filter(o => o.orderDate >= cutoff) : orders,
    [orders, cutoff]
  );

  /* ── Revenue Trend ── */
  const revenueTrend = useMemo(() => {
    const days = rangeDays || 90;
    const buckets = Math.min(days, 30);
    const now = Date.now();
    const bucketMs = (days * 24 * 60 * 60 * 1000) / buckets;

    return Array.from({ length: buckets }, (_, i) => {
      const start = now - (buckets - i) * bucketMs;
      const end = start + bucketMs;
      const dayOrders = filtered.filter(o => o.orderDate >= start && o.orderDate < end);
      const rev = dayOrders.reduce((s, o) => s + (o.finalAmount || 0), 0);
      const d = new Date(start);
      const label = rangeDays <= 7
        ? d.toLocaleDateString('en-IN', { weekday: 'short' })
        : rangeDays <= 30
          ? d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })
          : d.toLocaleDateString('en-IN', { month: 'short', year: '2-digit' });
      return { label, value: rev };
    });
  }, [filtered, rangeDays]);

  /* ── Top 5 Products by Revenue ── */
  const topProducts = useMemo(() => {
    const map = {};
    filtered.forEach(o => {
      const prod = products.find(p => p.id === o.productIds?.[0]);
      if (!prod) return;
      map[prod.name] = (map[prod.name] || 0) + (o.finalAmount || 0);
    });
    return Object.entries(map)
      .map(([label, value]) => ({ label, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 5);
  }, [filtered, products]);

  /* ── Payment Method Breakdown ── */
  const paymentMethods = useMemo(() => {
    const map = {};
    filtered.forEach(o => {
      const method = o.paymentMethod || 'Unknown';
      map[method] = (map[method] || 0) + 1;
    });
    return Object.entries(map)
      .map(([label, value]) => ({ label, value }))
      .sort((a, b) => b.value - a.value);
  }, [filtered]);

  /* ── Orders by Status ── */
  const ordersByStatus = useMemo(() => {
    const STATUS_LABELS = {
      pending: 'Pending', confirmed: 'Confirmed', dispatched: 'Dispatched',
      delivered: 'Delivered', cancelled: 'Cancelled',
    };
    const map = {};
    filtered.forEach(o => {
      const s = o.status || 'pending';
      map[s] = (map[s] || 0) + 1;
    });
    return Object.entries(map)
      .map(([key, value]) => ({ label: STATUS_LABELS[key] || key, value }))
      .sort((a, b) => b.value - a.value);
  }, [filtered]);

  /* ── Top 5 Clients by Revenue ── */
  const topClients = useMemo(() => {
    const map = {};
    filtered.forEach(o => {
      const client = clients.find(c => c.id === o.clientId);
      if (!client) return;
      map[client.name] = (map[client.name] || 0) + (o.finalAmount || 0);
    });
    return Object.entries(map)
      .map(([label, value]) => ({ label, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 5);
  }, [filtered, clients]);

  /* ── Summary KPIs ── */
  const totalRevenue = filtered.reduce((s, o) => s + (o.finalAmount || 0), 0);
  const totalOrders = filtered.length;
  const avgOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0;
  const deliveredRevenue = filtered.filter(o => o.status === 'delivered').reduce((s, o) => s + (o.finalAmount || 0), 0);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

      {/* Date Range Filter */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: 'hsl(var(--text-muted))', fontSize: '0.72rem', fontWeight: 700 }}>
          <Calendar size={13} /> Filter:
        </div>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          {RANGE_OPTIONS.map(opt => (
            <button
              key={opt.label}
              onClick={() => setRangeDays(opt.days)}
              style={{
                padding: '5px 12px', borderRadius: 8, fontSize: '0.7rem', fontWeight: 800,
                border: rangeDays === opt.days ? 'none' : '1px solid hsl(var(--border-color))',
                background: rangeDays === opt.days ? 'linear-gradient(135deg, #0ea5e9, #6366f1)' : 'transparent',
                color: rangeDays === opt.days ? '#fff' : 'hsl(var(--text-muted))',
                cursor: 'pointer', fontFamily: 'Outfit', transition: 'all 0.2s',
              }}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* KPI Summary Row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: 10 }}>
        {[
          { label: 'Total Revenue', value: fmt(totalRevenue), color: '#6366f1', icon: <TrendingUp size={14} />, navTab: 'orders' },
          { label: 'Total Orders', value: totalOrders, color: '#0ea5e9', icon: <ShoppingBag size={14} />, navTab: 'orders' },
          { label: 'Avg Order Value', value: fmt(avgOrderValue), color: '#10b981', icon: <CreditCard size={14} />, navTab: 'orders' },
          { label: 'Delivered Revenue', value: fmt(deliveredRevenue), color: '#f59e0b', icon: <Package size={14} />, navTab: 'orders' },
        ].map((kpi, i) => (
          <div key={i} className="sales-card-premium kpi-card-hover" 
            onClick={() => { 
              if (onNavigate) onNavigate(kpi.navTab);
            }}
            style={{
              padding: '14px 16px', borderLeft: `4px solid ${kpi.color}`,
              background: `linear-gradient(135deg, hsl(var(--bg-card)) 0%, ${kpi.color}06 100%)`,
              cursor: 'pointer',
              transition: 'transform 0.2s, box-shadow 0.2s'
            }}
            onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-3px)'; e.currentTarget.style.boxShadow = '0 6px 12px rgba(0,0,0,0.05)'; }}
            onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = 'none'; }}
          >
            <div style={{ color: kpi.color, display: 'flex', background: `${kpi.color}14`, width: 26, height: 26, borderRadius: 7, alignItems: 'center', justifyContent: 'center', marginBottom: 8 }}>
              {kpi.icon}
            </div>
            <div style={{ fontFamily: 'Outfit', fontWeight: 900, fontSize: '1.15rem', color: 'hsl(var(--text-primary))', lineHeight: 1 }}>{kpi.value}</div>
            <div style={{ fontSize: '0.62rem', color: 'hsl(var(--text-muted))', fontWeight: 700, marginTop: 4, textTransform: 'uppercase', letterSpacing: '0.04em' }}>{kpi.label}</div>
          </div>
        ))}
      </div>

      {/* Revenue Trend */}
      <ChartCard title="Revenue Trend" icon={<TrendingUp size={14} />}>
        <LineChart data={revenueTrend} color="#6366f1" />
      </ChartCard>

      {/* 2-column grid for remaining charts */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 16 }}>
        <ChartCard title="Top Products by Revenue" icon={<Package size={14} />}>
          <HBarChart data={topProducts} prefix="₹" />
        </ChartCard>

        <ChartCard title="Payment Methods" icon={<CreditCard size={14} />}>
          <DonutChart data={paymentMethods} />
        </ChartCard>

        <ChartCard title="Orders by Status" icon={<ShoppingBag size={14} />}>
          <HBarChart data={ordersByStatus} />
        </ChartCard>

        <ChartCard title="Top Clients by Revenue" icon={<Users size={14} />}>
          <HBarChart data={topClients} prefix="₹" />
        </ChartCard>
      </div>
    </div>
  );
}
