import { useState, useEffect } from 'react';
import { db } from '../utils/db';
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
  const [defaultGstRate, setDefaultGstRate] = useState(profile.defaultGstRate || 12);
  const [loading, setLoading] = useState(true);

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
    setLoading(true);
    const dexieStates = await db.b2bStates.toArray();
    setStates(dexieStates || []);
    const dexieWarehouses = await db.b2bWarehouses.toArray();
    setWarehouses(dexieWarehouses || []);
    
    setGstRates(profile.gstRates || [5, 12, 18, 28]);
    setDefaultGstRate(profile.defaultGstRate || 12);
    setLoading(false);
  };

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
    setNewGstRate('');
    loadData();
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
    setEditingGstRate(null);
    loadData();
  };

  const handleDeleteGstRate = async (rateToDelete) => {
    if (window.confirm(`Delete GST Rate ${rateToDelete}% permanently?`)) {
      const updated = gstRates.filter(r => r !== rateToDelete);
      const prefix = authUser?.user?.id ? `${authUser.user.id}_` : '';
      await db.userProfile.put({ key: `${prefix}gstRates`, value: updated });
      if (defaultGstRate === rateToDelete && updated.length > 0) {
        await db.userProfile.put({ key: `${prefix}defaultGstRate`, value: updated[0] });
      }
      loadData();
    }
  };

  const handleSetDefaultGstRate = async (rate) => {
    const rateInt = parseInt(rate);
    const prefix = authUser?.user?.id ? `${authUser.user.id}_` : '';
    await db.userProfile.put({ key: `${prefix}defaultGstRate`, value: rateInt });
    loadData();
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
    if (window.confirm(`Delete State "${name}" permanently?`)) {
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
    if (window.confirm(`Delete Warehouse "${name}" permanently?`)) {
      await db.b2bWarehouses.delete(id);
      loadData();
    }
  };

  const handleExport = () => {
    const data = { states, warehouses, gstRates, defaultGstRate };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'lal_dental_master_settings.json';
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
        if (data.defaultGstRate) await db.userProfile.put({ key: `${prefix}defaultGstRate`, value: data.defaultGstRate });
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
    <div className="animate-fade-in" style={{ paddingBottom: '30px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
      
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
          <button onClick={handleExport} style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '6px 12px', fontSize: '0.75rem', borderRadius: '8px', fontFamily: 'Outfit', fontWeight: 'bold', background: 'transparent', border: '1px solid hsl(var(--border-color))', color: 'hsl(var(--text-primary))', cursor: 'pointer' }}>
            <Download size={14} /> Backup Settings
          </button>
          <label style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '6px 12px', fontSize: '0.75rem', borderRadius: '8px', fontFamily: 'Outfit', fontWeight: 'bold', background: 'transparent', border: '1px solid hsl(var(--border-color))', color: 'hsl(var(--text-primary))', cursor: 'pointer', margin: 0 }}>
            <Upload size={14} /> Restore Settings
            <input type="file" accept=".json" onChange={handleImport} style={{ display: 'none' }} />
          </label>
        </div>
      </div>

      {loading ? (
        <PremiumLoader text="Loading Master Data..." />
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          
          <div style={{ display: 'flex', flexDirection: 'row', flexWrap: 'wrap', gap: '20px', alignItems: 'stretch', width: '100%' }}>
            
            <div style={{ flex: '1 1 280px', minWidth: '280px', boxSizing: 'border-box' }}>
              <div className="glass-card" style={{ padding: '16px', border: '1px solid hsl(var(--border-color))', height: '100%' }}>
                <h3 style={{ fontSize: '0.92rem', color: 'hsl(var(--text-primary))', display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '14px', fontFamily: 'Outfit', fontWeight: '800' }}>
                <MapPin size={16} /> {t('stateList', lang)}
              </h3>

              <form onSubmit={handleAddState} style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
                <PremiumSelect
                  required value={newStateName} onChange={(e) => setNewStateName(e.target.value)}
                  style={{ flex: 1, padding: '8px 12px', fontSize: '0.78rem', borderRadius: '8px', border: '1px solid hsl(var(--border-color))', outline: 'none', background: 'transparent', color: 'hsl(var(--text-primary))' }}
                >
                  {availableStates.length === 0 && <option value="">No remaining States/UTs to add</option>}
                  {availableStates.map((st, idx) => (
                    <option key={idx} value={st}>{st}</option>
                  ))}
                </PremiumSelect>
                <button type="submit" disabled={availableStates.length === 0} className="btn-primary" style={{ padding: '8px 16px', borderRadius: '8px', border: 'none', fontSize: '0.75rem', fontWeight: 'bold', cursor: availableStates.length === 0 ? 'not-allowed' : 'pointer', fontFamily: 'Outfit' }}>
                  {t('addState', lang)}
                </button>
              </form>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                {states.length === 0 ? (
                  <EmptyStateCard 
                    icon={MapPin} 
                    title="No States Registered" 
                    message="No regional states have been registered in the system yet." 
                  />
                ) : (
                  states.map(s => (
                    <div key={s.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'hsl(var(--border-color) / 10%)', padding: '6px 12px', borderRadius: '8px', fontSize: '0.75rem' }}>
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
            </div>

            <div style={{ flex: '1 1 280px', minWidth: '280px', boxSizing: 'border-box' }}>
              <div className="glass-card" style={{ padding: '16px', border: '1px solid hsl(var(--border-color))', height: '100%' }}>
                <h3 style={{ fontSize: '0.92rem', color: 'hsl(var(--text-primary))', display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '14px', fontFamily: 'Outfit', fontWeight: '800' }}>
                <span style={{ fontSize: '1.1rem', marginRight: '2px' }}>%</span> GST Rate Manager
              </h3>

              <form onSubmit={handleAddGstRate} style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
                <input
                  type="number" required placeholder="GST Percentage (e.g. 18)" value={newGstRate} onChange={(e) => setNewGstRate(e.target.value)} min="0" max="100"
                  style={{ flex: 1, padding: '8px 12px', fontSize: '0.78rem', borderRadius: '8px', border: '1px solid hsl(var(--border-color))', outline: 'none', background: 'transparent', color: 'hsl(var(--text-primary))' }}
                />
                <button type="submit" className="btn-primary" style={{ padding: '8px 16px', borderRadius: '8px', border: 'none', fontSize: '0.75rem', fontWeight: 'bold', cursor: 'pointer', fontFamily: 'Outfit' }}>
                  Add GST Rate
                </button>
              </form>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {gstRates.map((rate, idx) => {
                  const isDefault = rate === defaultGstRate;
                  return (
                    <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'hsl(var(--border-color) / 10%)', padding: '8px 12px', borderRadius: '8px', fontSize: '0.75rem' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{ fontWeight: 'bold', color: 'hsl(var(--text-primary))' }}>{rate}%</span>
                        {isDefault ? (
                          <span style={{ fontSize: '0.58rem', background: 'hsl(var(--secondary) / 10%)', color: 'hsl(var(--secondary))', padding: '1px 6px', borderRadius: '4px', fontWeight: 'bold' }}>DEFAULT</span>
                        ) : (
                          <button
                            onClick={() => handleSetDefaultGstRate(rate)}
                            style={{ border: 'none', background: 'none', color: 'hsl(var(--text-muted))', fontSize: '0.58rem', cursor: 'pointer', textDecoration: 'underline' }}
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
            </div>

          </div>

          <div className="glass-card" style={{ padding: '16px', border: '1px solid hsl(var(--border-color))' }}>
            <h3 style={{ fontSize: '0.92rem', color: 'hsl(var(--text-primary))', display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '14px', fontFamily: 'Outfit', fontWeight: '800' }}>
              <Warehouse size={16} /> {t('warehouseList', lang)}
            </h3>

            <form onSubmit={handleAddWarehouse} style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '16px' }}>
              <div style={{ display: 'flex', gap: '8px' }}>
                <input
                  type="text" required placeholder="Warehouse name (e.g. Chennai Hub)" value={newWhName} onChange={(e) => setNewWhName(e.target.value)}
                  style={{ flex: 1, padding: '8px 12px', fontSize: '0.78rem', borderRadius: '8px', border: '1px solid hsl(var(--border-color))', outline: 'none', background: 'transparent', color: 'hsl(var(--text-primary))' }}
                />
                <input
                  type="text" placeholder="Address (Optional)" value={newWhAddress} onChange={(e) => setNewWhAddress(e.target.value)}
                  style={{ flex: 1, padding: '8px 12px', fontSize: '0.78rem', borderRadius: '8px', border: '1px solid hsl(var(--border-color))', outline: 'none', background: 'transparent', color: 'hsl(var(--text-primary))' }}
                />
              </div>
              <button type="submit" className="btn-primary" style={{ padding: '10px', borderRadius: '8px', border: 'none', fontSize: '0.78rem', fontWeight: 'bold', cursor: 'pointer', fontFamily: 'Outfit' }}>
                {t('addWarehouse', lang)}
              </button>
            </form>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {warehouses.length === 0 ? (
                <EmptyStateCard 
                  icon={Warehouse} 
                  title="No Warehouses Registered" 
                  message="No distribution warehouse hubs have been registered in the system yet." 
                />
              ) : (
                warehouses.map(w => (
                  <div key={w.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'hsl(var(--border-color) / 10%)', padding: '8px 12px', borderRadius: '8px', fontSize: '0.75rem' }}>
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
        <div className="modal-overlay-container" style={{ zIndex: 9999 }}>
          <div className="modal-content-card animate-fade-in">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ fontSize: '0.9rem', fontWeight: 'bold', fontFamily: 'Outfit' }}>✏️ Edit State</h3>
              <button onClick={() => setEditingState(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'hsl(var(--text-muted))' }}>
                <X size={16} />
              </button>
            </div>
            <form onSubmit={handleUpdateState} style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <div>
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
        <div className="modal-overlay-container" style={{ zIndex: 9999 }}>
          <div className="modal-content-card animate-fade-in">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ fontSize: '0.9rem', fontWeight: 'bold', fontFamily: 'Outfit' }}>✏️ Edit Warehouse</h3>
              <button onClick={() => setEditingWh(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'hsl(var(--text-muted))' }}>
                <X size={16} />
              </button>
            </div>
            <form onSubmit={handleUpdateWarehouse} style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <div>
                <label style={{ fontSize: '0.68rem', fontWeight: 'bold', display: 'block', marginBottom: '2px' }}>{t('warehouseName', lang)}</label>
                <input type="text" required value={editWhName} onChange={(e) => setEditWhName(e.target.value)}
                  style={{ width: '100%', padding: '8px', fontSize: '0.78rem', borderRadius: '6px', border: '1px solid hsl(var(--border-color))', background: 'transparent', color: 'hsl(var(--text-primary))' }} />
              </div>
              <div>
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
        <div className="modal-overlay-container" style={{ zIndex: 9999 }}>
          <div className="modal-content-card animate-fade-in">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ fontSize: '0.9rem', fontWeight: 'bold', fontFamily: 'Outfit' }}>✏️ Edit GST Rate</h3>
              <button onClick={() => setEditingGstRate(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'hsl(var(--text-muted))' }}>
                <X size={16} />
              </button>
            </div>
            <form onSubmit={handleUpdateGstRate} style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <div>
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
