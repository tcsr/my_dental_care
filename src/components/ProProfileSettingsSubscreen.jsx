import { useState, useEffect } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db, clearAllData } from '../utils/db';
import { supabase } from '../utils/supabase';
import { 
  User, Mail, Phone, Briefcase, Building, RefreshCw, 
  Download, Upload, Check, Camera, Shield, Database, Trash2, MapPin 
} from 'lucide-react';
import PremiumSelect from './ui/PremiumSelect';

export default function ProProfileSettingsSubscreen({ lang, profile = {}, authUser, isAdmin = false }) {
  // Local Form States
  const [userName, setUserName] = useState('');
  const [role, setRole] = useState('');
  const [userEmail, setUserEmail] = useState('');
  const [userPhone, setUserPhone] = useState('');
  const [clinicName, setClinicName] = useState('');
  const [clinicAddress, setClinicAddress] = useState('');
  const [gstNumber, setGstNumber] = useState('');
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
    try {
      localStorage.setItem('dentalSoundFx', String(nextVal));
    } catch (e) {
      console.warn('Could not save soundFx preference:', e);
    }
  };

  // Stats for local database
  const clientsCount = useLiveQuery(() => db.b2bClients.count()) || 0;
  const productsCount = useLiveQuery(() => db.b2bProducts.count()) || 0;
  const ordersCount = useLiveQuery(() => db.b2bOrders.count()) || 0;
  const casesCount = useLiveQuery(() => db.implantCases.count()) || 0;

  // Initialize form fields when profile loads
  useEffect(() => {
    if (profile && Object.keys(profile).length > 0) {
      setUserName(profile.userName || '');
      setRole(profile.role || '');
      setUserEmail(profile.userEmail || '');
      setUserPhone(profile.userPhone || '');
      setClinicName(profile.clinicName || '');
      setClinicAddress(profile.clinicAddress || '');
      setGstNumber(profile.gstNumber || '36AAAAA1111A1Z1');
      setActiveRole(profile.activeRole || 'rep');
      const actingId = profile.actingClientId ? parseInt(profile.actingClientId) : '';
      setActingClientId(actingId);

      const imgKey = (profile.activeRole || 'rep') === 'doctor' && actingId
        ? `profileImage_doctor_${actingId}`
        : 'profileImage_rep';
      setProfileImage(profile[imgKey] || profile.profileImage || '');
    } else if (authUser) {
      setUserName(authUser.name || '');
      setRole(authUser.role === 'admin' ? 'Administrator' : 'Clinic Doctor / Manager');
      setUserEmail(authUser.user?.email || '');
      setUserPhone(authUser.phone || '');
      setClinicName(authUser.clinicName || '');
      setClinicAddress(authUser.address || '');
      setGstNumber(authUser.gstNumber || '36AAAAA1111A1Z1');
      setActiveRole(authUser.role === 'admin' ? 'rep' : 'doctor');
      setActingClientId('');
      setProfileImage('');
    }
  }, [profile, authUser]);

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

      const prefix = authUser?.user?.id ? `${authUser.user.id}_` : '';

      await db.userProfile.bulkPut([
        { key: `${prefix}userName`, value: userName },
        { key: `${prefix}role`, value: role },
        { key: `${prefix}userEmail`, value: userEmail },
        { key: `${prefix}userPhone`, value: userPhone },
        { key: `${prefix}clinicName`, value: clinicName },
        { key: `${prefix}clinicAddress`, value: clinicAddress },
        { key: `${prefix}gstNumber`, value: gstNumber },
        { key: `${prefix}${imgKey}`, value: profileImage },
        { key: `${prefix}activeRole`, value: activeRole },
        { key: `${prefix}actingClientId`, value: actingClientId ? parseInt(actingClientId) : null }
      ]);

      // Set generic profileImage key for basic fallback
      await db.userProfile.put({ key: `${prefix}profileImage`, value: profileImage });

      // Sync back to Supabase profiles
      if (authUser?.user?.id) {
        const { error: supabaseErr } = await supabase
          .from('profiles')
          .update({
            name: userName,
            clinic_name: clinicName,
            phone: userPhone,
            address: clinicAddress,
            gst_number: gstNumber
          })
          .eq('id', authUser.user.id);
        
        if (supabaseErr) {
          console.error('Supabase profile update failed:', supabaseErr);
        }
      }

      window.__triggerToast?.('Profile and Access Role updated successfully!', 'success');
    } catch (err) {
      console.error(err);
      window.__triggerToast?.('Failed to save profile details. Please try again.', 'error');
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

  // Sync Handler (Real Cloud Sync Workflow)
  const handleSync = async () => {
    setSyncStatus('syncing');
    try {
      // 0. Sync Warehouses between Supabase and local Dexie
      try {
        const { data: remoteWhs } = await supabase.from('warehouses').select('*');
        const localWhs = await db.b2bWarehouses.toArray();
        for (const rw of (remoteWhs || [])) {
          if (!localWhs.some(lw => lw.name.toLowerCase() === rw.name.toLowerCase())) {
            await db.b2bWarehouses.add({ name: rw.name, address: rw.address || '' });
          }
        }
        for (const lw of localWhs) {
          if (!remoteWhs.some(rw => rw.name.toLowerCase() === lw.name.toLowerCase())) {
            await supabase.from('warehouses').insert({ name: lw.name, address: lw.address || '' });
          }
        }
      } catch (e) {
        console.warn('Warehouse sync failed:', e);
      }

      // 0a. Sync GST Rates between Supabase and local Dexie
      try {
        const { data: remoteRates } = await supabase.from('gst_rates').select('*');
        if (remoteRates && remoteRates.length > 0) {
          const ratesList = remoteRates.map(r => r.rate).sort((a, b) => a - b);
          const defaultRateObj = remoteRates.find(r => r.is_default);
          const defaultRate = defaultRateObj ? defaultRateObj.rate : ratesList[0];
          
          const prefix = authUser?.user?.id ? `${authUser.user.id}_` : '';
          await db.userProfile.put({ key: `${prefix}gstRates`, value: ratesList });
          await db.userProfile.put({ key: `${prefix}defaultGstRate`, value: defaultRate });
        }
      } catch (e) {
        console.warn('GST rates sync failed:', e);
      }

      // 1. Fetch Approved Doctors from Supabase
      const { data: remoteDoctors, error: docErr } = await supabase
        .from('profiles')
        .select('*')
        .eq('role', 'doctor')
        .eq('approved', true);
      
      if (docErr) throw docErr;

      // Sync Doctors to B2B Clients
      for (const doc of (remoteDoctors || [])) {
        let localClient = await db.b2bClients.where('email').equals(doc.auth_email || doc.id).first();
        if (!localClient) {
          localClient = await db.b2bClients.where('name').equals(doc.clinic_name || doc.name).first();
        }
        if (!localClient) {
          await db.b2bClients.add({
            name: doc.clinic_name || doc.name,
            type: 'Doctor',
            contactPerson: doc.name,
            email: doc.auth_email || doc.id,
            phone: doc.phone || '',
            address: doc.address || '',
            discountTier: 'Standard',
            state: 'Telangana',
            creditLimit: 200000,
            supabase_id: doc.id
          });
        } else if (!localClient.supabase_id) {
          await db.b2bClients.update(localClient.id, { supabase_id: doc.id });
        }
      }

      // 2. Fetch Products from Supabase
      const { data: remoteProducts, error: prodErr } = await supabase
        .from('products')
        .select('*');
      
      if (prodErr) throw prodErr;

      // Sync Products bidirectionally
      const localProducts = await db.b2bProducts.toArray();
      for (const rp of (remoteProducts || [])) {
        const matchingLocal = localProducts.find(lp => lp.name.toLowerCase() === rp.name.toLowerCase());
        if (!matchingLocal) {
          await db.b2bProducts.add({
            name: rp.name,
            category: rp.category || 'Materials',
            sku: rp.sku || rp.name.substring(0, 7).toUpperCase().replace(/\s/g, '-'),
            price: rp.price || 0,
            stock: rp.stock_qty || 0,
            minStock: 5,
            isSerialized: rp.is_serialized || false,
            purchaseCost: rp.purchase_cost || null,
            batches: [
              { batchNo: 'SYNC-BATCH', expiryDate: Date.now() + 365 * 24 * 60 * 60 * 1000, stock: rp.stock_qty || 0, location: 'Main Warehouse' }
            ],
            supabase_id: rp.id
          });
        } else {
          // If remote stock (B2C catalog) changed, align local stock and deduct from batches
          const diff = matchingLocal.stock - (rp.stock_qty || 0);
          let updatedBatches = matchingLocal.batches || [];
          
          if (diff > 0 && updatedBatches.length > 0) {
            // Deduct sold stock from local batches
            let remainingToDeduct = diff;
            updatedBatches = updatedBatches.map(b => {
              if (remainingToDeduct <= 0) return b;
              const deduct = Math.min(b.stock || 0, remainingToDeduct);
              remainingToDeduct -= deduct;
              return { ...b, stock: Math.max(0, (b.stock || 0) - deduct) };
            });
          } else if (diff < 0 && updatedBatches.length > 0) {
            // Remote stock increased, add difference to the first batch
            const addition = Math.abs(diff);
            updatedBatches = [...updatedBatches];
            updatedBatches[0].stock = (updatedBatches[0].stock || 0) + addition;
          } else if (updatedBatches.length === 0) {
            updatedBatches = [
              { batchNo: 'SYNC-BATCH', expiryDate: Date.now() + 365 * 24 * 60 * 60 * 1000, stock: rp.stock_qty || 0, location: 'Main Warehouse' }
            ];
          }

          // Update details to match
          await db.b2bProducts.update(matchingLocal.id, { 
            supabase_id: rp.id,
            price: rp.price || matchingLocal.price,
            stock: rp.stock_qty !== undefined ? rp.stock_qty : matchingLocal.stock,
            batches: updatedBatches,
            isSerialized: rp.is_serialized !== undefined ? rp.is_serialized : matchingLocal.isSerialized,
            purchaseCost: rp.purchase_cost !== undefined ? rp.purchase_cost : matchingLocal.purchaseCost,
            sku: rp.sku || matchingLocal.sku
          });
        }
      }

      // Sync local B2B products to Supabase if not present
      for (const lp of localProducts) {
        const matchingRemote = (remoteProducts || []).find(rp => rp.name.toLowerCase() === lp.name.toLowerCase());
        if (!matchingRemote) {
          try {
            const { data: inserted } = await supabase.from('products').insert({
              name: lp.name,
              category: lp.category,
              price: lp.price,
              stock_qty: lp.stock,
              description: lp.sku || 'B2B Product SKU',
              sku: lp.sku,
              purchase_cost: lp.purchaseCost || null,
              is_serialized: lp.isSerialized || false,
              active: true
            }).select().single();
            if (inserted) {
              await db.b2bProducts.update(lp.id, { supabase_id: inserted.id });
            }
          } catch (e) {
            console.error('Failed to upload product to Supabase:', e);
          }
        } else {
          // If local has updated details (e.g. stock, cost, serials), sync back to Supabase
          try {
            await supabase.from('products').update({
              price: lp.price,
              stock_qty: lp.stock,
              sku: lp.sku,
              purchase_cost: lp.purchaseCost || null,
              is_serialized: lp.isSerialized || false
            }).eq('id', matchingRemote.id);
          } catch (e) {
            console.error('Failed to sync product updates back to Supabase:', e);
          }
        }
      }

      // 3. Fetch Orders from Supabase
      const { data: remoteOrders, error: orderErr } = await supabase
        .from('orders')
        .select('*, order_items(*, products(*))');
      
      if (orderErr) throw orderErr;

      const localOrders = await db.b2bOrders.toArray();
      const updatedLocalClients = await db.b2bClients.toArray();
      const updatedLocalProducts = await db.b2bProducts.toArray();

      // Get a default doctor UUID from profiles to satisfy foreign keys
      const { data: defaultDoctor } = await supabase.from('profiles').select('id').eq('role', 'doctor').limit(1).single();
      const defaultDoctorId = defaultDoctor?.id || '00000000-0000-0000-0000-000000000000';

      for (const ro of (remoteOrders || [])) {
        const matchingLocal = localOrders.find(lo => lo.supabase_order_id === ro.id);
        const client = updatedLocalClients.find(c => c.supabase_id === ro.doctor_id);
        
        // Map products
        const productIds = [];
        let totalQty = 0;
        for (const item of (ro.order_items || [])) {
          const lp = updatedLocalProducts.find(p => p.supabase_id === item.product_id || p.name.toLowerCase() === item.product?.name?.toLowerCase());
          if (lp) {
            productIds.push(lp.id);
            totalQty += item.qty || 1;
          }
        }

        if (productIds.length === 0) continue;

        if (!matchingLocal) {
          await db.b2bOrders.add({
            clientId: client ? client.id : 1, 
            productIds: productIds,
            qty: totalQty,
            discountAmount: 0,
            finalAmount: ro.total || 0,
            status: ro.status === 'pending' ? 'In Production' : ro.status === 'completed' ? 'Delivered' : ro.status,
            paymentStatus: ro.status === 'completed' ? 'Paid' : 'Unpaid',
            orderDate: new Date(ro.created_at).getTime(),
            dueDate: new Date(ro.created_at).getTime() + 7 * 24 * 60 * 60 * 1000,
            supabase_order_id: ro.id
          });
        } else {
          // Sync status updates back and forth
          if (matchingLocal.status !== ro.status) {
            const resolvedStatus = matchingLocal.status === 'Delivered' ? 'completed' : ro.status;
            if (resolvedStatus !== ro.status) {
              await supabase.from('orders').update({ status: resolvedStatus }).eq('id', ro.id);
            }
            await db.b2bOrders.update(matchingLocal.id, {
              status: ro.status === 'pending' ? 'In Production' : ro.status === 'completed' ? 'Delivered' : ro.status
            });
          }
        }
      }

      // Sync direct Sales Rep B2B Orders to Supabase
      for (const lo of localOrders) {
        if (!lo.supabase_order_id) {
          const client = updatedLocalClients.find(c => c.id === lo.clientId);
          const firstProd = updatedLocalProducts.find(p => p.id === lo.productIds[0]);
          
          if (!client || !firstProd) continue;
          
          const remoteProdId = firstProd.supabase_id || (remoteProducts && remoteProducts[0] ? remoteProducts[0].id : null);
          if (!remoteProdId) continue;

          // Insert order to Supabase
          const { data: insertedOrder } = await supabase
            .from('orders')
            .insert({
              doctor_id: client.supabase_id || defaultDoctorId,
              status: lo.status === 'Delivered' ? 'completed' : 'pending',
              total: lo.finalAmount
            })
            .select()
            .single();

          if (insertedOrder) {
            await db.b2bOrders.update(lo.id, { supabase_order_id: insertedOrder.id });
            
            // Insert order items
            await supabase.from('order_items').insert({
              order_id: insertedOrder.id,
              product_id: remoteProdId,
              qty: lo.qty,
              unit_price: lo.finalAmount / lo.qty
            });
          }
        }
      }

      const timeNow = new Date().toLocaleString();
      try {
        localStorage.setItem('lastSyncedTime', timeNow);
      } catch (e) {
        console.warn('Could not save lastSyncedTime preference:', e);
      }
      setLastSynced(timeNow);
      setSyncStatus('success');
      setTimeout(() => setSyncStatus('idle'), 3000);
    } catch (err) {
      console.error('Cloud Sync failed:', err);
      setSyncStatus('error');
      setTimeout(() => setSyncStatus('idle'), 3000);
    }
  };

  // Auto-sync Toggle Handler
  const handleAutoSyncToggle = (e) => {
    const checked = e.target.checked;
    setAutoSync(checked);
    try {
      localStorage.setItem('autoSyncEnabled', checked ? 'true' : 'false');
    } catch (err) {
      console.warn('Could not save autoSyncEnabled preference:', err);
    }
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
        if (await confirm('Import backup? This will replace all current database records!')) {
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
    if (await confirm('Clear all logs and reset database? This cannot be undone.')) {
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
          {isAdmin ? 'System Settings' : 'Profile & Settings'}
        </h2>
      </div>

      {/* Profile Settings Card */}
      <div className="glass-card" style={{ padding: '24px 28px', border: '1px solid hsl(var(--border-color))', maxWidth: '900px', width: '100%' }}>
        <form onSubmit={handleSaveProfile} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          
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
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '16px' }}>
            <div>
              <label style={{ fontSize: '0.7rem', fontWeight: 'bold', display: 'block', marginBottom: '4px' }}>
                Access Role (RBAC Settings)
              </label>
              <PremiumSelect 
                value={activeRole} 
                disabled={!isAdmin}
                onChange={(e) => {
                  setActiveRole(e.target.value);
                  if (e.target.value === 'rep') {
                    setUserName(profile.userName || authUser?.name || 'Chandra');
                    setRole(profile.role || (authUser?.role === 'admin' ? 'Administrator' : 'B2B Sales Representative'));
                    setUserEmail(profile.userEmail || authUser?.user?.email || 'chandra@dentalpro.com');
                    setUserPhone(profile.userPhone || authUser?.phone || '+91 99887 76655');
                    setClinicName(profile.clinicName || authUser?.clinicName || 'Apex Dental Distributor');
                    setClinicAddress(profile.clinicAddress || authUser?.address || 'Hitech City, Hyderabad, 500081');
                    setGstNumber(profile.gstNumber || authUser?.gstNumber || '36AAAAA1111A1Z1');
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
              </PremiumSelect>
            </div>

            {activeRole === 'doctor' && (
              <div>
                <label style={{ fontSize: '0.7rem', fontWeight: 'bold', display: 'block', marginBottom: '4px' }}>
                  Choose Active Doctor Clinic Identity
                </label>
                <PremiumSelect 
                  value={actingClientId} 
                  onChange={(e) => handleClientSelectForRole(e.target.value)}
                  style={{ width: '100%', padding: '10px', fontSize: '0.78rem', borderRadius: '8px', border: '1px solid hsl(var(--border-color))', background: 'transparent', color: 'hsl(var(--text-primary))', outline: 'none', fontWeight: 'bold' }}
                >
                  <option value="">-- Choose registered clinic --</option>
                  {clientsList.map(c => (
                    <option key={c.id} value={c.id}>{c.name} ({c.discountTier} tier)</option>
                  ))}
                </PremiumSelect>
              </div>
            )}

            <div>
              <label style={{ fontSize: '0.7rem', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '4px', marginBottom: '4px' }}>
                <User size={12} /> Full Name <span style={{ color: '#ef4444', marginLeft: 2 }}>*</span>
              </label>
              <input 
                type="text" required value={userName} onChange={(e) => setUserName(e.target.value)}
                style={{ width: '100%', padding: '10px', fontSize: '0.78rem', borderRadius: '8px', border: '1px solid hsl(var(--border-color))', background: 'transparent', color: 'hsl(var(--text-primary))', outline: 'none' }}
              />
            </div>

            <div>
              <label style={{ fontSize: '0.7rem', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '4px', marginBottom: '4px' }}>
                <Briefcase size={12} /> Role / Title <span style={{ color: '#ef4444', marginLeft: 2 }}>*</span>
              </label>
              <input 
                type="text" required value={role} onChange={(e) => setRole(e.target.value)}
                style={{ width: '100%', padding: '10px', fontSize: '0.78rem', borderRadius: '8px', border: '1px solid hsl(var(--border-color))', background: 'transparent', color: 'hsl(var(--text-primary))', outline: 'none' }}
              />
            </div>

            <div>
              <label style={{ fontSize: '0.7rem', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '4px', marginBottom: '4px' }}>
                <Mail size={12} /> Email <span style={{ color: '#ef4444', marginLeft: 2 }}>*</span>
              </label>
              <input 
                type="email" required value={userEmail} onChange={(e) => setUserEmail(e.target.value)}
                style={{ width: '100%', padding: '10px', fontSize: '0.78rem', borderRadius: '8px', border: '1px solid hsl(var(--border-color))', background: 'transparent', color: 'hsl(var(--text-primary))', outline: 'none' }}
              />
            </div>
            <div>
              <label style={{ fontSize: '0.7rem', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '4px', marginBottom: '4px' }}>
                <Phone size={12} /> Phone <span style={{ color: '#ef4444', marginLeft: 2 }}>*</span>
              </label>
              <input 
                type="text" required value={userPhone} onChange={(e) => setUserPhone(e.target.value)}
                style={{ width: '100%', padding: '10px', fontSize: '0.78rem', borderRadius: '8px', border: '1px solid hsl(var(--border-color))', background: 'transparent', color: 'hsl(var(--text-primary))', outline: 'none' }}
              />
            </div>

            <div>
              <label style={{ fontSize: '0.7rem', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '4px', marginBottom: '4px' }}>
                <Building size={12} /> Clinic / Distributor Name <span style={{ color: '#ef4444', marginLeft: 2 }}>*</span>
              </label>
              <input 
                type="text" required value={clinicName} onChange={(e) => setClinicName(e.target.value)}
                style={{ width: '100%', padding: '10px', fontSize: '0.78rem', borderRadius: '8px', border: '1px solid hsl(var(--border-color))', background: 'transparent', color: 'hsl(var(--text-primary))', outline: 'none' }}
              />
            </div>

            <div style={{ gridColumn: '1 / -1' }}>
              <label style={{ fontSize: '0.7rem', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '4px', marginBottom: '4px' }}>
                <MapPin size={12} /> Clinic / Distributor Address <span style={{ color: '#ef4444', marginLeft: 2 }}>*</span>
              </label>
              <input 
                type="text" required value={clinicAddress} onChange={(e) => setClinicAddress(e.target.value)}
                style={{ width: '100%', padding: '10px', fontSize: '0.78rem', borderRadius: '8px', border: '1px solid hsl(var(--border-color))', background: 'transparent', color: 'hsl(var(--text-primary))', outline: 'none' }}
              />
            </div>

            <div>
              <label style={{ fontSize: '0.7rem', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '4px', marginBottom: '4px' }}>
                <Shield size={12} /> GSTIN (GST Number) <span style={{ color: '#ef4444', marginLeft: 2 }}>*</span>
              </label>
              <input 
                type="text" required value={gstNumber} onChange={(e) => setGstNumber(e.target.value)}
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
      {isAdmin && (
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
      )}

      {/* Database Diagnostics */}
      {isAdmin && (
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
      )}

    </div>
  );
}
