import { useState, useEffect } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../utils/db';
import { Trash2, Edit3, X, MapPin, Warehouse, Settings } from 'lucide-react';
import { t } from '../utils/i18n';
import EmptyStateCard from './EmptyStateCard';

const ALL_INDIAN_STATES_AND_UTS = [
  'Andhra Pradesh', 'Arunachal Pradesh', 'Assam', 'Bihar', 'Chhattisgarh', 'Goa', 'Gujarat', 'Haryana', 'Himachal Pradesh', 'Jharkhand', 'Karnataka', 'Kerala', 'Madhya Pradesh', 'Maharashtra', 'Manipur', 'Meghalaya', 'Mizoram', 'Nagaland', 'Odisha', 'Punjab', 'Rajasthan', 'Sikkim', 'Tamil Nadu', 'Telangana', 'Tripura', 'Uttar Pradesh', 'Uttarakhand', 'West Bengal',
  'Andaman and Nicobar Islands', 'Chandigarh', 'Dadra and Nagar Haveli and Daman and Diu', 'Delhi', 'Jammu and Kashmir', 'Ladakh', 'Lakshadweep', 'Puducherry'
];

export default function ProMasterDataSubscreen({ lang }) {
  const states = useLiveQuery(() => db.b2bStates.toArray()) || [];
  const warehouses = useLiveQuery(() => db.b2bWarehouses.toArray()) || [];

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

  // GST Rates States
  const userProfileData = useLiveQuery(() => db.userProfile.toArray()) || [];
  const profile = userProfileData.reduce((acc, curr) => ({ ...acc, [curr.key]: curr.value }), {});
  const gstRates = profile.gstRates || [5, 12, 18, 28];
  const defaultGstRate = profile.defaultGstRate || 12;

  const [newGstRate, setNewGstRate] = useState('');
  const [editingGstRate, setEditingGstRate] = useState(null);
  const [editGstRateValue, setEditGstRateValue] = useState('');

  // GST CRUD Handlers
  const handleAddGstRate = async (e) => {
    e.preventDefault();
    const rate = parseInt(newGstRate);
    if (isNaN(rate) || rate < 0 || rate > 100) {
      alert('Please enter a valid rate between 0 and 100.');
      return;
    }
    if (gstRates.includes(rate)) {
      alert('This GST rate already exists.');
      return;
    }
    const updated = [...gstRates, rate].sort((a, b) => a - b);
    await db.userProfile.put({ key: 'gstRates', value: updated });
    setNewGstRate('');
    alert('GST Rate added successfully!');
  };

  const handleUpdateGstRate = async (e) => {
    e.preventDefault();
    const oldRate = editingGstRate;
    const newRate = parseInt(editGstRateValue);
    if (isNaN(newRate) || newRate < 0 || newRate > 100) {
      alert('Please enter a valid rate between 0 and 100.');
      return;
    }
    if (gstRates.includes(newRate) && newRate !== oldRate) {
      alert('This GST rate already exists.');
      return;
    }
    const updated = gstRates.map(r => r === oldRate ? newRate : r).sort((a, b) => a - b);
    await db.userProfile.put({ key: 'gstRates', value: updated });
    if (defaultGstRate === oldRate) {
      await db.userProfile.put({ key: 'defaultGstRate', value: newRate });
    }
    setEditingGstRate(null);
    alert('GST Rate updated successfully!');
  };

  const handleDeleteGstRate = async (rateToDelete) => {
    if (confirm(`Delete GST Rate ${rateToDelete}% permanently?`)) {
      const updated = gstRates.filter(r => r !== rateToDelete);
      await db.userProfile.put({ key: 'gstRates', value: updated });
      if (defaultGstRate === rateToDelete && updated.length > 0) {
        await db.userProfile.put({ key: 'defaultGstRate', value: updated[0] });
      }
      alert('GST Rate deleted successfully!');
    }
  };

  const handleSetDefaultGstRate = async (rate) => {
    await db.userProfile.put({ key: 'defaultGstRate', value: parseInt(rate) });
    alert(`Default GST Rate set to ${rate}%`);
  };

  // Compute remaining states and UTs that are not registered yet
  const addedStateNames = states.map(s => s.name.toLowerCase());
  const availableStates = ALL_INDIAN_STATES_AND_UTS.filter(st => !addedStateNames.includes(st.toLowerCase()));

  // Automatically select the first available state when database loads or changes
  useEffect(() => {
    if (availableStates.length > 0 && !newStateName) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setNewStateName(availableStates[0]);
    }
  }, [states]);

  // States CRUD Handlers
  const handleAddState = async (e) => {
    e.preventDefault();
    const finalState = newStateName || availableStates[0];
    if (!finalState) {
      alert('All states/UTs have already been registered.');
      return;
    }

    if (states.some(s => s.name.toLowerCase() === finalState.toLowerCase())) {
      alert('State already exists in the master register.');
      return;
    }

    await db.b2bStates.add({ name: finalState });
    setNewStateName('');
    alert('State added successfully!');
  };

  const handleUpdateState = async (e) => {
    e.preventDefault();
    if (!editingState || !editStateName.trim()) return;

    // Don't allow duplicates during edits either
    if (states.some(s => s.id !== editingState.id && s.name.toLowerCase() === editStateName.trim().toLowerCase())) {
      alert('A state with this name is already registered.');
      return;
    }

    await db.b2bStates.update(editingState.id, { name: editStateName.trim() });
    setEditingState(null);
    alert('State updated successfully!');
  };

  const handleDeleteState = async (id, name) => {
    if (confirm(`Delete State "${name}" permanently?`)) {
      await db.b2bStates.delete(id);
    }
  };

  // Warehouses CRUD Handlers
  const handleAddWarehouse = async (e) => {
    e.preventDefault();
    if (!newWhName.trim()) return;

    if (warehouses.some(w => w.name.toLowerCase() === newWhName.trim().toLowerCase())) {
      alert('Warehouse already exists!');
      return;
    }

    await db.b2bWarehouses.add({
      name: newWhName.trim(),
      address: newWhAddress.trim()
    });
    setNewWhName('');
    setNewWhAddress('');
    alert('Warehouse registered successfully!');
  };

  const handleUpdateWarehouse = async (e) => {
    e.preventDefault();
    if (!editingWh || !editWhName.trim()) return;

    await db.b2bWarehouses.update(editingWh.id, {
      name: editWhName.trim(),
      address: editWhAddress.trim()
    });
    setEditingWh(null);
    alert('Warehouse updated successfully!');
  };

  const handleDeleteWarehouse = async (id, name) => {
    if (confirm(`Delete Warehouse "${name}" permanently?`)) {
      await db.b2bWarehouses.delete(id);
    }
  };

  return (
    <div className="animate-fade-in" style={{ paddingBottom: '30px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
      
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        <div style={{ padding: '8px', borderRadius: '10px', background: 'hsl(var(--primary-glow))', color: 'hsl(var(--primary))' }}>
          <Settings size={18} />
        </div>
        <h2 style={{ fontSize: '1.1rem', fontWeight: '800', color: 'hsl(var(--primary))', fontFamily: 'Outfit', margin: 0 }}>
          {t('navMaster', lang)}
        </h2>
      </div>

      {/* Grid containing States and Warehouses CRUD */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '20px' }}>
        
        {/* State Management Section */}
        <div className="glass-card" style={{ padding: '16px', border: '1px solid hsl(var(--border-color))' }}>
          <h3 style={{ fontSize: '0.92rem', color: 'hsl(var(--text-primary))', display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '14px', fontFamily: 'Outfit', fontWeight: '800' }}>
            <MapPin size={16} /> {t('stateList', lang)}
          </h3>

          <form onSubmit={handleAddState} style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
            <select
              required value={newStateName} onChange={(e) => setNewStateName(e.target.value)}
              style={{ flex: 1, padding: '8px 12px', fontSize: '0.78rem', borderRadius: '8px', border: '1px solid hsl(var(--border-color))', outline: 'none', background: 'transparent', color: 'hsl(var(--text-primary))' }}
            >
              {availableStates.length === 0 && <option value="">No remaining States/UTs to add</option>}
              {availableStates.map((st, idx) => (
                <option key={idx} value={st}>{st}</option>
              ))}
            </select>
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


        {/* Warehouse Management Section */}
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

        {/* GST Rate Management Section */}
        <div className="glass-card" style={{ padding: '16px', border: '1px solid hsl(var(--border-color))' }}>
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

      {/* Edit State Overlay */}
      {editingState && (
        <div className="modal-overlay-container">
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

      {/* Edit Warehouse Overlay */}
      {editingWh && (
        <div className="modal-overlay-container">
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
      {/* Edit GST Rate Overlay */}
      {editingGstRate !== null && (
        <div className="modal-overlay-container">
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
