import { useState, useEffect } from 'react';
import { db } from '../utils/db';
import { supabase } from '../utils/supabase';
import { Trash2, Edit3, X, MapPin, Warehouse, Settings, Download, Upload } from 'lucide-react';
import PremiumSelect from './ui/PremiumSelect';
import { t } from '../utils/i18n';
import EmptyStateCard from './EmptyStateCard';
import PremiumLoader from './ui/PremiumLoader';

const ALL_INDIAN_STATES_AND_UTS = [
  'Andhra Pradesh', 'Arunachal Pradesh', 'Assam', 'Bihar', 'Chhattisgarh', 'Goa', 'Gujarat', 'Haryana', 'Himachal Pradesh', 'Jharkhand', 'Karnataka', 'Kerala', 'Madhya Pradesh', 'Maharashtra', 'Manipur', 'Meghalaya', 'Mizoram', 'Nagaland', 'Odisha', 'Punjab', 'Rajasthan', 'Sikkim', 'Tamil Nadu', 'Telangana', 'Tripura', 'Uttar Pradesh', 'Uttarakhand', 'West Bengal',
  'Andaman and Nicobar Islands', 'Chandigarh', 'Dadra and Nagar Haveli and Daman and Diu', 'Delhi', 'Jammu and Kashmir', 'Ladakh', 'Lakshadweep', 'Puducherry'
];

export default function ProMasterDataSubscreen({ lang, profile = {}, authUser }) {
  const [states, setStates] = useState([]);
  const [warehouses, setWarehouses] = useState([]);
  const [gstRates, setGstRates] = useState(profile.gstRates || [5, 12, 18, 28]);
  const [defaultGstRate, setDefaultGstRate] = useState(profile.defaultGstRate !== undefined ? profile.defaultGstRate : 12);
  const [loading, setLoading] = useState(true);
  const [firstLoad, setFirstLoad] = useState(true);

  // Form State - Sales & Clinical Settings
  const [commissionRate, setCommissionRate] = useState(((profile.commissionRate ?? 0.05) * 100).toString());
  const [salesQuota, setSalesQuota] = useState((profile.salesQuota || 500000).toString());
  const [torqueNarrow, setTorqueNarrow] = useState((profile.torqueNarrow ?? 20).toString());
  const [torqueStandard, setTorqueStandard] = useState((profile.torqueStandard ?? 30).toString());
  const [torqueWide, setTorqueWide] = useState((profile.torqueWide ?? 35).toString());
  const [savingSettings, setSavingSettings] = useState(false);

  // Form State - States
  const [newStateName, setNewStateName] = useState('');
  const [editingState, setEditingState] = useState(null);
  const [editStateName, setEditStateName] = useState('');

  // Form State - Warehouses
  const [newWhName, setNewWhName] = useState('');
  const [newWhAddress, setNewWhAddress] = useState('');
  const [editingWh, setEditingWh] = useState(null);
  const [editWhName, setEditWhName] = useState('');
  const [editWhAddress, setEditWhAddress] = useState('');

  // Form State - GST
  const [newGstRate, setNewGstRate] = useState('');
  const [editingGstRate, setEditingGstRate] = useState(null);
  const [editGstRateValue, setEditGstRateValue] = useState('');

  const loadData = async () => {
    if (firstLoad) {
      setLoading(true);
    }
    const dexieStates = await db.b2bStates.toArray();
    setStates(dexieStates || []);
    const dexieWarehouses = await db.b2bWarehouses.toArray();
    setWarehouses(dexieWarehouses || []);
    
    const prefix = authUser?.user?.id ? `${authUser.user.id}_` : '';
    const dbRates = await db.userProfile.get(`${prefix}gstRates`) || await db.userProfile.get('gstRates');
    const dbDefault = await db.userProfile.get(`${prefix}defaultGstRate`) || await db.userProfile.get('defaultGstRate');

    setGstRates(dbRates?.value || profile.gstRates || [5, 12, 18, 28]);
    setDefaultGstRate(dbDefault?.value !== undefined ? dbDefault.value : (profile.defaultGstRate !== undefined ? profile.defaultGstRate : 12));
    setCommissionRate(((profile.commissionRate ?? 0.05) * 100).toString());
    setSalesQuota((profile.salesQuota || 500000).toString());
    setTorqueNarrow((profile.torqueNarrow ?? 20).toString());
    setTorqueStandard((profile.torqueStandard ?? 30).toString());
    setTorqueWide((profile.torqueWide ?? 35).toString());
    setLoading(false);
    setFirstLoad(false);
  };

  // Sync GST rates from Supabase on mount / user login to avoid infinite loop
  useEffect(() => {
    async function syncRates() {
      try {
        const { data: remoteRates, error: remoteErr } = await supabase.from('gst_rates').select('*');
        if (!remoteErr && remoteRates && remoteRates.length > 0) {
          const ratesList = remoteRates.map(r => r.rate).sort((a, b) => a - b);
          const defaultRateObj = remoteRates.find(r => r.is_default);
          const defaultRate = defaultRateObj ? defaultRateObj.rate : ratesList[0];
          
          const prefix = authUser?.user?.id ? `${authUser.user.id}_` : '';
          await db.userProfile.put({ key: `${prefix}gstRates`, value: ratesList });
          await db.userProfile.put({ key: `${prefix}defaultGstRate`, value: defaultRate });
        }
      } catch (e) {
        console.warn('Failed to sync GST rates from Supabase:', e);
      }
    }
    if (authUser?.user?.id) {
      syncRates();
    }
  }, [authUser?.user?.id]);

  useEffect(() => {
    loadData();
  }, [profile]);

  const addedStateNames = states.map(s => s.name.toLowerCase());
  const availableStates = ALL_INDIAN_STATES_AND_UTS.filter(st => !addedStateNames.includes(st.toLowerCase()));

  useEffect(() => {
    if (availableStates.length > 0 && !newStateName) {
      setNewStateName(availableStates[0]);
    }
  }, [states, availableStates, newStateName]);

  // GST CRUD Handlers
  const handleAddGstRate = async (e) => {
    e.preventDefault();
    const rate = parseInt(newGstRate);
    if (isNaN(rate) || rate < 0 || rate > 100) return alert('Invalid rate');
    if (gstRates.includes(rate)) return alert('Exists');
    const updated = [...gstRates, rate].sort((a, b) => a - b);
    const prefix = authUser?.user?.id ? `${authUser.user.id}_` : '';
    await db.userProfile.put({ key: `${prefix}gstRates`, value: updated });
    
    try {
      await supabase.from('gst_rates').insert({ rate, is_default: false });
    } catch (err) {
      console.warn('Failed to insert GST rate into Supabase:', err);
    }
    
    setNewGstRate('');
  };

  const handleUpdateGstRate = async (e) => {
    e.preventDefault();
    const oldRate = editingGstRate;
    const newRate = parseInt(editGstRateValue);
    if (isNaN(newRate) || newRate < 0 || newRate > 100) return alert('Invalid');
    if (gstRates.includes(newRate) && newRate !== oldRate) return alert('Exists');
    const updated = gstRates.map(r => r === oldRate ? newRate : r).sort((a, b) => a - b);
    const prefix = authUser?.user?.id ? `${authUser.user.id}_` : '';
    await db.userProfile.put({ key: `${prefix}gstRates`, value: updated });
    if (defaultGstRate === oldRate) {
      await db.userProfile.put({ key: `${prefix}defaultGstRate`, value: newRate });
    }
    
    try {
      await supabase.from('gst_rates').update({ rate: newRate }).eq('rate', oldRate);
    } catch (err) {
      console.warn('Failed to update GST rate in Supabase:', err);
    }
    
    setEditingGstRate(null);
  };

  const handleDeleteGstRate = async (rateToDelete) => {
    if (await confirm(`Delete GST Rate ${rateToDelete}% permanently?`)) {
      const updated = gstRates.filter(r => r !== rateToDelete);
      const prefix = authUser?.user?.id ? `${authUser.user.id}_` : '';
      await db.userProfile.put({ key: `${prefix}gstRates`, value: updated });
      if (defaultGstRate === rateToDelete && updated.length > 0) {
        await db.userProfile.put({ key: `${prefix}defaultGstRate`, value: updated[0] });
      }
      
      try {
        await supabase.from('gst_rates').delete().eq('rate', rateToDelete);
      } catch (err) {
        console.warn('Failed to delete GST rate from Supabase:', err);
      }
    }
  };

  const handleSetDefaultGstRate = async (rate) => {
    const rateInt = parseInt(rate);
    const prefix = authUser?.user?.id ? `${authUser.user.id}_` : '';
    await db.userProfile.put({ key: `${prefix}defaultGstRate`, value: rateInt });
    
    try {
      await supabase.from('gst_rates').update({ is_default: false }).neq('rate', rateInt);
      await supabase.from('gst_rates').update({ is_default: true }).eq('rate', rateInt);
    } catch (err) {
      console.warn('Failed to update default GST rate in Supabase:', err);
    }
  };

  const handleSaveSalesClinicalSettings = async (e) => {
    e.preventDefault();
    const commissionPct = parseFloat(commissionRate);
    const quota = parseInt(salesQuota);
    const tNarrow = parseInt(torqueNarrow);
    const tStandard = parseInt(torqueStandard);
    const tWide = parseInt(torqueWide);
    if (isNaN(commissionPct) || commissionPct < 0 || commissionPct > 100) return alert('Invalid commission rate');
    if (isNaN(quota) || quota < 0) return alert('Invalid sales quota');
    if ([tNarrow, tStandard, tWide].some(v => isNaN(v) || v < 0)) return alert('Invalid torque value');
    setSavingSettings(true);
    const prefix = authUser?.user?.id ? `${authUser.user.id}_` : '';
    await db.userProfile.bulkPut([
      { key: `${prefix}commissionRate`, value: commissionPct / 100 },
      { key: `${prefix}salesQuota`, value: quota },
      { key: `${prefix}torqueNarrow`, value: tNarrow },
      { key: `${prefix}torqueStandard`, value: tStandard },
      { key: `${prefix}torqueWide`, value: tWide }
    ]);
    setSavingSettings(false);
    alert('Sales & clinical settings saved!');
  };

  // States CRUD
  const handleAddState = async (e) => {
    e.preventDefault();
    const finalState = newStateName || availableStates[0];
    if (!finalState) return alert('All states registered');
    if (states.some(s => s.name.toLowerCase() === finalState.toLowerCase())) return alert('Exists');
    await db.b2bStates.add({ name: finalState });
    setNewStateName('');
    loadData();
  };

  const handleUpdateState = async (e) => {
    e.preventDefault();
    if (!editingState || !editStateName.trim()) return;
    if (states.some(s => s.id !== editingState.id && s.name.toLowerCase() === editStateName.trim().toLowerCase())) return alert('Exists');
    await db.b2bStates.update(editingState.id, { name: editStateName.trim() });
    setEditingState(null);
    loadData();
  };

  const handleDeleteState = async (id, name) => {
    if (await confirm(`Delete State "${name}" permanently?`)) {
      await db.b2bStates.delete(id);
      loadData();
    }
  };

  // Warehouses CRUD
  const handleAddWarehouse = async (e) => {
    e.preventDefault();
    if (!newWhName.trim()) return;
    if (warehouses.some(w => w.name.toLowerCase() === newWhName.trim().toLowerCase())) return alert('Exists');
    await db.b2bWarehouses.add({ name: newWhName.trim(), address: newWhAddress.trim() });
    setNewWhName(''); setNewWhAddress('');
    loadData();
  };

  const handleUpdateWarehouse = async (e) => {
    e.preventDefault();
    if (!editingWh || !editWhName.trim()) return;
    await db.b2bWarehouses.update(editingWh.id, { name: editWhName.trim(), address: editWhAddress.trim() });
    setEditingWh(null);
    loadData();
  };

  const handleDeleteWarehouse = async (id, name) => {
    if (await confirm(`Delete Warehouse "${name}" permanently?`)) {
      await db.b2bWarehouses.delete(id);
      loadData();
    }
  };

  const handleExport = () => {
    const data = {
      states, warehouses, gstRates, defaultGstRate,
      commissionRate: parseFloat(commissionRate) / 100,
      salesQuota: parseInt(salesQuota),
      torqueNarrow: parseInt(torqueNarrow),
      torqueStandard: parseInt(torqueStandard),
      torqueWide: parseInt(torqueWide)
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'simple_implant_master_settings.json';
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImport = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const data = JSON.parse(event.target.result);
        if (data.states) {
          await db.b2bStates.clear();
          await db.b2bStates.bulkAdd(data.states.map(s => ({ name: s.name })));
        }
        if (data.warehouses) {
          await db.b2bWarehouses.clear();
          await db.b2bWarehouses.bulkAdd(data.warehouses.map(w => ({ name: w.name, address: w.address })));
        }
        const prefix = authUser?.user?.id ? `${authUser.user.id}_` : '';
        if (data.gstRates) await db.userProfile.put({ key: `${prefix}gstRates`, value: data.gstRates });
        if (data.defaultGstRate !== undefined) await db.userProfile.put({ key: `${prefix}defaultGstRate`, value: data.defaultGstRate });
        if (data.commissionRate !== undefined) await db.userProfile.put({ key: `${prefix}commissionRate`, value: data.commissionRate });
        if (data.salesQuota !== undefined) await db.userProfile.put({ key: `${prefix}salesQuota`, value: data.salesQuota });
        if (data.torqueNarrow !== undefined) await db.userProfile.put({ key: `${prefix}torqueNarrow`, value: data.torqueNarrow });
        if (data.torqueStandard !== undefined) await db.userProfile.put({ key: `${prefix}torqueStandard`, value: data.torqueStandard });
        if (data.torqueWide !== undefined) await db.userProfile.put({ key: `${prefix}torqueWide`, value: data.torqueWide });
        loadData();
        alert('Settings imported successfully!');
      } catch (err) {
        alert('Invalid backup file');
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  return (
    <div className="animate-fade-in" style={{ paddingBottom: '30px', display: 'flex', flexDirection: 'column', gap: '24px' }}>
      
      {/* Component Specific Style Overrides */}
      <style>{`
        .master-settings-grid {
          display: grid;
          grid-template-columns: 1fr;
          gap: 20px;
          width: 100%;
          align-items: stretch;
        }
        @media (min-width: 992px) {
          .master-settings-grid {
            grid-template-columns: 1fr 1fr;
            gap: 24px;
          }
        }
        .settings-card {
          background: rgba(255, 255, 255, 0.85);
          backdrop-filter: blur(20px);
          -webkit-backdrop-filter: blur(20px);
          border: 1px solid rgba(14, 165, 233, 0.14);
          border-radius: 20px;
          padding: 24px;
          box-shadow: 0 10px 25px -5px rgba(14, 165, 233, 0.03), 0 4px 10px -3px rgba(0, 0, 0, 0.01);
          display: flex;
          flex-direction: column;
          box-sizing: border-box;
          transition: all 0.25s cubic-bezier(0.16, 1, 0.3, 1);
        }
        .settings-card:hover {
          transform: translateY(-2px);
          border-color: rgba(14, 165, 233, 0.28);
          box-shadow: 0 16px 36px -8px rgba(14, 165, 233, 0.08), 0 4px 12px -2px rgba(0, 0, 0, 0.01);
        }
        .settings-card-title {
          font-size: 0.95rem;
          color: hsl(var(--text-primary));
          display: flex;
          align-items: center;
          gap: 8px;
          margin-bottom: 20px;
          font-family: 'Outfit';
          font-weight: 800;
          letter-spacing: -0.01em;
        }
        .settings-card-title svg {
          color: hsl(var(--primary));
        }
        .settings-list-container {
          display: flex;
          flex-direction: column;
          gap: 8px;
          max-height: 240px;
          overflow-y: auto;
          padding-right: 4px;
        }
        /* Custom scrollbar style */
        .settings-list-container::-webkit-scrollbar {
          width: 5px;
        }
        .settings-list-container::-webkit-scrollbar-track {
          background: rgba(14, 165, 233, 0.02);
          border-radius: 10px;
        }
        .settings-list-container::-webkit-scrollbar-thumb {
          background: rgba(14, 165, 233, 0.15);
          border-radius: 10px;
        }
        .settings-list-container::-webkit-scrollbar-thumb:hover {
          background: rgba(14, 165, 233, 0.3);
        }
        .settings-list-item {
          display: flex;
          justify-content: space-between;
          align-items: center;
          background: rgba(240, 249, 255, 0.45);
          border: 1px solid rgba(14, 165, 233, 0.08);
          padding: 10px 14px;
          border-radius: 12px;
          font-size: 0.76rem;
          transition: all 0.2s ease;
        }
        .settings-list-item:hover {
          background: rgba(240, 249, 255, 0.85);
          border-color: rgba(14, 165, 233, 0.18);
        }
      `}</style>
      
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div style={{ padding: '8px', borderRadius: '10px', background: 'hsl(var(--primary-glow))', color: 'hsl(var(--primary))' }}>
            <Settings size={18} />
          </div>
          <h2 style={{ fontSize: '1.1rem', fontWeight: '800', color: 'hsl(var(--primary))', fontFamily: 'Outfit', margin: 0 }}>
            {t('navMaster', lang)}
          </h2>
        </div>
        <div style={{ display: 'flex', gap: '10px' }}>
          <button onClick={handleExport} style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 14px', fontSize: '0.75rem', borderRadius: '10px', fontFamily: 'Outfit', fontWeight: 'bold', background: 'transparent', border: '1.5px solid hsl(var(--border-color))', color: 'hsl(var(--text-primary))', cursor: 'pointer', transition: 'all 0.2s' }}>
            <Download size={14} /> Backup Settings
          </button>
          <label style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 14px', fontSize: '0.75rem', borderRadius: '10px', fontFamily: 'Outfit', fontWeight: 'bold', background: 'transparent', border: '1.5px solid hsl(var(--border-color))', color: 'hsl(var(--text-primary))', cursor: 'pointer', margin: 0, transition: 'all 0.2s' }}>
            <Upload size={14} /> Restore Settings
            <input type="file" accept=".json" onChange={handleImport} style={{ display: 'none' }} />
          </label>
        </div>
      </div>

      {loading ? (
        <PremiumLoader text="Loading Master Data..." />
      ) : (
        <div className="master-settings-grid">
          
          {/* === Card 1: State Directory === */}
          <div className="settings-card">
            <h3 className="settings-card-title">
              <MapPin size={16} /> {t('stateList', lang)}
            </h3>

            <form onSubmit={handleAddState} style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
              <PremiumSelect
                required value={newStateName} onChange={(e) => setNewStateName(e.target.value)}
                style={{ flex: 1, padding: '10px 14px', fontSize: '0.78rem', borderRadius: '10px', border: '1.5px solid hsl(var(--border-color))', outline: 'none', background: 'transparent', color: 'hsl(var(--text-primary))' }}
              >
                {availableStates.length === 0 && <option value="">No remaining States/UTs to add</option>}
                {availableStates.map((st, idx) => (
                  <option key={idx} value={st}>{st}</option>
                ))}
              </PremiumSelect>
              <button type="submit" disabled={availableStates.length === 0} className="btn-primary" style={{ padding: '10px 18px', borderRadius: '10px', border: 'none', fontSize: '0.75rem', fontWeight: 'bold', cursor: availableStates.length === 0 ? 'not-allowed' : 'pointer', fontFamily: 'Outfit' }}>
                {t('addState', lang)}
              </button>
            </form>

            <div className="settings-list-container">
              {states.length === 0 ? (
                <EmptyStateCard 
                  icon={MapPin} 
                  title="No States Registered" 
                  message="No regional states have been registered in the system yet." 
                />
              ) : (
                states.map(s => (
                  <div key={s.id} className="settings-list-item">
                    <span style={{ fontWeight: 'bold', color: 'hsl(var(--text-primary))' }}>{s.name}</span>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <button
                        onClick={() => { setEditingState(s); setEditStateName(s.name); }}
                        style={{ background: 'none', border: 'none', color: 'hsl(var(--primary))', cursor: 'pointer' }}
                      >
                        <Edit3 size={12} />
                      </button>
                      <button
                        onClick={() => handleDeleteState(s.id, s.name)}
                        style={{ background: 'none', border: 'none', color: 'hsl(var(--color-hyper))', cursor: 'pointer' }}
                      >
                        <Trash2 size={12} />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* === Card 2: GST Rate Manager === */}
          <div className="settings-card">
            <h3 className="settings-card-title">
              <span style={{ fontSize: '1.1rem', marginRight: '2px', color: 'hsl(var(--primary))', display: 'inline-block' }}>%</span> GST Rate Manager
            </h3>

            <form onSubmit={handleAddGstRate} style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
              <input
                type="number" required placeholder="GST Percentage (e.g. 18)" value={newGstRate} onChange={(e) => setNewGstRate(e.target.value)} min="0" max="100"
                style={{ flex: 1, padding: '10px 14px', fontSize: '0.78rem', borderRadius: '10px', border: '1.5px solid hsl(var(--border-color))', outline: 'none', background: 'transparent', color: 'hsl(var(--text-primary))' }}
              />
              <button type="submit" className="btn-primary" style={{ padding: '10px 18px', borderRadius: '10px', border: 'none', fontSize: '0.75rem', fontWeight: 'bold', cursor: 'pointer', fontFamily: 'Outfit' }}>
                Add GST Rate
              </button>
            </form>

            <div className="settings-list-container">
              {gstRates.map((rate, idx) => {
                const isDefault = rate === defaultGstRate;
                return (
                  <div key={idx} className="settings-list-item">
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{ fontWeight: 'bold', color: 'hsl(var(--text-primary))' }}>{rate}%</span>
                      {isDefault ? (
                        <span style={{ fontSize: '0.58rem', background: 'hsl(var(--secondary) / 10%)', color: 'hsl(var(--secondary))', padding: '2px 8px', borderRadius: '6px', fontWeight: '800', letterSpacing: '0.03em' }}>DEFAULT</span>
                      ) : (
                        <button
                          onClick={() => handleSetDefaultGstRate(rate)}
                          style={{ border: 'none', background: 'none', color: 'hsl(var(--text-muted))', fontSize: '0.58rem', cursor: 'pointer', textDecoration: 'underline', fontWeight: 600 }}
                        >
                          Set Default
                        </button>
                      )}
                    </div>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <button
                        onClick={() => { setEditingGstRate(rate); setEditGstRateValue(rate.toString()); }}
                        style={{ background: 'none', border: 'none', color: 'hsl(var(--primary))', cursor: 'pointer' }}
                      >
                        <Edit3 size={12} />
                      </button>
                      <button
                        onClick={() => handleDeleteGstRate(rate)}
                        style={{ background: 'none', border: 'none', color: 'hsl(var(--color-hyper))', cursor: 'pointer' }}
                      >
                        <Trash2 size={12} />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* === Card 3: Sales & Clinical Settings === */}
          <div className="settings-card">
            <h3 className="settings-card-title">
              <span style={{ fontSize: '1.1rem', marginRight: '2px', color: 'hsl(var(--primary))' }}>⚙️</span> Sales & Clinical Settings
            </h3>
            <form onSubmit={handleSaveSalesClinicalSettings} style={{ display: 'flex', flexDirection: 'column', gap: '16px', height: '100%', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                  <div style={{ flex: '1 1 160px' }}>
                    <label style={{ fontSize: '0.68rem', fontWeight: 'bold', color: 'hsl(var(--text-dim))', display: 'block', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.03em' }}>Sales Commission Rate (%)</label>
                    <input type="number" required min="0" max="100" step="0.1" value={commissionRate} onChange={(e) => setCommissionRate(e.target.value)}
                      style={{ width: '100%', padding: '10px 14px', fontSize: '0.78rem', borderRadius: '10px', border: '1.5px solid hsl(var(--border-color))', outline: 'none', background: 'transparent', color: 'hsl(var(--text-primary))', boxSizing: 'border-box' }} />
                  </div>
                  <div style={{ flex: '1 1 160px' }}>
                    <label style={{ fontSize: '0.68rem', fontWeight: 'bold', color: 'hsl(var(--text-dim))', display: 'block', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.03em' }}>Sales Quota Target (₹)</label>
                    <input type="number" required min="0" value={salesQuota} onChange={(e) => setSalesQuota(e.target.value)}
                      style={{ width: '100%', padding: '10px 14px', fontSize: '0.78rem', borderRadius: '10px', border: '1.5px solid hsl(var(--border-color))', outline: 'none', background: 'transparent', color: 'hsl(var(--text-primary))', boxSizing: 'border-box' }} />
                  </div>
                </div>
                <div>
                  <label style={{ fontSize: '0.68rem', fontWeight: 'bold', color: 'hsl(var(--text-dim))', display: 'block', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.03em' }}>Recommended Implant Torque (Ncm)</label>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px' }}>
                    <div>
                      <input type="number" required min="0" placeholder="Narrow" value={torqueNarrow} onChange={(e) => setTorqueNarrow(e.target.value)}
                        style={{ width: '100%', padding: '10px 14px', fontSize: '0.78rem', borderRadius: '10px', border: '1.5px solid hsl(var(--border-color))', outline: 'none', background: 'transparent', color: 'hsl(var(--text-primary))', boxSizing: 'border-box' }} />
                      <span style={{ fontSize: '0.6rem', color: 'hsl(var(--text-dim))', display: 'block', marginTop: '4px', textAlign: 'center', fontWeight: 600 }}>Narrow (3.3mm)</span>
                    </div>
                    <div>
                      <input type="number" required min="0" placeholder="Standard" value={torqueStandard} onChange={(e) => setTorqueStandard(e.target.value)}
                        style={{ width: '100%', padding: '10px 14px', fontSize: '0.78rem', borderRadius: '10px', border: '1.5px solid hsl(var(--border-color))', outline: 'none', background: 'transparent', color: 'hsl(var(--text-primary))', boxSizing: 'border-box' }} />
                      <span style={{ fontSize: '0.6rem', color: 'hsl(var(--text-dim))', display: 'block', marginTop: '4px', textAlign: 'center', fontWeight: 600 }}>Standard (4.0mm)</span>
                    </div>
                    <div>
                      <input type="number" required min="0" placeholder="Wide" value={torqueWide} onChange={(e) => setTorqueWide(e.target.value)}
                        style={{ width: '100%', padding: '10px 14px', fontSize: '0.78rem', borderRadius: '10px', border: '1.5px solid hsl(var(--border-color))', outline: 'none', background: 'transparent', color: 'hsl(var(--text-primary))', boxSizing: 'border-box' }} />
                      <span style={{ fontSize: '0.6rem', color: 'hsl(var(--text-dim))', display: 'block', marginTop: '4px', textAlign: 'center', fontWeight: 600 }}>Wide (5.0mm)</span>
                    </div>
                  </div>
                </div>
              </div>
              <button type="submit" disabled={savingSettings} className="btn-primary" style={{ padding: '12px', borderRadius: '10px', border: 'none', fontSize: '0.78rem', fontWeight: 'bold', cursor: savingSettings ? 'not-allowed' : 'pointer', fontFamily: 'Outfit', opacity: savingSettings ? 0.6 : 1, marginTop: '20px', width: '100%' }}>
                {savingSettings ? 'Saving...' : 'Save Settings'}
              </button>
            </form>
          </div>

          {/* === Card 4: Warehouse List === */}
          <div className="settings-card">
            <h3 className="settings-card-title">
              <Warehouse size={16} /> {t('warehouseList', lang)}
            </h3>

            <form onSubmit={handleAddWarehouse} style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '16px' }}>
              <div style={{ display: 'flex', gap: '8px' }}>
                <input
                  type="text" required placeholder="Warehouse name (e.g. Chennai Hub)" value={newWhName} onChange={(e) => setNewWhName(e.target.value)}
                  style={{ flex: 1, padding: '10px 14px', fontSize: '0.78rem', borderRadius: '10px', border: '1.5px solid hsl(var(--border-color))', outline: 'none', background: 'transparent', color: 'hsl(var(--text-primary))' }}
                />
                <input
                  type="text" placeholder="Address (Optional)" value={newWhAddress} onChange={(e) => setNewWhAddress(e.target.value)}
                  style={{ flex: 1, padding: '10px 14px', fontSize: '0.78rem', borderRadius: '10px', border: '1.5px solid hsl(var(--border-color))', outline: 'none', background: 'transparent', color: 'hsl(var(--text-primary))' }}
                />
              </div>
              <button type="submit" className="btn-primary" style={{ padding: '10px', borderRadius: '10px', border: 'none', fontSize: '0.78rem', fontWeight: 'bold', cursor: 'pointer', fontFamily: 'Outfit', width: '100%' }}>
                {t('addWarehouse', lang)}
              </button>
            </form>

            <div className="settings-list-container">
              {warehouses.length === 0 ? (
                <EmptyStateCard 
                  icon={Warehouse} 
                  title="No Warehouses Registered" 
                  message="No distribution warehouse hubs have been registered in the system yet." 
                />
              ) : (
                warehouses.map(w => (
                  <div key={w.id} className="settings-list-item">
                    <div>
                      <div style={{ fontWeight: 'bold', color: 'hsl(var(--text-primary))' }}>{w.name}</div>
                      {w.address && <div style={{ fontSize: '0.62rem', color: 'hsl(var(--text-muted))' }}>{w.address}</div>}
                    </div>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <button
                        onClick={() => { setEditingWh(w); setEditWhName(w.name); setEditWhAddress(w.address || ''); }}
                        style={{ background: 'none', border: 'none', color: 'hsl(var(--primary))', cursor: 'pointer' }}
                      >
                        <Edit3 size={12} />
                      </button>
                      <button
                        onClick={() => handleDeleteWarehouse(w.id, w.name)}
                        style={{ background: 'none', border: 'none', color: 'hsl(var(--color-hyper))', cursor: 'pointer' }}
                      >
                        <Trash2 size={12} />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

        </div>
      )}

      {editingState && (
        <div className="modal-overlay-container" style={{ zIndex: 9999, display: 'flex', alignItems: 'flex-start', justifyContent: 'center', paddingTop: '10vh' }}>
          <div className="modal-content-card animate-fade-in" style={{ minHeight: 'auto', height: 'auto', flex: 'none', maxWidth: '420px', width: '100%', borderRadius: '24px', display: 'flex', flexDirection: 'column', gap: '16px', justifyContent: 'flex-start' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flex: 'none' }}>
              <h3 style={{ fontSize: '0.9rem', fontWeight: 'bold', fontFamily: 'Outfit' }}>✏️ Edit State</h3>
              <button onClick={() => setEditingState(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'hsl(var(--text-muted))' }}>
                <X size={16} />
              </button>
            </div>
            <form onSubmit={handleUpdateState} style={{ display: 'flex', flexDirection: 'column', gap: '12px', flex: 'none', height: 'auto', justifyContent: 'flex-start' }}>
              <div style={{ flex: 'none', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <label style={{ fontSize: '0.68rem', fontWeight: 'bold', display: 'block', marginBottom: '2px' }}>{t('stateName', lang)}</label>
                <input type="text" required value={editStateName} onChange={(e) => setEditStateName(e.target.value)}
                  style={{ width: '100%', padding: '8px', fontSize: '0.78rem', borderRadius: '6px', border: '1px solid hsl(var(--border-color))', background: 'transparent', color: 'hsl(var(--text-primary))' }} />
              </div>
              <button type="submit" className="btn-primary" style={{ padding: '10px', borderRadius: '8px', border: 'none', fontWeight: 'bold', cursor: 'pointer', marginTop: '6px' }}>
                Save State Name
              </button>
            </form>
          </div>
        </div>
      )}

      {editingWh && (
        <div className="modal-overlay-container" style={{ zIndex: 9999, display: 'flex', alignItems: 'flex-start', justifyContent: 'center', paddingTop: '10vh' }}>
          <div className="modal-content-card animate-fade-in" style={{ minHeight: 'auto', height: 'auto', flex: 'none', maxWidth: '420px', width: '100%', borderRadius: '24px', display: 'flex', flexDirection: 'column', gap: '16px', justifyContent: 'flex-start' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flex: 'none' }}>
              <h3 style={{ fontSize: '0.9rem', fontWeight: 'bold', fontFamily: 'Outfit' }}>✏️ Edit Warehouse</h3>
              <button onClick={() => setEditingWh(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'hsl(var(--text-muted))' }}>
                <X size={16} />
              </button>
            </div>
            <form onSubmit={handleUpdateWarehouse} style={{ display: 'flex', flexDirection: 'column', gap: '12px', flex: 'none', height: 'auto', justifyContent: 'flex-start' }}>
              <div style={{ flex: 'none', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <label style={{ fontSize: '0.68rem', fontWeight: 'bold', display: 'block', marginBottom: '2px' }}>{t('warehouseName', lang)}</label>
                <input type="text" required value={editWhName} onChange={(e) => setEditWhName(e.target.value)}
                  style={{ width: '100%', padding: '8px', fontSize: '0.78rem', borderRadius: '6px', border: '1px solid hsl(var(--border-color))', background: 'transparent', color: 'hsl(var(--text-primary))' }} />
              </div>
              <div style={{ flex: 'none', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <label style={{ fontSize: '0.68rem', fontWeight: 'bold', display: 'block', marginBottom: '2px' }}>{t('warehouseAddress', lang)}</label>
                <input type="text" value={editWhAddress} onChange={(e) => setEditWhAddress(e.target.value)}
                  style={{ width: '100%', padding: '8px', fontSize: '0.78rem', borderRadius: '6px', border: '1px solid hsl(var(--border-color))', background: 'transparent', color: 'hsl(var(--text-primary))' }} />
              </div>
              <button type="submit" className="btn-primary" style={{ padding: '10px', borderRadius: '8px', border: 'none', fontWeight: 'bold', cursor: 'pointer', marginTop: '6px' }}>
                Save Warehouse Details
              </button>
            </form>
          </div>
        </div>
      )}

      {editingGstRate !== null && (
        <div className="modal-overlay-container" style={{ zIndex: 9999, display: 'flex', alignItems: 'flex-start', justifyContent: 'center', paddingTop: '10vh' }}>
          <div className="modal-content-card animate-fade-in" style={{ minHeight: 'auto', height: 'auto', flex: 'none', maxWidth: '420px', width: '100%', borderRadius: '24px', display: 'flex', flexDirection: 'column', gap: '16px', justifyContent: 'flex-start' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flex: 'none' }}>
              <h3 style={{ fontSize: '0.9rem', fontWeight: 'bold', fontFamily: 'Outfit' }}>✏️ Edit GST Rate</h3>
              <button onClick={() => setEditingGstRate(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'hsl(var(--text-muted))' }}>
                <X size={16} />
              </button>
            </div>
            <form onSubmit={handleUpdateGstRate} style={{ display: 'flex', flexDirection: 'column', gap: '12px', flex: 'none', height: 'auto', justifyContent: 'flex-start' }}>
              <div style={{ flex: 'none', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <label style={{ fontSize: '0.68rem', fontWeight: 'bold', display: 'block', marginBottom: '2px' }}>GST Rate (%)</label>
                <input type="number" required value={editGstRateValue} onChange={(e) => setEditGstRateValue(e.target.value)} min="0" max="100"
                  style={{ width: '100%', padding: '8px', fontSize: '0.78rem', borderRadius: '6px', border: '1px solid hsl(var(--border-color))', background: 'transparent', color: 'hsl(var(--text-primary))' }} />
              </div>
              <button type="submit" className="btn-primary" style={{ padding: '10px', borderRadius: '8px', border: 'none', fontWeight: 'bold', cursor: 'pointer', marginTop: '6px' }}>
                Save GST Rate Value
              </button>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
