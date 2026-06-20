import Dexie from 'dexie';

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

// Seed Initial B2B Data
export async function seedDemoData() {
  const isSeeded = await db.userProfile.get('dbSeeded');
  if (isSeeded) return;

  await db.userProfile.bulkPut([
    { key: 'userName', value: 'Chandra (Lal Dental Care)' },
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

  // 2. Seed Products
  await db.b2bProducts.bulkAdd([
    { 
      name: 'Premium Titanium Implant Fixture 4.0mm', 
      category: 'Implant', 
      sku: 'IMP-TIT-40', 
      price: 12500, 
      purchaseCost: 6000,
      stock: 45, 
      minStock: 10,
      isSerialized: true,
      serialNumbers: ['SN-IMP-001', 'SN-IMP-002', 'SN-IMP-003'],
      batches: [
        { batchNo: 'F40-26A', expiryDate: Date.now() + 365 * 24 * 60 * 60 * 1000, stock: 30, location: 'Main Warehouse' },
        { batchNo: 'F40-25B', expiryDate: Date.now() + 90 * 24 * 60 * 60 * 1000, stock: 15, location: 'Hyderabad Hub' } // Expiring soon
      ]
    },
    { 
      name: 'Conical Connection Abutment 4.5mm', 
      category: 'Abutment', 
      sku: 'ABU-CON-45', 
      price: 5000, 
      purchaseCost: 2400,
      stock: 35, 
      minStock: 8,
      isSerialized: false,
      batches: [
        { batchNo: 'A45-26C', expiryDate: Date.now() + 450 * 24 * 60 * 60 * 1000, stock: 35, location: 'Main Warehouse' }
      ]
    },
    { 
      name: 'Zirconia Aesthetic Molar Crown', 
      category: 'Crown', 
      sku: 'CRN-ZIR-MOL', 
      price: 18000, 
      purchaseCost: 9000,
      stock: 4, 
      minStock: 6,
      isSerialized: false,
      batches: [
        { batchNo: 'ZMC-26D', expiryDate: Date.now() + 240 * 24 * 60 * 60 * 1000, stock: 3, location: 'Hyderabad Hub' },
        { batchNo: 'ZMC-24E', expiryDate: Date.now() - 10 * 24 * 60 * 60 * 1000, stock: 1, location: 'Rep Kit' } // Expired
      ]
    },
    { 
      name: 'IPS e.max Anterior Bridge (3-unit)', 
      category: 'Bridge', 
      sku: 'BRG-EMX-ANT', 
      price: 38000, 
      purchaseCost: 18000,
      stock: 3, 
      minStock: 2,
      isSerialized: false,
      batches: [
        { batchNo: 'ABG-26F', expiryDate: Date.now() + 180 * 24 * 60 * 60 * 1000, stock: 3, location: 'Main Warehouse' }
      ]
    }
  ]);

  // 3. Seed Orders
  await db.b2bOrders.bulkAdd([
    { clientId: 1, productIds: [1], qty: 10, discountAmount: 12500, finalAmount: 112500, amountPaid: 45000, profit: 52500, batchNo: 'F40-26A', status: 'In Production', paymentStatus: 'Unpaid', orderDate: Date.now() - 3 * 24 * 60 * 60 * 1000, dueDate: Date.now() + 4 * 24 * 60 * 60 * 1000, gstPaid: 13500 },
    { clientId: 2, productIds: [3], qty: 5, discountAmount: 18000, finalAmount: 72000, amountPaid: 72000, profit: 36000, batchNo: 'ZMC-26D', status: 'Delivered', paymentStatus: 'Paid', orderDate: Date.now() - 10 * 24 * 60 * 60 * 1000, dueDate: Date.now() - 3 * 24 * 60 * 60 * 1000, gstPaid: 8640 }
  ]);

  // 4. Seed Implant Cases
  await db.implantCases.bulkAdd([
    { patientName: 'James Miller', doctorId: 1, toothNumber: '36', implantProductId: 1, stage: 'Healing (Abutment)', startDate: Date.now() - 15 * 24 * 60 * 60 * 1000, lastFollowUpDate: Date.now() - 5 * 24 * 60 * 60 * 1000, nextFollowUpDate: Date.now() + 10 * 24 * 60 * 60 * 1000 },
    { patientName: 'Sarah Connor', doctorId: 2, toothNumber: '11', implantProductId: 3, stage: 'Planning', startDate: Date.now() - 2 * 24 * 60 * 60 * 1000, lastFollowUpDate: Date.now() - 2 * 24 * 60 * 60 * 1000, nextFollowUpDate: Date.now() + 3 * 24 * 60 * 60 * 1000 }
  ]);

  // 5. Seed Automated Reminders
  await db.automatedReminders.bulkAdd([
    { recipientId: 1, type: 'Payment Due', title: 'Invoice Reminder: Order #1', message: 'Reminder: Outstanding balance of ₹67,500 (Invoice Total ₹1,26,000) for Order #1 is pending. Please process at your earliest convenience.', status: 'Sent', dateScheduled: Date.now() - 1 * 24 * 60 * 60 * 1000, dateSent: Date.now() - 1 * 24 * 60 * 60 * 1000 }
  ]);

  // 6. Seed Custom Guides
  await db.customGuides.bulkAdd([
    { title: 'Dental Implant Surgery Guide', desc: 'Step-by-step clinical walkthrough of titanium fixture surgical placement, drills, and osseointegration.', youtubeId: '4iIGfd5IasY', tag: 'Surgical' },
    { title: 'Abutment & Healing Phase Procedure', desc: 'Clinical overview of healing abutment connections, soft tissue conditioning, and preparation for loading.', youtubeId: 'k3D37F026aE', tag: 'Abutment' },
    { title: 'Order Placement & Discount System Tutorial', desc: 'System training video on managing sales, placing custom orders, and setting client discount tiers.', youtubeId: 'Zf8S1PzD1_A', tag: 'System Guide' }
  ]);

  // 7. Seed POs
  await db.b2bPurchaseOrders.bulkAdd([
    { supplierName: 'Titanium Implants Inc', status: 'Pending', orderDate: Date.now() - 2 * 24 * 60 * 60 * 1000, expectedDate: Date.now() + 5 * 24 * 60 * 60 * 1000, items: [{ sku: 'IMP-TIT-40', qty: 100, cost: 5500 }] },
    { supplierName: 'Zirconia Labs Asia', status: 'Completed', orderDate: Date.now() - 15 * 24 * 60 * 60 * 1000, expectedDate: Date.now() - 5 * 24 * 60 * 60 * 1000, items: [{ sku: 'CRN-ZIR-MOL', qty: 20, cost: 8000 }] }
  ]);

  // 8. Seed Stock Adjustments
  await db.stockAdjustments.bulkAdd([
    { productId: 3, type: 'Loss / Damaged', qtyChange: -1, reason: 'Accidental drop during physical count', date: Date.now() - 4 * 24 * 60 * 60 * 1000 }
  ]);

  // 9. Seed Quotes
  await db.b2bQuotes.bulkAdd([
    { clientId: 1, productIds: [1], qty: 15, discountAmount: 18750, finalAmount: 168750, status: 'Draft', dateCreated: Date.now() - 1 * 24 * 60 * 60 * 1000 },
    { clientId: 3, productIds: [2], qty: 10, discountAmount: 0, finalAmount: 50000, status: 'Approved', dateCreated: Date.now() - 5 * 24 * 60 * 60 * 1000 }
  ]);

  // 10. Seed Delivery Challans
  await db.deliveryChallans.bulkAdd([
    { orderId: 2, courierName: 'Professional Couriers', trackingNumber: 'PC-9988223', status: 'Delivered', dispatchDate: Date.now() - 9 * 24 * 60 * 60 * 1000, deliveryDate: Date.now() - 3 * 24 * 60 * 60 * 1000 }
  ]);

  // 11. Seed CRM Logs
  await db.crmLogs.bulkAdd([
    { clientId: 1, notes: 'Visited Dr. Emily. She asked about the next shipment of zygomatic custom models.', date: Date.now() - 6 * 24 * 60 * 60 * 1000 },
    { clientId: 1, notes: 'Phone call. Confirmed order requirements for next month.', date: Date.now() - 2 * 24 * 60 * 60 * 1000 }
  ]);
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
    db.b2bWarehouses.clear()
  ]);
  localStorage.clear();
}
