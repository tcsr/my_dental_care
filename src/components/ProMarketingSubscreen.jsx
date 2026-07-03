import { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../utils/db';
import { Megaphone, Plus, Trash2, UserCheck, Target, TrendingUp, Edit3, X } from 'lucide-react';
import PremiumSelect from './ui/PremiumSelect';
import EmptyStateCard from './EmptyStateCard';
import { CUSTOMER_CATEGORIES } from './ProSalesSubscreen';

const CHANNELS = ['Direct Visit', 'Phone Call', 'WhatsApp', 'Facebook', 'Instagram', 'Telegram', 'LinkedIn', 'Referral', 'Ad', 'Free Sample'];
const STATUSES = ['New', 'Contacted', 'Sample Given', 'Feedback', 'Converted', 'Lost'];
const MAJOR_STATES = ['Tamil Nadu', 'Karnataka', 'Andhra Pradesh', 'Maharashtra', 'Punjab', 'Kerala'];

const STATUS_COLOR = {
  New: '#0ea5e9', Contacted: '#6366f1', 'Sample Given': '#f59e0b',
  Feedback: '#a855f7', Converted: '#10b981', Lost: '#ef4444'
};

const inputStyle = { width: '100%', padding: '10px 12px', background: 'hsl(var(--bg-dark))', border: '1.5px solid hsl(var(--border-color))', borderRadius: 10, fontSize: '0.82rem', color: 'hsl(var(--text-primary))', outline: 'none', fontFamily: 'Outfit', boxSizing: 'border-box' };

function Field({ label, children }) {
  return (
    <div>
      <label style={{ fontSize: '0.66rem', fontWeight: 800, color: 'hsl(var(--text-muted))', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'block', marginBottom: 5 }}>{label}</label>
      {children}
    </div>
  );
}

const EMPTY_LEAD = { name: '', contactPerson: '', phone: '', email: '', customerCategory: 'Clinic', region: 'Telangana', channel: 'Direct Visit', status: 'New', notes: '', sampleProductId: '', sampleQty: '1' };

export default function ProMarketingSubscreen() {
  const [activeTab, setActiveTab] = useState('leads'); // 'leads' | 'potential'
  const leads = useLiveQuery(() => db.marketingLeads.toArray()) || [];
  const clients = useLiveQuery(() => db.b2bClients.toArray()) || [];
  const products = useLiveQuery(() => db.b2bProducts.toArray()) || [];
  const dbStates = useLiveQuery(() => db.b2bStates.toArray()) || [];

  const regionOptions = Array.from(new Set([
    ...dbStates.map(s => s.name),
    ...clients.map(c => c.state).filter(Boolean),
    ...leads.map(l => l.region).filter(Boolean)
  ])).sort();

  const [form, setForm] = useState(EMPTY_LEAD);
  const [showAdd, setShowAdd] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editingLeadId, setEditingLeadId] = useState(null);

  const [filterStatus, setFilterStatus] = useState('All');
  const [filterCategory, setFilterCategory] = useState('All');

  const handleAddLead = async () => {
    if (!form.name.trim()) { alert('Please enter a lead / contact name.'); return; }
    setSaving(true);
    const payload = {
      name: form.name.trim(),
      contactPerson: form.contactPerson.trim(),
      phone: form.phone.trim(),
      email: form.email.trim(),
      customerCategory: form.customerCategory,
      region: form.region,
      channel: form.channel,
      status: form.status,
      notes: form.notes.trim(),
      createdDate: Date.now(),
      dateStatusUpdated: Date.now(),
      clientId: null
    };
    if (form.status === 'Sample Given' && form.sampleProductId) {
      const sampleQtyNum = parseInt(form.sampleQty) || 1;
      payload.sampleProductId = parseInt(form.sampleProductId);
      payload.sampleQty = sampleQtyNum;
      const product = products.find(p => p.id === payload.sampleProductId);
      if (product) {
        await db.b2bProducts.update(product.id, { stock: Math.max(0, (product.stock || 0) - sampleQtyNum) });
        await db.stockAdjustments.add({
          productId: product.id,
          type: 'Sample Given',
          qtyChange: -sampleQtyNum,
          reason: `Free sample given to lead "${payload.name}"`,
          date: Date.now()
        });
      }
    }
    await db.marketingLeads.add(payload);
    closePanel();
  };

  const openEdit = (lead) => {
    setEditingLeadId(lead.id);
    setForm({
      name: lead.name || '',
      contactPerson: lead.contactPerson || '',
      phone: lead.phone || '',
      email: lead.email || '',
      customerCategory: lead.customerCategory || 'Clinic',
      region: lead.region || 'Telangana',
      channel: lead.channel || 'Direct Visit',
      status: lead.status || 'New',
      notes: lead.notes || '',
      sampleProductId: '',
      sampleQty: '1'
    });
    setShowAdd(true);
  };

  const closePanel = () => {
    setForm(EMPTY_LEAD);
    setShowAdd(false);
    setSaving(false);
    setEditingLeadId(null);
  };

  const handleUpdateLead = async () => {
    if (!form.name.trim()) { alert('Please enter a lead / contact name.'); return; }
    setSaving(true);
    await db.marketingLeads.update(editingLeadId, {
      name: form.name.trim(),
      contactPerson: form.contactPerson.trim(),
      phone: form.phone.trim(),
      email: form.email.trim(),
      customerCategory: form.customerCategory,
      region: form.region,
      channel: form.channel,
      notes: form.notes.trim()
    });
    closePanel();
  };

  const handleStatusChange = async (lead, newStatus) => {
    await db.marketingLeads.update(lead.id, { status: newStatus, dateStatusUpdated: Date.now() });
  };

  const handleDeleteLead = async (id) => {
    if (!(await confirm('Delete this lead? This cannot be undone.'))) return;
    await db.marketingLeads.delete(id);
  };

  const handleConvertLead = async (lead) => {
    const newId = await db.b2bClients.add({
      name: lead.name,
      type: 'Doctor',
      contactPerson: lead.contactPerson || '',
      email: lead.email || '',
      phone: lead.phone || '',
      address: '',
      discountTier: 'Standard',
      state: lead.region || 'Telangana',
      creditLimit: 200000,
      image: '',
      customerCategory: lead.customerCategory || 'Other'
    });
    await db.marketingLeads.update(lead.id, { clientId: newId });
    alert('Lead converted to client! Find it in the Sales screen client directory.');
  };

  const filteredLeads = leads.filter(l =>
    (filterStatus === 'All' || l.status === filterStatus) &&
    (filterCategory === 'All' || l.customerCategory === filterCategory)
  ).sort((a, b) => (b.dateStatusUpdated || 0) - (a.dateStatusUpdated || 0));

  // Marketing Potential aggregation
  const potentialRows = (() => {
    const map = {};
    clients.forEach(c => {
      const key = c.state || 'Unknown';
      map[key] = map[key] || { region: key, clients: 0, leads: 0 };
      map[key].clients += 1;
    });
    leads.filter(l => l.status !== 'Lost').forEach(l => {
      const key = l.region || 'Unknown';
      map[key] = map[key] || { region: key, clients: 0, leads: 0 };
      map[key].leads += 1;
    });
    return Object.values(map).sort((a, b) => (b.clients + b.leads) - (a.clients + a.leads));
  })();

  // Channel performance: which lead sources actually convert
  const channelRows = (() => {
    const map = {};
    leads.forEach(l => {
      const key = l.channel || 'Unknown';
      map[key] = map[key] || { channel: key, total: 0, converted: 0 };
      map[key].total += 1;
      if (l.status === 'Converted') map[key].converted += 1;
    });
    return Object.values(map)
      .map(row => ({ ...row, rate: row.total ? Math.round((row.converted / row.total) * 100) : 0 }))
      .sort((a, b) => b.total - a.total);
  })();

  return (
    <div style={{ paddingBottom: 12 }}>
      <div className="tab-group">
        <button onClick={() => setActiveTab('leads')} className={`tab-btn ${activeTab === 'leads' ? 'active' : ''}`} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <Target size={14} /> Leads
        </button>
        <button onClick={() => setActiveTab('potential')} className={`tab-btn ${activeTab === 'potential' ? 'active' : ''}`} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <TrendingUp size={14} /> Marketing Potential
        </button>
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', margin: '20px 0' }}>
        <div>
          <h2 style={{ fontFamily: 'Outfit', fontWeight: 900, fontSize: '1.15rem', color: 'hsl(var(--text-primary))', margin: '0 0 2px', display: 'flex', alignItems: 'center', gap: 8 }}>
            <Megaphone size={18} /> {activeTab === 'leads' ? 'Marketing Leads' : 'Marketing Potential'}
          </h2>
          <p style={{ fontSize: '0.72rem', color: 'hsl(var(--text-muted))' }}>
            {activeTab === 'leads' ? 'Track prospects from first contact through conversion' : 'Segment coverage by region & customer category'}
          </p>
        </div>
        {activeTab === 'leads' && (
          <button onClick={() => { if (showAdd) { closePanel(); } else { setForm(EMPTY_LEAD); setEditingLeadId(null); setShowAdd(true); } }} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '9px 16px', borderRadius: 12, border: 'none', background: 'linear-gradient(135deg, #0ea5e9, #6366f1)', color: '#fff', fontSize: '0.75rem', fontWeight: 700, cursor: 'pointer', fontFamily: 'Outfit', flexShrink: 0 }}>
            <Plus size={14} /> Add Lead
          </button>
        )}
      </div>

      {activeTab === 'leads' && (
        <>
          {showAdd && (
            <div className="glass-card animate-fade-in" style={{ padding: 16, marginBottom: 16, border: '1px solid hsl(var(--border-color))', display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h4 style={{ fontSize: '0.82rem', fontWeight: 800, margin: 0 }}>{editingLeadId ? 'Edit Lead' : 'New Lead'}</h4>
                <button onClick={closePanel} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'hsl(var(--text-muted))', display: 'flex' }}>
                  <X size={16} />
                </button>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <Field label="Name / Clinic *">
                  <input style={inputStyle} value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="e.g. Dr. Ramesh (Ramesh Dental)" />
                </Field>
                <Field label="Contact Person">
                  <input style={inputStyle} value={form.contactPerson} onChange={e => setForm(f => ({ ...f, contactPerson: e.target.value }))} />
                </Field>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <Field label="Phone">
                  <input style={inputStyle} value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} />
                </Field>
                <Field label="Email">
                  <input style={inputStyle} type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} />
                </Field>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <Field label="Customer Category">
                  <PremiumSelect value={form.customerCategory} onChange={e => setForm(f => ({ ...f, customerCategory: e.target.value }))} style={inputStyle}>
                    {CUSTOMER_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                  </PremiumSelect>
                </Field>
                <Field label="Region / State">
                  <PremiumSelect value={form.region} onChange={e => setForm(f => ({ ...f, region: e.target.value }))} style={inputStyle}>
                    {regionOptions.map(r => <option key={r} value={r}>{r}</option>)}
                  </PremiumSelect>
                </Field>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: editingLeadId ? '1fr' : '1fr 1fr', gap: 12 }}>
                <Field label="Channel">
                  <PremiumSelect value={form.channel} onChange={e => setForm(f => ({ ...f, channel: e.target.value }))} style={inputStyle}>
                    {CHANNELS.map(c => <option key={c} value={c}>{c}</option>)}
                  </PremiumSelect>
                </Field>
                {!editingLeadId && (
                  <Field label="Status">
                    <PremiumSelect value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value }))} style={inputStyle}>
                      {STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
                    </PremiumSelect>
                  </Field>
                )}
              </div>
              {!editingLeadId && form.status === 'Sample Given' && (
                <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 12 }}>
                  <Field label="Sample Product">
                    <PremiumSelect value={form.sampleProductId} onChange={e => setForm(f => ({ ...f, sampleProductId: e.target.value }))} style={inputStyle}>
                      <option value="">-- Select Product --</option>
                      {products.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                    </PremiumSelect>
                  </Field>
                  <Field label="Qty">
                    <input type="number" min="1" style={inputStyle} value={form.sampleQty} onChange={e => setForm(f => ({ ...f, sampleQty: e.target.value }))} />
                  </Field>
                </div>
              )}
              <Field label="Notes">
                <textarea rows={3} style={{ ...inputStyle, resize: 'vertical' }} value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} placeholder="Context, follow-up plan, objections raised..." />
              </Field>
              <button onClick={editingLeadId ? handleUpdateLead : handleAddLead} disabled={saving} style={{ padding: '12px', borderRadius: 12, border: 'none', background: 'linear-gradient(135deg, #0ea5e9, #6366f1)', color: '#fff', fontSize: '0.85rem', fontWeight: 800, cursor: 'pointer', fontFamily: 'Outfit' }}>
                {saving ? 'Saving...' : editingLeadId ? 'Save Changes' : '+ Add Lead'}
              </button>
            </div>
          )}

          <div style={{ display: 'flex', gap: 10, marginBottom: 16 }}>
            <PremiumSelect value={filterStatus} onChange={e => setFilterStatus(e.target.value)} style={{ ...inputStyle, flex: 1 }}>
              <option value="All">All Statuses</option>
              {STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
            </PremiumSelect>
            <PremiumSelect value={filterCategory} onChange={e => setFilterCategory(e.target.value)} style={{ ...inputStyle, flex: 1 }}>
              <option value="All">All Categories</option>
              {CUSTOMER_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
            </PremiumSelect>
          </div>

          {filteredLeads.length === 0 ? (
            <EmptyStateCard icon={Target} title="No Leads Yet" message="Add your first prospect to start tracking the marketing pipeline." />
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {filteredLeads.map(lead => {
                const sampleProduct = lead.sampleProductId ? products.find(p => p.id === lead.sampleProductId) : null;
                return (
                  <div key={lead.id} className="glass-card" style={{ padding: 14, border: '1px solid hsl(var(--border-color))' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 10 }}>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                          <h4 style={{ fontSize: '0.85rem', fontWeight: 800, margin: 0 }}>{lead.name}</h4>
                          <span style={{ fontSize: '0.58rem', fontWeight: 800, padding: '2px 7px', borderRadius: 6, background: `${STATUS_COLOR[lead.status] || '#0ea5e9'}20`, color: STATUS_COLOR[lead.status] || '#0ea5e9' }}>{lead.status}</span>
                          {lead.clientId && (
                            <span style={{ fontSize: '0.58rem', fontWeight: 800, padding: '2px 7px', borderRadius: 6, background: 'rgba(16,185,129,0.1)', color: '#10b981' }}>Linked Client #{lead.clientId}</span>
                          )}
                        </div>
                        <p style={{ fontSize: '0.68rem', color: 'hsl(var(--text-muted))', margin: '4px 0' }}>
                          {lead.customerCategory} · {lead.region} · via {lead.channel} {lead.contactPerson ? `· ${lead.contactPerson}` : ''}
                        </p>
                        {(lead.phone || lead.email) && (
                          <p style={{ fontSize: '0.65rem', color: 'hsl(var(--text-dim))', margin: '2px 0' }}>{lead.phone} {lead.email && `· ${lead.email}`}</p>
                        )}
                        {lead.notes && <p style={{ fontSize: '0.68rem', color: 'hsl(var(--text-primary))', margin: '4px 0' }}>{lead.notes}</p>}
                        {sampleProduct && (
                          <p style={{ fontSize: '0.65rem', color: 'hsl(var(--text-muted))', margin: '2px 0' }}>Sample given: {sampleProduct.name} ×{lead.sampleQty || 1}</p>
                        )}
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 6, alignItems: 'flex-end', flexShrink: 0 }}>
                        <PremiumSelect value={lead.status} onChange={e => handleStatusChange(lead, e.target.value)} style={{ ...inputStyle, padding: '6px 10px', fontSize: '0.68rem', width: 150 }}>
                          {STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
                        </PremiumSelect>
                        <div style={{ display: 'flex', gap: 6 }}>
                          {lead.status === 'Converted' && !lead.clientId && (
                            <button onClick={() => handleConvertLead(lead)} title="Convert to Client" style={{ padding: '6px 10px', borderRadius: 8, border: 'none', background: 'rgba(16,185,129,0.1)', color: '#10b981', cursor: 'pointer', fontSize: '0.65rem', fontWeight: 800, display: 'flex', alignItems: 'center', gap: 4 }}>
                              <UserCheck size={12} /> Convert
                            </button>
                          )}
                          <button onClick={() => openEdit(lead)} title="Edit" style={{ padding: '6px', borderRadius: 8, border: '1px solid hsl(var(--border-color))', background: 'hsl(var(--bg-dark))', color: 'hsl(var(--text-muted))', cursor: 'pointer', display: 'flex' }}>
                            <Edit3 size={13} />
                          </button>
                          <button onClick={() => handleDeleteLead(lead.id)} title="Delete" style={{ padding: '6px', borderRadius: 8, border: '1px solid rgba(239,68,68,0.2)', background: 'rgba(239,68,68,0.05)', color: '#ef4444', cursor: 'pointer', display: 'flex' }}>
                            <Trash2 size={13} />
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}

      {activeTab === 'potential' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        <div className="glass-card" style={{ padding: 16, border: '1px solid hsl(var(--border-color))' }}>
          <h4 style={{ fontSize: '0.78rem', fontWeight: 800, margin: '0 0 12px 0' }}>Channel Performance</h4>
          {channelRows.length === 0 ? (
            <EmptyStateCard icon={TrendingUp} title="No Leads Yet" message="Add leads with a channel to see which sources convert best." />
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {channelRows.map(row => (
                <div key={row.channel} style={{ padding: '10px 12px', borderRadius: 10, background: 'hsl(var(--bg-dark))', border: '1px solid hsl(var(--border-color))' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                    <span style={{ fontSize: '0.78rem', fontWeight: 700 }}>{row.channel}</span>
                    <span style={{ fontSize: '0.7rem', color: 'hsl(var(--text-muted))' }}>
                      <strong style={{ color: '#10b981' }}>{row.converted}</strong>/{row.total} converted · <strong style={{ color: row.rate >= 50 ? '#10b981' : row.rate >= 20 ? '#f59e0b' : 'hsl(var(--text-muted))' }}>{row.rate}%</strong>
                    </span>
                  </div>
                  <div style={{ height: 6, borderRadius: 999, background: 'hsl(var(--border-color) / 40%)', overflow: 'hidden' }}>
                    <div style={{ height: '100%', width: `${row.rate}%`, borderRadius: 999, background: row.rate >= 50 ? '#10b981' : row.rate >= 20 ? '#f59e0b' : '#6366f1', transition: 'width 0.3s' }} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
        <div className="glass-card" style={{ padding: 16, border: '1px solid hsl(var(--border-color))' }}>
          <h4 style={{ fontSize: '0.78rem', fontWeight: 800, margin: '0 0 12px 0' }}>Coverage by Region</h4>
          {potentialRows.length === 0 ? (
            <EmptyStateCard icon={TrendingUp} title="No Data Yet" message="Register clients or leads to see market coverage by region." />
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {potentialRows.map(row => {
                const isMajor = MAJOR_STATES.includes(row.region);
                return (
                  <div key={row.region} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 12px', borderRadius: 10, background: 'hsl(var(--bg-dark))', border: '1px solid hsl(var(--border-color))' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{ fontSize: '0.78rem', fontWeight: 700 }}>{row.region}</span>
                      {isMajor && (
                        <span style={{ fontSize: '0.55rem', fontWeight: 800, padding: '2px 6px', borderRadius: 5, background: 'rgba(99,102,241,0.12)', color: '#6366f1' }}>Major Customer State</span>
                      )}
                    </div>
                    <div style={{ display: 'flex', gap: 12, fontSize: '0.7rem' }}>
                      <span style={{ color: '#10b981', fontWeight: 700 }}>{row.clients} clients</span>
                      <span style={{ color: '#f59e0b', fontWeight: 700 }}>{row.leads} in pipeline</span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
        </div>
      )}
    </div>
  );
}
