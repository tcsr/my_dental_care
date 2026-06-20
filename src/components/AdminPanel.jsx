import { useState, useEffect } from 'react';
import { supabase } from '../utils/supabase';
import { CheckCircle, XCircle, Clock, Building2, Phone, MapPin, FileText, Mail, RefreshCw, Users } from 'lucide-react';

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

  useEffect(() => { fetchDoctors(); }, []);

  const handleApprove = async (id) => {
    setActionLoading(id + '_approve');
    await supabase.from('profiles').update({ approved: true }).eq('id', id);
    await fetchDoctors();
    setActionLoading(null);
  };

  const handleReject = async (id) => {
    if (!confirm('Reject and delete this registration?')) return;
    setActionLoading(id + '_reject');
    await supabase.from('profiles').delete().eq('id', id);
    // Also delete auth user via admin API not possible from client — just remove profile
    await fetchDoctors();
    setActionLoading(null);
  };

  const list = tab === 'pending' ? pending : approved;

  return (
    <div style={{ padding: '20px 16px', maxWidth: 700, margin: '0 auto' }}>
      {/* Header */}
      <div style={{ marginBottom: 24 }}>
        <h2 style={{ fontFamily: 'Outfit', fontWeight: 800, fontSize: '1.2rem', color: 'hsl(var(--text-primary))', margin: '0 0 4px' }}>
          Admin Panel
        </h2>
        <p style={{ fontSize: '0.75rem', color: 'hsl(var(--text-muted))', margin: 0 }}>
          Manage clinic & doctor registrations
        </p>
      </div>

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 24 }}>
        <StatCard icon={<Clock size={18} color="#f59e0b" />} label="Pending Approval" value={pending.length} color="rgba(245,158,11,0.1)" border="rgba(245,158,11,0.2)" />
        <StatCard icon={<CheckCircle size={18} color="#10b981" />} label="Approved Clinics" value={approved.length} color="rgba(16,185,129,0.1)" border="rgba(16,185,129,0.2)" />
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 4, background: 'hsl(var(--bg-dark))', padding: 4, borderRadius: 10, border: '1px solid hsl(var(--border-color))', marginBottom: 20 }}>
        {[['pending', `Pending (${pending.length})`], ['approved', `Approved (${approved.length})`]].map(([key, label]) => (
          <button key={key} onClick={() => setTab(key)} style={{
            flex: 1, padding: '9px', border: 'none', borderRadius: 8, fontSize: '0.75rem',
            fontWeight: 700, fontFamily: 'Outfit', cursor: 'pointer', transition: 'all 0.2s',
            background: tab === key ? 'hsl(var(--bg-card))' : 'transparent',
            color: tab === key ? 'hsl(var(--primary))' : 'hsl(var(--text-muted))',
            boxShadow: tab === key ? '0 2px 8px rgba(0,0,0,0.06)' : 'none',
          }}>{label}</button>
        ))}
      </div>

      {/* Refresh */}
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 14 }}>
        <button onClick={fetchDoctors} style={{
          display: 'flex', alignItems: 'center', gap: 6, background: 'none',
          border: '1px solid hsl(var(--border-color))', borderRadius: 8, padding: '6px 12px',
          fontSize: '0.7rem', fontWeight: 700, color: 'hsl(var(--text-muted))', cursor: 'pointer', fontFamily: 'Outfit'
        }}>
          <RefreshCw size={12} /> Refresh
        </button>
      </div>

      {/* List */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '40px 0', color: 'hsl(var(--text-muted))', fontSize: '0.82rem' }}>
          Loading...
        </div>
      ) : list.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '48px 0' }}>
          <Users size={36} color="hsl(var(--text-dim))" style={{ margin: '0 auto 12px', display: 'block' }} />
          <p style={{ color: 'hsl(var(--text-muted))', fontSize: '0.82rem' }}>
            {tab === 'pending' ? 'No pending registrations' : 'No approved clinics yet'}
          </p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
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
    <div className="glass-card" style={{ padding: '16px 18px', border: isPending ? '1px solid rgba(245,158,11,0.2)' : '1px solid hsl(var(--border-color))' }}>
      {/* Top row */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
        <div>
          <h4 style={{ fontFamily: 'Outfit', fontWeight: 800, fontSize: '0.95rem', color: 'hsl(var(--text-primary))', margin: '0 0 2px' }}>
            {doc.name || 'Unknown'}
          </h4>
          <span style={{
            fontSize: '0.6rem', fontWeight: 800, padding: '2px 8px', borderRadius: 6,
            background: isPending ? 'rgba(245,158,11,0.1)' : 'rgba(16,185,129,0.1)',
            color: isPending ? '#f59e0b' : '#10b981', textTransform: 'uppercase', letterSpacing: '0.05em'
          }}>
            {isPending ? '⏳ Pending' : '✓ Approved'}
          </span>
        </div>
        <span style={{ fontSize: '0.62rem', color: 'hsl(var(--text-dim))' }}>
          {new Date(doc.created_at).toLocaleDateString('en-IN')}
        </span>
      </div>

      {/* Details */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px 16px', marginBottom: 14 }}>
        {doc.clinic_name && <Detail icon={<Building2 size={11} />} text={doc.clinic_name} />}
        {doc.phone && <Detail icon={<Phone size={11} />} text={doc.phone} />}
        {doc.address && <Detail icon={<MapPin size={11} />} text={doc.address} />}
        {doc.gst_number && <Detail icon={<FileText size={11} />} text={doc.gst_number} />}
      </div>

      {/* Actions */}
      {isPending && (
        <div style={{ display: 'flex', gap: 10 }}>
          <button
            onClick={onReject}
            disabled={rejectLoading}
            style={{
              flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
              padding: '9px', borderRadius: 8, border: '1px solid rgba(239,68,68,0.2)',
              background: 'rgba(239,68,68,0.06)', color: '#ef4444',
              fontSize: '0.72rem', fontWeight: 700, fontFamily: 'Outfit', cursor: 'pointer',
              opacity: rejectLoading ? 0.6 : 1
            }}>
            <XCircle size={13} /> {rejectLoading ? 'Rejecting...' : 'Reject'}
          </button>
          <button
            onClick={onApprove}
            disabled={approveLoading}
            style={{
              flex: 2, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
              padding: '9px', borderRadius: 8, border: 'none',
              background: 'linear-gradient(135deg, #10b981, #0ea5e9)',
              color: '#fff', fontSize: '0.72rem', fontWeight: 700, fontFamily: 'Outfit',
              cursor: 'pointer', boxShadow: '0 4px 12px rgba(16,185,129,0.25)',
              opacity: approveLoading ? 0.7 : 1
            }}>
            <CheckCircle size={13} /> {approveLoading ? 'Approving...' : 'Approve Access'}
          </button>
        </div>
      )}
    </div>
  );
}

function StatCard({ icon, label, value, color, border }) {
  return (
    <div style={{ background: color, border: `1px solid ${border}`, borderRadius: 14, padding: '14px 16px', display: 'flex', alignItems: 'center', gap: 12 }}>
      <div style={{ display: 'flex' }}>{icon}</div>
      <div>
        <div style={{ fontSize: '1.4rem', fontWeight: 900, fontFamily: 'Outfit', color: 'hsl(var(--text-primary))', lineHeight: 1 }}>{value}</div>
        <div style={{ fontSize: '0.65rem', color: 'hsl(var(--text-muted))', fontWeight: 700, marginTop: 2 }}>{label}</div>
      </div>
    </div>
  );
}

function Detail({ icon, text }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 5, color: 'hsl(var(--text-muted))' }}>
      <span style={{ flexShrink: 0 }}>{icon}</span>
      <span style={{ fontSize: '0.72rem', fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{text}</span>
    </div>
  );
}
