import Dexie from 'dexie';
import { supabase } from './supabase';

// Initialize My Dental Care Database
export const db = new Dexie('MyDentalCareDB');

// Define database schema - B2B Professional Stores only
db.version(6).stores({
  userProfile: 'key, value',
  b2bClients: '++id, name, type, contactPerson, email, phone, address, discountTier',
  b2bProducts: '++id, name, category, sku, price, stock, minStock',
  b2bOrders: '++id, clientId, productIds, qty, discountAmount, finalAmount, status, paymentStatus, orderDate, dueDate',
  implantCases: '++id, patientName, doctorId, toothNumber, implantProductId, stage, startDate, lastFollowUpDate, nextFollowUpDate',
  automatedReminders: '++id, recipientId, type, title, message, status, dateScheduled, dateSent',
  customGuides: '++id, title, desc, youtubeId, tag',
  b2bPurchaseOrders: '++id, supplierName, status, orderDate, expectedDate',
  stockAdjustments: '++id, productId, type, date',
  b2bQuotes: '++id, clientId, status, dateCreated',
  deliveryChallans: '++id, orderId, status',
  creditNotes: '++id, clientId, orderId, date',
  crmLogs: '++id, clientId, date',
  b2bStates: '++id, name',
  b2bWarehouses: '++id, name, address'
});

const B2B_PRODUCTS_SEED = [
  {
    name: 'Two Piece Dental Implant',
    category: 'Implant',
    sku: 'INST-2PC-IMPLANT',
    price: 3500,
    purchaseCost: 1700,
    stock: 40,
    minStock: 5,
    isSerialized: false,
    image: '/products/two-piece-implant.jpeg',
    batches: [
      { batchNo: 'B-2PC-01', expiryDate: Date.now() + 365 * 24 * 60 * 60 * 1000, stock: 40, location: 'Main Warehouse' }
    ],
    material: 'Titanium Gr5 (Ti6Al4V)',
    finish: 'SLA',
    sterilization: 'Gamma',
    warrantyPct: 100,
    bendableAngle: 0,
    sizes: '3.5 x 10mm, 4.0 x 12mm, 4.5 x 14mm'
  },
  {
    name: 'Abutment',
    category: 'Abutment',
    sku: 'INST-ABUT-GEN',
    price: 1800,
    purchaseCost: 900,
    stock: 35,
    minStock: 5,
    isSerialized: false,
    image: '/products/abutment.jpeg',
    batches: [
      { batchNo: 'B-ABU-01', expiryDate: Date.now() + 365 * 24 * 60 * 60 * 1000, stock: 35, location: 'Main Warehouse' }
    ],
    material: 'Titanium Gr5 (Ti6Al4V)',
    finish: 'Polished',
    sterilization: 'ETO',
    warrantyPct: 100,
    bendableAngle: 0,
    sizes: 'Straight, Angled 15°, Angled 25°'
  },
  {
    name: 'Two Piece Implant Kit (ApexKonnect)',
    category: 'Surgical Tool',
    sku: 'INST-KIT-APEXKONNECT',
    price: 8500,
    purchaseCost: 4200,
    stock: 10,
    minStock: 2,
    isSerialized: true,
    serialNumbers: ['SN-APX-001', 'SN-APX-002', 'SN-APX-003', 'SN-APX-004', 'SN-APX-005', 'SN-APX-006', 'SN-APX-007', 'SN-APX-008', 'SN-APX-009', 'SN-APX-010'],
    image: '/products/apexkonnect-kit.jpeg',
    batches: [
      { batchNo: 'B-APX-01', expiryDate: Date.now() + 365 * 24 * 60 * 60 * 1000, stock: 10, location: 'Main Warehouse' }
    ]
  },
  {
    name: 'Dental Implant Kit (Torque Ratchet Set)',
    category: 'Surgical Tool',
    sku: 'INST-DENT-KIT',
    price: 6000,
    purchaseCost: 3000,
    stock: 8,
    minStock: 3,
    isSerialized: true,
    serialNumbers: ['SN-KIT-001', 'SN-KIT-002', 'SN-KIT-003', 'SN-KIT-004', 'SN-KIT-005', 'SN-KIT-006', 'SN-KIT-007', 'SN-KIT-008'],
    image: '/products/dental-implant-kit.jpeg',
    batches: [
      { batchNo: 'B-KIT-01', expiryDate: Date.now() + 365 * 24 * 60 * 60 * 1000, stock: 8, location: 'Main Warehouse' }
    ]
  },
  {
    name: 'Torque Wrench (with driver heads)',
    category: 'Surgical Tool',
    sku: 'INST-TRQ-WRENCH',
    price: 4500,
    purchaseCost: 2200,
    stock: 12,
    minStock: 3,
    isSerialized: true,
    serialNumbers: ['SN-TRQ-001', 'SN-TRQ-002', 'SN-TRQ-003', 'SN-TRQ-004', 'SN-TRQ-005', 'SN-TRQ-006', 'SN-TRQ-007', 'SN-TRQ-008', 'SN-TRQ-009', 'SN-TRQ-010', 'SN-TRQ-011', 'SN-TRQ-012'],
    image: '/products/torque-wrench.jpeg',
    batches: [
      { batchNo: 'B-TRQ-01', expiryDate: Date.now() + 365 * 24 * 60 * 60 * 1000, stock: 12, location: 'Main Warehouse' }
    ]
  },
  {
    name: 'Implant Driver',
    category: 'Surgical Tool',
    sku: 'INST-IMP-DRIVER',
    price: 1500,
    purchaseCost: 750,
    stock: 30,
    minStock: 5,
    isSerialized: false,
    image: '/products/implant-driver.jpeg',
    batches: [
      { batchNo: 'B-DRV-01', expiryDate: Date.now() + 365 * 24 * 60 * 60 * 1000, stock: 30, location: 'Main Warehouse' }
    ]
  },
  {
    name: 'Tapping Drill',
    category: 'Surgical Tool',
    sku: 'INST-TAP-DRILL',
    price: 1200,
    purchaseCost: 600,
    stock: 25,
    minStock: 5,
    isSerialized: false,
    image: '/products/tapping-drill.jpeg',
    batches: [
      { batchNo: 'B-TAP-01', expiryDate: Date.now() + 365 * 24 * 60 * 60 * 1000, stock: 25, location: 'Main Warehouse' }
    ]
  },
  {
    name: 'Lance Drill',
    category: 'Surgical Tool',
    sku: 'INST-LNC-GEN',
    price: 900,
    purchaseCost: 450,
    stock: 20,
    minStock: 5,
    isSerialized: false,
    image: '/products/lance-drill.jpeg',
    batches: [
      { batchNo: 'B-LNC-01', expiryDate: Date.now() + 365 * 24 * 60 * 60 * 1000, stock: 20, location: 'Main Warehouse' }
    ],
    sizes: '2.0mm, 2.8mm'
  },
  {
    name: 'Dental Bone Plate (Assorted Shapes)',
    category: 'Surgical Tool',
    sku: 'INST-BONE-PLATE',
    price: 2500,
    purchaseCost: 1200,
    stock: 15,
    minStock: 5,
    isSerialized: false,
    image: '/products/bone-plates.jpeg',
    batches: [
      { batchNo: 'B-PLT-01', expiryDate: Date.now() + 365 * 24 * 60 * 60 * 1000, stock: 15, location: 'Main Warehouse' }
    ]
  },
  {
    name: 'Bone Screw',
    category: 'Surgical Tool',
    sku: 'INST-SCR-GEN',
    price: 350,
    purchaseCost: 150,
    stock: 50,
    minStock: 10,
    isSerialized: false,
    image: '/products/bone-screws.jpeg',
    batches: [
      { batchNo: 'B-SCR-01', expiryDate: Date.now() + 365 * 24 * 60 * 60 * 1000, stock: 50, location: 'Main Warehouse' }
    ]
  }
];

// v7: client customer-segment tagging + marketing leads module.
// Only tables with actual index changes need restating; unchanged tables carry over.
db.version(7).stores({
  b2bClients: '++id, name, type, contactPerson, email, phone, address, discountTier, customerCategory',
  marketingLeads: '++id, name, customerCategory, region, channel, status, clientId, createdDate'
});

// v8: syncQueue table for offline-first operations queue
db.version(8).stores({
  syncQueue: '++id, table, action, payload, timestamp'
});

// v9: productFeedback table for offline feedback caching
db.version(9).stores({
  productFeedback: '++id, productId, userId, rating, comment, createdAt'
});

// Idempotent Basal implant SKU seed — called on every app boot (not tied to the version(7)
// upgrade transaction, since Dexie skips .upgrade() callbacks entirely for brand-new databases).
export async function seedBasalImplants() {
  // Disabled - all products are seeded in seedDemoData
}

export async function seedSurgicalKit() {
  // Disabled - all products are seeded in seedDemoData
}

// Seed Initial B2B Data
export async function seedDemoData() {
  // Fast-path: Check outside transaction to avoid blocking and overhead on every load
  try {
    const is10Seeded = await db.userProfile.get('dbSeeded10ProductsSupabase');
    const isSeeded = await db.userProfile.get('dbSeeded');
    if (is10Seeded && isSeeded) {
      return;
    }
  } catch (e) {
    console.warn('Fast path seed check failed:', e);
  }

  // Transaction serializes concurrent calls (e.g. React StrictMode's double-invoked
  // effects in dev) so the isSeeded check can't race across two callers.
  await db.transaction('rw', db.tables, async () => {
    // 1. One-time database reset for the new 10 products catalog
    const is10Seeded = await db.userProfile.get('dbSeeded10ProductsSupabase');
    if (!is10Seeded) {
      // Clear old B2B tables to prevent inconsistent/orphaned data
      await db.b2bProducts.clear();
      await db.b2bOrders.clear();
      await db.implantCases.clear();
      await db.b2bQuotes.clear();
      await db.deliveryChallans.clear();
      await db.b2bPurchaseOrders.clear();
      await db.stockAdjustments.clear();

      // Seed the new 10 products locally
      await db.b2bProducts.bulkAdd(B2B_PRODUCTS_SEED);

      // Seed consistent B2B orders referencing product ID 1 (Two Piece Dental Implant)
      await db.b2bOrders.bulkAdd([
        { clientId: 1, productIds: [1], qty: 10, discountAmount: 3500, finalAmount: 31500, amountPaid: 31500, profit: 18000, batchNo: 'B-2PC-01', status: 'Delivered', paymentStatus: 'Paid', orderDate: Date.now() - 3 * 24 * 60 * 60 * 1000, dueDate: Date.now() + 4 * 24 * 60 * 60 * 1000, gstPaid: 3780 }
      ]);

      // Seed consistent implant cases referencing product ID 1 (Two Piece Dental Implant) and ID 2 (Abutment)
      await db.implantCases.bulkAdd([
        { patientName: 'James Miller', doctorId: 1, toothNumber: '36', implantProductId: 1, stage: 'Healing (Abutment)', startDate: Date.now() - 15 * 24 * 60 * 60 * 1000, lastFollowUpDate: Date.now() - 5 * 24 * 60 * 60 * 1000, nextFollowUpDate: Date.now() + 10 * 24 * 60 * 60 * 1000 },
        { patientName: 'Sarah Connor', doctorId: 2, toothNumber: '11', implantProductId: 2, stage: 'Planning', startDate: Date.now() - 2 * 24 * 60 * 60 * 1000, lastFollowUpDate: Date.now() - 2 * 24 * 60 * 60 * 1000, nextFollowUpDate: Date.now() + 3 * 24 * 60 * 60 * 1000 }
      ]);

      // Seed consistent B2B Quotes
      await db.b2bQuotes.bulkAdd([
        { clientId: 1, productIds: [1], qty: 15, discountAmount: 5250, finalAmount: 47250, status: 'Approved', dateCreated: Date.now() - 1 * 24 * 60 * 60 * 1000 }
      ]);

      // Seed consistent B2B Purchase Orders (POs)
      await db.b2bPurchaseOrders.bulkAdd([
        { supplierName: 'Titanium Implants Inc', status: 'Pending', orderDate: Date.now() - 2 * 24 * 60 * 60 * 1000, expectedDate: Date.now() + 5 * 24 * 60 * 60 * 1000, items: [{ sku: 'INST-2PC-IMPLANT', qty: 100, cost: 1700 }] }
      ]);

      // Seed consistent Delivery Challans
      await db.deliveryChallans.bulkAdd([
        { orderId: 1, courierName: 'Professional Couriers', trackingNumber: 'PC-9988223', status: 'Delivered', dispatchDate: Date.now() - 9 * 24 * 60 * 60 * 1000, deliveryDate: Date.now() - 3 * 24 * 60 * 60 * 1000 }
      ]);

      await db.userProfile.put({ key: 'dbSeeded10Products', value: 'true' });
      await db.userProfile.put({ key: 'dbSeeded10ProductsSupabase', value: 'true' });
    }

    const isSeeded = await db.userProfile.get('dbSeeded');
    if (isSeeded) return;

    await db.userProfile.bulkPut([
      { key: 'userName', value: 'Chandra (Simple Implants)' },
      { key: 'role', value: 'B2B Sales Representative' },
      { key: 'gstRates', value: [5, 12, 18, 28] },
      { key: 'defaultGstRate', value: 12 },
      { key: 'dbSeeded', value: 'true' }
    ]);

    // Seed States & Warehouses first for lookup stability
    await db.b2bStates.bulkAdd([
      { name: 'Telangana' },
      { name: 'Andhra Pradesh' },
      { name: 'Tamil Nadu' },
      { name: 'Karnataka' },
      { name: 'Maharashtra' },
      { name: 'Delhi' }
    ]);

    await db.b2bWarehouses.bulkAdd([
      { name: 'Main Warehouse', address: 'Hitech City, Hyderabad' },
      { name: 'Hyderabad Hub', address: 'Secunderabad' },
      { name: 'Rep Kit', address: 'Sales Kit Transit' }
    ]);

    // 1. Seed Clients
    await db.b2bClients.bulkAdd([
      { name: 'Dr. Emily Smith (Bright Smiles)', type: 'Doctor', contactPerson: 'Dr. Emily Smith', email: 'emily.smith@brightsmiles.com', phone: '+91 98765 43210', address: 'Banjara Hills, Road No 12, Hyderabad', discountTier: 'Gold', state: 'Telangana', creditLimit: 200000 },
      { name: 'City Dental Hospital', type: 'Hospital', contactPerson: 'Dr. John Davis', email: 'orders@citydentalhosp.org', phone: '+91 99887 76655', address: 'Near Benz Circle, Vijayawada', discountTier: 'Platinum', state: 'Andhra Pradesh', creditLimit: 500000 },
      { name: 'Dr. Robert Chen (Apex Ortho)', type: 'Doctor', contactPerson: 'Dr. Robert Chen', email: 'rchen@apexortho.com', phone: '+91 91234 56789', address: 'T. Nagar, Chennai', discountTier: 'Standard', state: 'Tamil Nadu', creditLimit: 150000 }
    ]);

    // 5. Seed Automated Reminders
    await db.automatedReminders.bulkAdd([
      { recipientId: 1, type: 'Payment Due', title: 'Invoice Reminder: Order #1', message: 'Reminder: Outstanding balance of ₹67,500 (Invoice Total ₹1,26,000) for Order #1 is pending. Please process at your earliest convenience.', status: 'Sent', dateScheduled: Date.now() - 1 * 24 * 60 * 60 * 1000, dateSent: Date.now() - 1 * 24 * 60 * 60 * 1000 }
    ]);

    // 6. Seed Custom Guides
    await db.customGuides.bulkAdd([
      { title: 'Single Piece Implant (BCS) Clinical Placement Guide', desc: 'Clinical video demonstration showing immediate loading placement of single-piece BCS implants locking into cortical bone.', localPath: '/videos/single_piece_bcs.mp4', tag: 'Implant' },
      { title: 'Two Piece Implant Surgical Placement Walkthrough', desc: 'Step-by-step 3D surgical placement walkthrough of a two-piece implant structure, illustrating bone preparation and fixture loading.', localPath: '/videos/two_piece.mp4', tag: 'Surgical' },
      { title: 'Abutment & Healing Phase Connection Procedure', desc: 'Clinical overview of healing abutment connections, soft tissue conditioning, and preparation for prosthetic crowns.', youtubeId: 'k3D37F026aE', tag: 'Abutment' },
      { title: 'Order Placement & Discount System Tutorial', desc: 'System training video on managing sales, placing custom orders, and setting client discount tiers.', youtubeId: 'Zf8S1PzD1_A', tag: 'System Guide' }
    ]);

    // 11. Seed CRM Logs
    await db.crmLogs.bulkAdd([
      { clientId: 1, notes: 'Visited Dr. Emily. She asked about the next shipment of zygomatic custom models.', date: Date.now() - 6 * 24 * 60 * 60 * 1000 },
      { clientId: 1, notes: 'Phone call. Confirmed order requirements for next month.', date: Date.now() - 2 * 24 * 60 * 60 * 1000 }
    ]);
  });
}

export async function clearAllData() {
  await Promise.all([
    db.userProfile.clear(),
    db.b2bClients.clear(),
    db.b2bProducts.clear(),
    db.b2bOrders.clear(),
    db.implantCases.clear(),
    db.automatedReminders.clear(),
    db.customGuides.clear(),
    db.b2bPurchaseOrders.clear(),
    db.stockAdjustments.clear(),
    db.b2bQuotes.clear(),
    db.deliveryChallans.clear(),
    db.creditNotes.clear(),
    db.crmLogs.clear(),
    db.b2bStates.clear(),
    db.b2bWarehouses.clear(),
    db.marketingLeads.clear(),
    db.syncQueue.clear()
  ]);
  localStorage.clear();
}

// Enqueue a database write to sync when online
export async function enqueueSync(table, action, payload) {
  await db.syncQueue.add({
    table,
    action,
    payload,
    timestamp: Date.now()
  });
  // Trigger sync check in case we are currently online
  if (navigator.onLine) {
    processSyncQueue();
  }
}

// Process all queued sync operations sequentially when online
export async function processSyncQueue() {
  if (!navigator.onLine) return;

  try {
    const queue = await db.syncQueue.orderBy('timestamp').toArray();
    if (!queue.length) return;

    for (const item of queue) {
      let success = false;
      try {
        const { table, action, payload } = item;

        if (table === 'gst_rates') {
          if (action === 'insert') {
            const { error } = await supabase.from('gst_rates').insert(payload);
            if (!error) success = true;
          } else if (action === 'update') {
            const { oldRate, newRate, is_default } = payload;
            if (newRate !== undefined && oldRate !== undefined) {
              const { error } = await supabase.from('gst_rates').update({ rate: newRate }).eq('rate', oldRate);
              if (!error) success = true;
            } else if (is_default !== undefined) {
              const { error: err1 } = await supabase.from('gst_rates').update({ is_default: false }).neq('rate', payload.rate);
              const { error: err2 } = await supabase.from('gst_rates').update({ is_default: true }).eq('rate', payload.rate);
              if (!err1 && !err2) success = true;
            }
          } else if (action === 'delete') {
            const { error } = await supabase.from('gst_rates').delete().eq('rate', payload.rate);
            if (!error) success = true;
          }
        }
      } catch (err) {
        console.warn('Sync queue item execution failed:', err);
      }

      if (success) {
        await db.syncQueue.delete(item.id);
      }
    }
  } catch (e) {
    console.warn('Process sync queue failed:', e);
  }
}
