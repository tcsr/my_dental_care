import { useState, useEffect } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db, clearAllData } from '../utils/db';
import { 
  User, Mail, Phone, Briefcase, Building, RefreshCw, 
  Download, Upload, Check, Camera, Shield, Database, Trash2, MapPin 
} from 'lucide-react';

export default function ProProfileSettingsSubscreen() {
  // Read all user profile keys from IndexedDB
  const profileList = useLiveQuery(() => db.userProfile.toArray()) || [];
  
  // Convert array to object
  const profile = profileList.reduce((acc, curr) => ({ ...acc, [curr.key]: curr.value }), {});

  // Local Form States
  const [userName, setUserName] = useState('');
  const [role, setRole] = useState('');
  const [userEmail, setUserEmail] = useState('');
  const [userPhone, setUserPhone] = useState('');
  const [clinicName, setClinicName] = useState('');
  const [clinicAddress, setClinicAddress] = useState('');
  const [profileImage, setProfileImage] = useState('');
  const [activeRole, setActiveRole] = useState('rep');
  const [actingClientId, setActingClientId] = useState('');
  const clientsList = useLiveQuery(() => db.b2bClients.toArray()) || [];

  // Sync state
  const [syncStatus, setSyncStatus] = useState('idle'); // idle | syncing | success | error
  const [lastSynced, setLastSynced] = useState(() => localStorage.getItem('lastSyncedTime') || 'Never');
  const [autoSync, setAutoSync] = useState(() => localStorage.getItem('autoSyncEnabled') === 'true');
  const [soundFx, setSoundFx] = useState(() => localStorage.getItem('dentalSoundFx') !== 'false');

  const handleSoundFxToggle = () => {
    const nextVal = !soundFx;
    setSoundFx(nextVal);
    localStorage.setItem('dentalSoundFx', String(nextVal));
  };

  // Stats for local database
  const clientsCount = useLiveQuery(() => db.b2bClients.count()) || 0;
  const productsCount = useLiveQuery(() => db.b2bProducts.count()) || 0;
  const ordersCount = useLiveQuery(() => db.b2bOrders.count()) || 0;
  const casesCount = useLiveQuery(() => db.implantCases.count()) || 0;

  // Initialize form fields when profile loads
  useEffect(() => {
    if (profileList.length > 0) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setUserName(profile.userName || 'Chandra');
      setRole(profile.role || 'B2B Sales Representative');
      setUserEmail(profile.userEmail || 'chandra@dentalpro.com');
      setUserPhone(profile.userPhone || '+91 99887 76655');
      setClinicName(profile.clinicName || 'Apex Dental Distributor');
      setClinicAddress(profile.clinicAddress || 'Hitech City, Hyderabad, 500081');
      setActiveRole(profile.activeRole || 'rep');
      const actingId = profile.actingClientId ? parseInt(profile.actingClientId) : '';
      setActingClientId(actingId);

      const imgKey = (profile.activeRole || 'rep') === 'doctor' && actingId
        ? `profileImage_doctor_${actingId}`
        : 'profileImage_rep';
      setProfileImage(profile[imgKey] || profile.profileImage || '');
    }
  }, [profileList]);

  const handleClientSelectForRole = (clientId) => {
    setActingClientId(clientId);
    const selectedClient = clientsList.find(c => c.id === parseInt(clientId));
    if (selectedClient) {
      setUserName(selectedClient.contactPerson || selectedClient.name);
      setRole('Clinic Doctor / Manager');
      setUserEmail(selectedClient.email || '');
      setUserPhone(selectedClient.phone || '');
      setClinicName(selectedClient.name);

      const imgKey = `profileImage_doctor_${clientId}`;
      setProfileImage(profile[imgKey] || '');
    }
  };

  // Handle Profile Save
  const handleSaveProfile = async (e) => {
    e.preventDefault();
    try {
      const imgKey = activeRole === 'doctor' && actingClientId
        ? `profileImage_doctor_${actingClientId}`
        : 'profileImage_rep';

      await db.userProfile.bulkPut([
        { key: 'userName', value: userName },
        { key: 'role', value: role },
        { key: 'userEmail', value: userEmail },
        { key: 'userPhone', value: userPhone },
        { key: 'clinicName', value: clinicName },
        { key: 'clinicAddress', value: clinicAddress },
        { key: imgKey, value: profileImage },
        { key: 'activeRole', value: activeRole },
        { key: 'actingClientId', value: actingClientId ? parseInt(actingClientId) : null }
      ]);

      // Set generic profileImage key for basic fallback
      await db.userProfile.put({ key: 'profileImage', value: profileImage });

      alert('Profile and Access Role updated successfully!');
      window.location.reload();
    } catch (err) {
      console.error(err);
      alert('Failed to save profile details.');
    }
  };

  // Image Upload Handler
  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setProfileImage(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  // Sync Handler (Simulating cloud sync with spin effect)
  const handleSync = () => {
    setSyncStatus('syncing');
    
    // Simulate cloud sync timeout
    setTimeout(async () => {
      try {
        const timeNow = new Date().toLocaleString();
        localStorage.setItem('lastSyncedTime', timeNow);
        setLastSynced(timeNow);
        setSyncStatus('success');
        
        // Return to idle after delay
        setTimeout(() => setSyncStatus('idle'), 3000);
      } catch {
        setSyncStatus('error');
        setTimeout(() => setSyncStatus('idle'), 3000);
      }
    }, 2000);
  };

  // Auto-sync Toggle Handler
  const handleAutoSyncToggle = (e) => {
    const checked = e.target.checked;
    setAutoSync(checked);
    localStorage.setItem('autoSyncEnabled', checked ? 'true' : 'false');
  };

  // Export database as JSON backup file
  const handleExportBackup = async () => {
    try {
      const data = {
        userProfile: await db.userProfile.toArray(),
        b2bClients: await db.b2bClients.toArray(),
        b2bProducts: await db.b2bProducts.toArray(),
        b2bOrders: await db.b2bOrders.toArray(),
        implantCases: await db.implantCases.toArray(),
        automatedReminders: await db.automatedReminders.toArray(),
        customGuides: await db.customGuides.toArray(),
        b2bPurchaseOrders: await db.b2bPurchaseOrders.toArray(),
        stockAdjustments: await db.stockAdjustments.toArray(),
        b2bQuotes: await db.b2bQuotes.toArray(),
        deliveryChallans: await db.deliveryChallans.toArray(),
        crmLogs: await db.crmLogs.toArray(),
        b2bStates: await db.b2bStates.toArray(),
        b2bWarehouses: await db.b2bWarehouses.toArray(),
        exportDate: new Date().toISOString()
      };

      const json = JSON.stringify(data, null, 2);
      const blob = new Blob([json], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `dental_pro_backup_${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error(err);
      alert('Failed to export backup.');
    }
  };

  // Import database from JSON backup file
  const handleImportBackup = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const data = JSON.parse(event.target.result);
        if (confirm('Import backup? This will replace all current database records!')) {
          await clearAllData();
          
          if (data.userProfile) await db.userProfile.bulkPut(data.userProfile);
          if (data.b2bClients) await db.b2bClients.bulkAdd(data.b2bClients);
          if (data.b2bProducts) await db.b2bProducts.bulkAdd(data.b2bProducts);
          if (data.b2bOrders) await db.b2bOrders.bulkAdd(data.b2bOrders);
          if (data.implantCases) await db.implantCases.bulkAdd(data.implantCases);
          if (data.automatedReminders) await db.automatedReminders.bulkAdd(data.automatedReminders);
          if (data.customGuides) await db.customGuides.bulkAdd(data.customGuides);
          if (data.b2bPurchaseOrders) await db.b2bPurchaseOrders.bulkAdd(data.b2bPurchaseOrders);
          if (data.stockAdjustments) await db.stockAdjustments.bulkAdd(data.stockAdjustments);
          if (data.b2bQuotes) await db.b2bQuotes.bulkAdd(data.b2bQuotes);
          if (data.deliveryChallans) await db.deliveryChallans.bulkAdd(data.deliveryChallans);
          if (data.crmLogs) await db.crmLogs.bulkAdd(data.crmLogs);
          if (data.b2bStates) await db.b2bStates.bulkAdd(data.b2bStates);
          if (data.b2bWarehouses) await db.b2bWarehouses.bulkAdd(data.b2bWarehouses);

          alert('Backup restored successfully!');
          window.location.reload();
        }
      } catch (err) {
        console.error(err);
        alert('Failed to restore backup. Invalid file format.');
      }
    };
    reader.readAsText(file);
  };

  const handleReset = async () => {
    if (confirm('Clear all logs and reset database? This cannot be undone.')) {
      await clearAllData();
      alert('Database cleared.');
      window.location.reload();
    }
  };

  return (
    <div className="animate-fade-in" style={{ paddingBottom: '30px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
      
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        <div style={{ padding: '8px', borderRadius: '10px', background: 'hsl(var(--primary-glow))', color: 'hsl(var(--primary))' }}>
          <User size={18} />
        </div>
        <h2 style={{ fontSize: '1.1rem', fontWeight: '800', color: 'hsl(var(--primary))', fontFamily: 'Outfit', margin: 0 }}>
          Profile & Settings
        </h2>
      </div>

      {/* Main Profile Editor Card */}
      <div className="glass-card" style={{ padding: '20px', border: '1px solid hsl(var(--border-color))' }}>
        <form onSubmit={handleSaveProfile} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          
          {/* Avatar Section */}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px', paddingBottom: '16px', borderBottom: '1px solid hsl(var(--border-color))' }}>
            <div style={{ position: 'relative', width: '90px', height: '90px' }}>
              {profileImage ? (
                <img 
                  src={profileImage} 
                  alt="Profile" 
                  style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover', border: '3px solid hsl(var(--primary))' }} 
                />
              ) : (
                <div style={{ 
                  width: '100%', height: '100%', borderRadius: '50%', 
                  background: 'hsl(var(--primary-glow))', color: 'hsl(var(--primary))', 
                  display: 'flex', alignItems: 'center', justifyContent: 'center', 
                  fontSize: '2.2rem', fontWeight: 'bold', border: '2px dashed hsl(var(--primary))' 
                }}>
                  {userName.charAt(0).toUpperCase() || 'P'}
                </div>
              )}
              <label style={{
                position: 'absolute', bottom: '0', right: '0', 
                background: 'hsl(var(--primary))', color: '#fff', 
                width: '28px', height: '28px', borderRadius: '50%', 
                display: 'flex', alignItems: 'center', justifyContent: 'center', 
                cursor: 'pointer', boxShadow: '0 4px 10px rgba(0,0,0,0.15)',
                border: '2px solid hsl(var(--bg-card))'
              }}>
                <Camera size={14} />
                <input 
                  type="file" 
                  accept="image/*" 
                  onChange={handleImageChange} 
                  style={{ display: 'none' }} 
                />
              </label>
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: '0.95rem', fontWeight: '800', fontFamily: 'Outfit', textAlign: 'center' }}>
                {userName || 'Chandra'}
              </h3>
              <p style={{ margin: '2px 0 0', fontSize: '0.68rem', color: 'hsl(var(--text-muted))', textAlign: 'center' }}>
                {role || 'B2B Sales Representative'}
              </p>
            </div>
          </div>

          {/* Form Fields Grid */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '12px' }}>
            <div>
              <label style={{ fontSize: '0.7rem', fontWeight: 'bold', display: 'block', marginBottom: '4px' }}>
                Access Role (RBAC Settings)
              </label>
              <select 
                value={activeRole} 
                onChange={(e) => {
                  setActiveRole(e.target.value);
                  if (e.target.value === 'rep') {
                    setUserName(profile.userName || 'Chandra');
                    setRole('B2B Sales Representative');
                    setUserEmail(profile.userEmail || 'chandra@dentalpro.com');
                    setUserPhone(profile.userPhone || '+91 99887 76655');
                    setClinicName(profile.clinicName || 'Apex Dental Distributor');
                    setActingClientId('');
                    setProfileImage(profile.profileImage_rep || profile.profileImage || '');
                  } else if (clientsList.length > 0) {
                    handleClientSelectForRole(clientsList[0].id);
                  }
                }}
                style={{ width: '100%', padding: '10px', fontSize: '0.78rem', borderRadius: '8px', border: '1px solid hsl(var(--border-color))', background: 'transparent', color: 'hsl(var(--text-primary))', outline: 'none', fontWeight: 'bold' }}
              >
                <option value="rep">B2B Sales Representative (Full Console Access)</option>
                <option value="doctor">Doctor / Clinic Owner (Direct Clinic Portal)</option>
              </select>
            </div>

            {activeRole === 'doctor' && (
              <div>
                <label style={{ fontSize: '0.7rem', fontWeight: 'bold', display: 'block', marginBottom: '4px' }}>
                  Choose Active Doctor Clinic Identity
                </label>
                <select 
                  value={actingClientId} 
                  onChange={(e) => handleClientSelectForRole(e.target.value)}
                  style={{ width: '100%', padding: '10px', fontSize: '0.78rem', borderRadius: '8px', border: '1px solid hsl(var(--border-color))', background: 'transparent', color: 'hsl(var(--text-primary))', outline: 'none', fontWeight: 'bold' }}
                >
                  <option value="">-- Choose registered clinic --</option>
                  {clientsList.map(c => (
                    <option key={c.id} value={c.id}>{c.name} ({c.discountTier} tier)</option>
                  ))}
                </select>
              </div>
            )}

            <div>
              <label style={{ fontSize: '0.7rem', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '4px', marginBottom: '4px' }}>
                <User size={12} /> Full Name
              </label>
              <input 
                type="text" required value={userName} onChange={(e) => setUserName(e.target.value)}
                style={{ width: '100%', padding: '10px', fontSize: '0.78rem', borderRadius: '8px', border: '1px solid hsl(var(--border-color))', background: 'transparent', color: 'hsl(var(--text-primary))', outline: 'none' }}
              />
            </div>

            <div>
              <label style={{ fontSize: '0.7rem', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '4px', marginBottom: '4px' }}>
                <Briefcase size={12} /> Role / Title
              </label>
              <input 
                type="text" required value={role} onChange={(e) => setRole(e.target.value)}
                style={{ width: '100%', padding: '10px', fontSize: '0.78rem', borderRadius: '8px', border: '1px solid hsl(var(--border-color))', background: 'transparent', color: 'hsl(var(--text-primary))', outline: 'none' }}
              />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
              <div>
                <label style={{ fontSize: '0.7rem', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '4px', marginBottom: '4px' }}>
                  <Mail size={12} /> Email
                </label>
                <input 
                  type="email" required value={userEmail} onChange={(e) => setUserEmail(e.target.value)}
                  style={{ width: '100%', padding: '10px', fontSize: '0.78rem', borderRadius: '8px', border: '1px solid hsl(var(--border-color))', background: 'transparent', color: 'hsl(var(--text-primary))', outline: 'none' }}
                />
              </div>
              <div>
                <label style={{ fontSize: '0.7rem', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '4px', marginBottom: '4px' }}>
                  <Phone size={12} /> Phone
                </label>
                <input 
                  type="text" required value={userPhone} onChange={(e) => setUserPhone(e.target.value)}
                  style={{ width: '100%', padding: '10px', fontSize: '0.78rem', borderRadius: '8px', border: '1px solid hsl(var(--border-color))', background: 'transparent', color: 'hsl(var(--text-primary))', outline: 'none' }}
                />
              </div>
            </div>

            <div>
              <label style={{ fontSize: '0.7rem', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '4px', marginBottom: '4px' }}>
                <Building size={12} /> Clinic / Distributor Name
              </label>
              <input 
                type="text" required value={clinicName} onChange={(e) => setClinicName(e.target.value)}
                style={{ width: '100%', padding: '10px', fontSize: '0.78rem', borderRadius: '8px', border: '1px solid hsl(var(--border-color))', background: 'transparent', color: 'hsl(var(--text-primary))', outline: 'none' }}
              />
            </div>

            <div>
              <label style={{ fontSize: '0.7rem', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '4px', marginBottom: '4px' }}>
                <MapPin size={12} /> Clinic / Distributor Address
              </label>
              <input 
                type="text" required value={clinicAddress} onChange={(e) => setClinicAddress(e.target.value)}
                style={{ width: '100%', padding: '10px', fontSize: '0.78rem', borderRadius: '8px', border: '1px solid hsl(var(--border-color))', background: 'transparent', color: 'hsl(var(--text-primary))', outline: 'none' }}
              />
            </div>
          </div>

          <button type="submit" className="btn-primary" style={{ padding: '12px', borderRadius: '10px', fontWeight: 'bold', border: 'none', cursor: 'pointer', fontFamily: 'Outfit', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
            <Check size={16} /> Save Changes
          </button>
        </form>
      </div>

      {/* Sync Control Center */}
      <div className="glass-card" style={{ padding: '20px', border: '1px solid hsl(var(--border-color))' }}>
        <h3 style={{ fontSize: '0.92rem', color: 'hsl(var(--text-primary))', display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px', fontFamily: 'Outfit', fontWeight: '800' }}>
          🔄 Sync & Cloud Connection
        </h3>
        <p style={{ fontSize: '0.72rem', color: 'hsl(var(--text-muted))', lineHeight: 1.4, marginBottom: '16px' }}>
          Connect your local dental database with central servers to update prices, sync sales records, and push clinical timelines.
        </p>

        {/* Sync Status Info */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', background: 'hsl(var(--border-color) / 10%)', padding: '12px 14px', borderRadius: '10px', marginBottom: '16px', fontSize: '0.75rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span style={{ color: 'hsl(var(--text-muted))' }}>Last Sync Timestamp:</span>
            <span style={{ fontWeight: 'bold', color: 'hsl(var(--text-primary))' }}>{lastSynced}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span style={{ color: 'hsl(var(--text-muted))' }}>Connection Status:</span>
            <span style={{ fontWeight: 'bold', color: 'hsl(var(--secondary))', display: 'flex', alignItems: 'center', gap: '4px' }}>
              <Shield size={12} /> Encrypted (SSL)
            </span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '4px', paddingTop: '6px', borderTop: '1px solid hsl(var(--border-color) / 10%)' }}>
            <span style={{ color: 'hsl(var(--text-muted))' }}>Simulate Auto-Sync</span>
            <label style={{ position: 'relative', display: 'inline-block', width: '32px', height: '18px' }}>
              <input type="checkbox" checked={autoSync} onChange={handleAutoSyncToggle} style={{ opacity: 0, width: 0, height: 0 }} />
              <span style={{
                position: 'absolute', cursor: 'pointer', top: 0, left: 0, right: 0, bottom: 0,
                backgroundColor: autoSync ? 'hsl(var(--primary))' : 'hsl(var(--border-color))',
                transition: '.2s', borderRadius: '18px'
              }}>
                <span style={{
                  position: 'absolute', content: '""', height: '14px', width: '14px', left: autoSync ? '16px' : '2px', bottom: '2px',
                  backgroundColor: 'white', transition: '.2s', borderRadius: '50%'
                }} />
              </span>
            </label>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '6px', paddingTop: '6px', borderTop: '1px solid hsl(var(--border-color) / 10%)' }}>
            <span style={{ color: 'hsl(var(--text-muted))' }}>Sound Effects (Beeps)</span>
            <label style={{ position: 'relative', display: 'inline-block', width: '32px', height: '18px' }}>
              <input type="checkbox" checked={soundFx} onChange={handleSoundFxToggle} style={{ opacity: 0, width: 0, height: 0 }} />
              <span style={{
                position: 'absolute', cursor: 'pointer', top: 0, left: 0, right: 0, bottom: 0,
                backgroundColor: soundFx ? 'hsl(var(--primary))' : 'hsl(var(--border-color))',
                transition: '.2s', borderRadius: '18px'
              }}>
                <span style={{
                  position: 'absolute', content: '""', height: '14px', width: '14px', left: soundFx ? '16px' : '2px', bottom: '2px',
                  backgroundColor: 'white', transition: '.2s', borderRadius: '50%'
                }} />
              </span>
            </label>
          </div>
        </div>

        {/* Sync Trigger button */}
        <button 
          onClick={handleSync}
          disabled={syncStatus === 'syncing'}
          style={{
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
            width: '100%', padding: '12px', borderRadius: '10px', border: 'none', fontWeight: 'bold', fontSize: '0.82rem',
            background: syncStatus === 'success' 
              ? 'linear-gradient(135deg, hsl(var(--secondary)), #059669)' 
              : 'linear-gradient(135deg, hsl(var(--primary)), #0284c7)', 
            color: '#fff',
            cursor: syncStatus === 'syncing' ? 'not-allowed' : 'pointer', transition: 'all 0.2s', 
            boxShadow: '0 4px 15px rgba(0,0,0,0.1)', fontFamily: 'Outfit', marginBottom: '14px'
          }}
        >
          {syncStatus === 'syncing' ? (
            <>
              <RefreshCw className="animate-spin" size={18} />
              Syncing dental registers with cloud...
            </>
          ) : syncStatus === 'success' ? (
            <>
              <Check size={18} />
              Sync Completed Successfully!
            </>
          ) : (
            <>
              <RefreshCw size={18} />
              Sync Now
            </>
          )}
        </button>

        {/* Backup Export/Import */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
          <button 
            onClick={handleExportBackup}
            style={{
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px',
              padding: '10px', borderRadius: '8px', border: '1px solid hsl(var(--border-color))',
              background: 'transparent', color: 'hsl(var(--text-primary))', fontSize: '0.75rem', fontWeight: 'bold',
              cursor: 'pointer', transition: 'all 0.2s'
            }}
          >
            <Download size={14} /> Export JSON
          </button>
          
          <label 
            style={{
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px',
              padding: '10px', borderRadius: '8px', border: '1px solid hsl(var(--border-color))',
              background: 'transparent', color: 'hsl(var(--text-primary))', fontSize: '0.75rem', fontWeight: 'bold',
              cursor: 'pointer', transition: 'all 0.2s', textAlign: 'center'
            }}
          >
            <Upload size={14} /> Restore JSON
            <input 
              type="file" 
              accept="application/json" 
              onChange={handleImportBackup} 
              style={{ display: 'none' }} 
            />
          </label>
        </div>
      </div>

      {/* Database Diagnostics */}
      <div className="glass-card" style={{ padding: '20px', border: '1px solid hsl(var(--border-color))' }}>
        <h3 style={{ fontSize: '0.92rem', color: 'hsl(var(--text-primary))', display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '10px', fontFamily: 'Outfit', fontWeight: '800' }}>
          <Database size={16} /> Local Storage Analytics
        </h3>
        
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: '16px' }}>
          <div style={{ background: 'hsl(var(--border-color) / 10%)', padding: '10px', borderRadius: '8px', textAlign: 'center' }}>
            <div style={{ fontSize: '1.2rem', fontWeight: 'bold', color: 'hsl(var(--primary))' }}>{clientsCount}</div>
            <div style={{ fontSize: '0.62rem', color: 'hsl(var(--text-muted))' }}>Registered Clinics</div>
          </div>
          <div style={{ background: 'hsl(var(--border-color) / 10%)', padding: '10px', borderRadius: '8px', textAlign: 'center' }}>
            <div style={{ fontSize: '1.2rem', fontWeight: 'bold', color: 'hsl(var(--primary))' }}>{productsCount}</div>
            <div style={{ fontSize: '0.62rem', color: 'hsl(var(--text-muted))' }}>Product SKUs</div>
          </div>
          <div style={{ background: 'hsl(var(--border-color) / 10%)', padding: '10px', borderRadius: '8px', textAlign: 'center' }}>
            <div style={{ fontSize: '1.2rem', fontWeight: 'bold', color: 'hsl(var(--primary))' }}>{ordersCount}</div>
            <div style={{ fontSize: '0.62rem', color: 'hsl(var(--text-muted))' }}>B2B Invoices</div>
          </div>
          <div style={{ background: 'hsl(var(--border-color) / 10%)', padding: '10px', borderRadius: '8px', textAlign: 'center' }}>
            <div style={{ fontSize: '1.2rem', fontWeight: 'bold', color: 'hsl(var(--primary))' }}>{casesCount}</div>
            <div style={{ fontSize: '0.62rem', color: 'hsl(var(--text-muted))' }}>Implant Timelines</div>
          </div>
        </div>

        <button 
          onClick={handleReset} 
          style={{ 
            width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', 
            padding: '10px', background: 'hsl(var(--color-hyper) / 10%)', border: 'none', 
            color: 'hsl(var(--color-hyper))', fontSize: '0.78rem', fontWeight: 'bold', 
            cursor: 'pointer', borderRadius: '8px' 
          }}
        >
          <Trash2 size={14} /> Wipe Database & Reset Console
        </button>
      </div>

    </div>
  );
}
