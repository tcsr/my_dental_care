import { useState, useEffect } from 'react';
import { supabase } from '../utils/supabase';
import { CheckCircle, XCircle, Clock, Building2, Phone, MapPin, FileText, RefreshCw, Users } from 'lucide-react';
import PremiumLoader from './ui/PremiumLoader';
import EmptyStateCard from './EmptyStateCard';
export default function AdminPanel() {
  const [pending, setPending] = useState([]);
  const [approved, setApproved] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(null);
  const [tab, setTab] = useState('pending');

  const fetchDoctors = async () => {
    setLoading(true);
    const { data } = await supabase
      .from('profiles')
      .select('*, auth_email:id')
      .neq('role', 'admin')
      .order('created_at', { ascending: false });

    if (data) {
      setPending(data.filter(d => !d.approved));
      setApproved(data.filter(d => d.approved));
    }
    setLoading(false);
  };

  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { fetchDoctors(); }, []);

  const handleApprove = async (id) => {
    setActionLoading(id + '_approve');
    await supabase.from('profiles').update({ approved: true }).eq('id', id);
    await fetchDoctors();
    setActionLoading(null);
  };

  const handleReject = async (id) => {
    if (!(await confirm('Reject and delete this registration?'))) return;
    setActionLoading(id + '_reject');
    await supabase.from('profiles').delete().eq('id', id);
    // Also delete auth user via admin API not possible from client — just remove profile
    await fetchDoctors();
    setActionLoading(null);
  };

  const list = tab === 'pending' ? pending : approved;

  return (
    <div style={{ padding: '24px 20px', maxWidth: 1000, margin: '0 auto' }}>
      {/* Header */}
      <div style={{ marginBottom: 28 }}>
        <h2 style={{ fontFamily: 'Outfit', fontWeight: 800, fontSize: '1.35rem', color: 'hsl(var(--text-primary))', margin: '0 0 6px', letterSpacing: '-0.02em' }}>
          Admin Panel
        </h2>
        <p style={{ fontSize: '0.8rem', color: 'hsl(var(--text-muted))', margin: 0 }}>
          Manage clinic & doctor registrations with active verification hub
        </p>
      </div>

      {/* Stats / Verification Summary Hub */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 28 }}>
        <StatCard icon={<Clock size={20} color="#f59e0b" />} label="Pending Verification" value={pending.length} color="rgba(245,158,11,0.08)" border="#f59e0b" />
        <StatCard icon={<CheckCircle size={20} color="#10b981" />} label="Approved Clinics" value={approved.length} color="rgba(16,185,129,0.08)" border="#10b981" />
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 6, background: 'hsl(var(--border-color) / 10%)', padding: 6, borderRadius: 12, border: '1px solid hsl(var(--border-color) / 15%)', marginBottom: 24 }}>
        {[['pending', `Pending Hub (${pending.length})`], ['approved', `Verified Members (${approved.length})`]].map(([key, label]) => (
          <button key={key} className="tab-btn" onClick={() => setTab(key)} style={{
            flex: 1, padding: '10px 14px', border: 'none', borderRadius: 9, fontSize: '0.78rem',
            fontWeight: 800, fontFamily: 'Outfit', cursor: 'pointer', transition: 'all 0.25s ease',
            background: tab === key ? 'hsl(var(--bg-card))' : 'transparent',
            color: tab === key ? 'hsl(var(--primary))' : 'hsl(var(--text-muted))',
            boxShadow: tab === key ? '0 4px 12px rgba(0,0,0,0.08)' : 'none',
          }}>{label}</button>
        ))}
      </div>

      {/* Refresh */}
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 16 }}>
        <button onClick={fetchDoctors} style={{
          display: 'flex', alignItems: 'center', gap: 6, background: 'hsl(var(--bg-card))',
          border: '1px solid hsl(var(--border-color))', borderRadius: 9, padding: '8px 16px',
          fontSize: '0.75rem', fontWeight: 700, color: 'hsl(var(--text-muted))', cursor: 'pointer', fontFamily: 'Outfit',
          transition: 'all 0.2s',
          boxShadow: '0 2px 6px rgba(0,0,0,0.02)'
        }}
        onMouseEnter={(e) => { e.currentTarget.style.borderColor = 'hsl(var(--primary))'; e.currentTarget.style.color = 'hsl(var(--primary))'; }}
        onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'hsl(var(--border-color))'; e.currentTarget.style.color = 'hsl(var(--text-muted))'; }}
        >
          <RefreshCw size={13} /> Refresh List
        </button>
      </div>

      {/* List */}
      {loading ? (
        <PremiumLoader text="Retrieving profiles..." />
      ) : list.length === 0 ? (
        <EmptyStateCard 
          icon={Users} 
          title="No Profiles Found" 
          message={tab === 'pending' ? 'No pending registrations to verify.' : 'No approved clinics yet.'} 
        />
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: '20px', alignItems: 'stretch' }}>
          {list.map(doc => (
            <DoctorCard
              key={doc.id}
              doc={doc}
              isPending={tab === 'pending'}
              onApprove={() => handleApprove(doc.id)}
              onReject={() => handleReject(doc.id)}
              approveLoading={actionLoading === doc.id + '_approve'}
              rejectLoading={actionLoading === doc.id + '_reject'}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function DoctorCard({ doc, isPending, onApprove, onReject, approveLoading, rejectLoading }) {
  return (
    <div className="glass-card animate-fade-in" style={{ 
      display: 'flex', flexDirection: 'column', height: '100%',
      padding: '20px 22px', 
      border: '1px solid hsl(var(--border-color))',
      borderLeft: isPending ? '4px solid #f59e0b' : '4px solid #10b981',
      transition: 'transform 0.2s ease, box-shadow 0.2s ease',
      boxShadow: '0 4px 16px rgba(0, 0, 0, 0.02)',
      boxSizing: 'border-box'
    }}
    onMouseEnter={(e) => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 6px 20px rgba(0, 0, 0, 0.05)'; }}
    onMouseLeave={(e) => { e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = '0 4px 16px rgba(0, 0, 0, 0.02)'; }}
    >
      {/* Top row */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 14 }}>
        <div>
          <h4 style={{ fontFamily: 'Outfit', fontWeight: 800, fontSize: '1rem', color: 'hsl(var(--text-primary))', margin: '0 0 4px', letterSpacing: '-0.01em' }}>
            {doc.name || 'Unknown User'}
          </h4>
          <span style={{
            fontSize: '0.62rem', fontWeight: 800, padding: '3px 8px', borderRadius: 6,
            background: isPending ? 'rgba(245,158,11,0.08)' : 'rgba(16,185,129,0.08)',
            color: isPending ? '#f59e0b' : '#10b981', textTransform: 'uppercase', letterSpacing: '0.05em'
          }}>
            {isPending ? '⏳ Verification Required' : '✓ Verified Doctor'}
          </span>
        </div>
        <span style={{ fontSize: '0.68rem', color: 'hsl(var(--text-dim))', fontWeight: 600 }}>
          {new Date(doc.created_at).toLocaleDateString('en-IN')}
        </span>
      </div>

      {/* Details Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px 20px', marginBottom: 18, borderTop: '1px solid hsl(var(--border-color) / 10%)', paddingTop: '12px' }}>
        {doc.clinic_name && <Detail icon={<Building2 size={13} style={{ color: 'hsl(var(--primary))' }} />} text={doc.clinic_name} label="Clinic" />}
        {doc.phone && <Detail icon={<Phone size={13} style={{ color: 'hsl(var(--secondary))' }} />} text={doc.phone} label="Phone" />}
        {doc.address && <Detail icon={<MapPin size={13} style={{ color: 'hsl(var(--primary))' }} />} text={doc.address} label="Address" />}
        {doc.gst_number && <Detail icon={<FileText size={13} style={{ color: 'hsl(var(--text-muted))' }} />} text={doc.gst_number} label="GSTIN" />}
      </div>

      {/* Actions */}
      {isPending && (
        <div style={{ marginTop: 'auto', display: 'flex', gap: 12, borderTop: '1px solid hsl(var(--border-color) / 10%)', paddingTop: '14px' }}>
          <button
            onClick={onReject}
            disabled={rejectLoading}
            style={{
              flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
              padding: '10px', borderRadius: 9, border: '1px solid rgba(239,68,68,0.2)',
              background: 'rgba(239,68,68,0.04)', color: '#ef4444',
              fontSize: '0.75rem', fontWeight: 700, fontFamily: 'Outfit', cursor: 'pointer',
              opacity: rejectLoading ? 0.6 : 1, transition: 'all 0.2s'
            }}
            onMouseEnter={(e) => { if (!rejectLoading) e.currentTarget.style.background = 'rgba(239,68,68,0.08)'; }}
            onMouseLeave={(e) => { if (!rejectLoading) e.currentTarget.style.background = 'rgba(239,68,68,0.04)'; }}
            >
            <XCircle size={14} /> {rejectLoading ? 'Rejecting...' : 'Reject Application'}
          </button>
          <button
            onClick={onApprove}
            disabled={approveLoading}
            style={{
              flex: 1.8, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
              padding: '10px', borderRadius: 9, border: 'none',
              background: 'linear-gradient(135deg, #10b981, #0ea5e9)',
              color: '#fff', fontSize: '0.75rem', fontWeight: 700, fontFamily: 'Outfit',
              cursor: 'pointer', boxShadow: '0 4px 12px rgba(16,185,129,0.2)',
              opacity: approveLoading ? 0.7 : 1, transition: 'all 0.2s'
            }}
            onMouseEnter={(e) => { if (!approveLoading) { e.currentTarget.style.boxShadow = '0 6px 16px rgba(16,185,129,0.3)'; e.currentTarget.style.opacity = '0.95'; } }}
            onMouseLeave={(e) => { if (!approveLoading) { e.currentTarget.style.boxShadow = '0 4px 12px rgba(16,185,129,0.2)'; e.currentTarget.style.opacity = '1'; } }}
            >
            <CheckCircle size={14} /> {approveLoading ? 'Approving...' : 'Verify & Approve'}
          </button>
        </div>
      )}
    </div>
  );
}

function StatCard({ icon, label, value, color, border }) {
  return (
    <div style={{ 
      background: 'hsl(var(--bg-card))', 
      borderRadius: '16px', 
      padding: '24px 20px', 
      border: '1px solid hsl(var(--border-color))', 
      borderTop: `4px solid ${border}`,
      boxShadow: '0 4px 20px rgba(0, 0, 0, 0.02)', 
      display: 'flex', 
      flexDirection: 'column',
      alignItems: 'center', 
      justifyContent: 'center', 
      textAlign: 'center', 
      transition: 'transform 0.2s',
      cursor: 'default'
    }} onMouseEnter={e => e.currentTarget.style.transform = 'translateY(-4px)'} onMouseLeave={e => e.currentTarget.style.transform = 'translateY(0)'}>
      <div style={{ width: 44, height: 44, borderRadius: '12px', background: color, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '12px' }}>
        {icon}
      </div>
      <div style={{ fontSize: '0.68rem', fontWeight: 800, color: 'hsl(var(--text-muted))', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '4px' }}>{label}</div>
      <div style={{ fontSize: '1.75rem', fontWeight: 900, color: 'hsl(var(--text-primary))', fontFamily: 'Outfit', lineHeight: 1 }}>{value}</div>
    </div>
  );
}

function Detail({ icon, text, label }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'hsl(var(--text-muted))' }}>
      <span style={{ display: 'flex', padding: '5px', borderRadius: '6px', background: 'hsl(var(--border-color) / 8%)', flexShrink: 0 }}>{icon}</span>
      <div style={{ overflow: 'hidden' }}>
        <span style={{ fontSize: '0.55rem', color: 'hsl(var(--text-dim))', display: 'block', textTransform: 'uppercase', fontWeight: 700, lineHeight: 1 }}>{label}</span>
        <span style={{ fontSize: '0.78rem', fontWeight: 600, color: 'hsl(var(--text-primary))', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', display: 'block', marginTop: '2px' }}>{text}</span>
      </div>
    </div>
  );
}
