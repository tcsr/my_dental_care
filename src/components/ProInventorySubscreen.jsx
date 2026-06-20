import { useState, useEffect, useRef } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../utils/db';
import { AlertTriangle, X, Barcode, ClipboardList, Warehouse, Package, Truck, Camera, Download, ChevronLeft, ChevronRight } from 'lucide-react';
import { t } from '../utils/i18n';
import EmptyStateCard from './EmptyStateCard';


const CAT_CONFIG = {
  Implants:    { bg: 'rgba(99,102,241,0.12)',  color: '#6366f1', icon: '🦷' },
  Instruments: { bg: 'rgba(14,165,233,0.12)',  color: '#0ea5e9', icon: '🔧' },
  Materials:   { bg: 'rgba(16,185,129,0.12)',  color: '#10b981', icon: '🧪' },
  PPE:         { bg: 'rgba(245,158,11,0.12)',  color: '#f59e0b', icon: '🧤' },
  Equipment:   { bg: 'rgba(168,85,247,0.12)',  color: '#a855f7', icon: '⚙️' },
  Consumables: { bg: 'rgba(236,72,153,0.12)', color: '#ec4899', icon: '📦' },
};
const DEFAULT_CAT_CONFIG = { bg: 'rgba(14,165,233,0.1)', color: '#0ea5e9', icon: '📦' };

const splitImageUrls = (imageUrlStr) => {
  if (!imageUrlStr) return [];
  if (imageUrlStr.includes('|')) {
    return imageUrlStr.split('|').map(url => url.trim()).filter(Boolean);
  }
  const parts = imageUrlStr.split(',').map(url => url.trim()).filter(Boolean);
  const result = [];
  for (let i = 0; i < parts.length; i++) {
    if (parts[i].startsWith('data:') && i + 1 < parts.length) {
      result.push(parts[i] + ',' + parts[i + 1]);
      i++;
    } else {
      result.push(parts[i]);
    }
  }
  return result;
};

const getCategoryKey = (cat) => {
  if (!cat) return 'General';
  const c = cat.toLowerCase();
  if (c.includes('implant')) return 'Implants';
  if (c.includes('instrument') || c.includes('tool')) return 'Instruments';
  if (c.includes('material') || c.includes('crown') || c.includes('bridge') || c.includes('abutment')) return 'Materials';
  if (c.includes('ppe')) return 'PPE';
  if (c.includes('equipment')) return 'Equipment';
  if (c.includes('consumable')) return 'Consumables';
  return 'General';
};

const getProductImages = (product) => {
  if (product && product.image_url && product.image_url.trim()) {
    return splitImageUrls(product.image_url);
  }
  if (product && product.image && product.image.trim()) {
    return splitImageUrls(product.image);
  }
  return []; // No uploaded image — return empty, show placeholder
};

const getCurrentTimestamp = () => Date.now();
const getRandomNumber = (min, max) => Math.floor(min + Math.random() * (max - min));

export default function ProInventorySubscreen({ lang }) {
  const [subTab, setSubTab] = useState('catalog'); // 'catalog' | 'po'
  const products = useLiveQuery(() => db.b2bProducts.toArray()) || [];
  const purchaseOrders = useLiveQuery(() => db.b2bPurchaseOrders.toArray()) || [];
  const stockAdjustments = useLiveQuery(() => db.stockAdjustments.toArray()) || [];

  // Search & Pagination states
  const [catalogSearch, setCatalogSearch] = useState('');
  const [catalogPage, setCatalogPage] = useState(1);

  const [poSearch, setPoSearch] = useState('');
  const [poPage, setPoPage] = useState(1);

  const [transferSearch, setTransferSearch] = useState('');
  const [transferPage, setTransferPage] = useState(1);

  const itemsPerPage = 5;

  const filteredProducts = products.filter(p => 
    p.name.toLowerCase().includes(catalogSearch.toLowerCase()) || 
    p.sku.toLowerCase().includes(catalogSearch.toLowerCase()) ||
    p.category.toLowerCase().includes(catalogSearch.toLowerCase())
  );
  const totalCatalogPages = Math.ceil(filteredProducts.length / itemsPerPage) || 1;
  const displayedProducts = filteredProducts.slice((catalogPage - 1) * itemsPerPage, catalogPage * itemsPerPage);

  const safetyShortages = products.filter(p => p.stock < p.minStock);
  const allBatches = products.reduce((acc, p) => {
    if (p.batches) {
      p.batches.forEach(b => {
        acc.push({ ...b, productName: p.name, productId: p.id });
      });
    }
    return acc;
  }, []);
  // eslint-disable-next-line react-hooks/purity
  const expiredBatches = allBatches.filter(b => b.expiryDate < Date.now());
  // eslint-disable-next-line react-hooks/purity
  const nearExpiryBatches = allBatches.filter(b => b.expiryDate >= Date.now() && b.expiryDate < Date.now() + 90 * 24 * 60 * 60 * 1000);

  const exportInventoryToCSV = () => {
    try {
      const headers = ['Product ID', 'Product Name', 'SKU Code', 'Category', 'Stock Level', 'Min Required', 'Unit Price'];
      const rows = products.map(item => [
        item.id,
        `"${item.name.replace(/"/g, '""')}"`,
        item.sku,
        item.category,
        item.stock,
        item.minStock,
        item.unitPrice
      ]);

      const csvContent = "data:text/csv;charset=utf-8," 
        + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
      
      const encodedUri = encodeURI(csvContent);
      const link = document.createElement("a");
      link.setAttribute("href", encodedUri);
      link.setAttribute("download", "lal_dental_inventory_catalog.csv");
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (err) {
      console.error("CSV Export error", err);
    }
  };

  const filteredPOs = purchaseOrders.filter(po => 
    po.supplierName.toLowerCase().includes(poSearch.toLowerCase()) || 
    po.id.toString().includes(poSearch) ||
    po.items.some(it => it.sku.toLowerCase().includes(poSearch.toLowerCase()))
  );
  const totalPoPages = Math.ceil(filteredPOs.length / itemsPerPage) || 1;
  const displayedPOs = filteredPOs.slice((poPage - 1) * itemsPerPage, poPage * itemsPerPage);

  const transferLogs = stockAdjustments.filter(adj => adj.type === 'Transfer');
  const filteredTransfers = transferLogs.filter(log => {
    const prod = products.find(p => p.id === log.productId);
    return (
      (prod?.name || '').toLowerCase().includes(transferSearch.toLowerCase()) || 
      (prod?.sku || '').toLowerCase().includes(transferSearch.toLowerCase()) || 
      (log.reason || '').toLowerCase().includes(transferSearch.toLowerCase())
    );
  });
  const totalTransferPages = Math.ceil(filteredTransfers.length / itemsPerPage) || 1;
  const displayedTransfers = [...filteredTransfers].reverse().slice((transferPage - 1) * itemsPerPage, transferPage * itemsPerPage);
  const warehouses = useLiveQuery(() => db.b2bWarehouses.toArray()) || [];
  const warehousesList = warehouses.length > 0 ? warehouses : [
    { id: 'wh-1', name: 'Main Warehouse' },
    { id: 'wh-2', name: 'Hyderabad Hub' },
    { id: 'wh-3', name: 'Rep Kit' }
  ];

  // Form State - Add Batch
  const [targetProdId, setTargetProdId] = useState(null);
  const [qrScanProduct, setQrScanProduct] = useState(null);
  const [newBatchNo, setNewBatchNo] = useState('');
  const [newBatchExpiry, setNewBatchExpiry] = useState('');
  const [newBatchQty, setNewBatchQty] = useState('');
  const [newBatchLocation, setNewBatchLocation] = useState('Main Warehouse');

  // Form State - Add PO
  const [supplierName, setSupplierName] = useState('');
  const [poSku, setPoSku] = useState('');
  const [poQty, setPoQty] = useState('');
  const [poCost, setPoCost] = useState('');

  useEffect(() => {
    if (warehousesList.length > 0) {
      if (!warehousesList.some(w => w.name === newBatchLocation)) {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setNewBatchLocation(warehousesList[0].name);
      }
    }
  }, [warehouses, warehousesList, newBatchLocation]);
  const [expectedDate, setExpectedDate] = useState('');
  const [paymentPo, setPaymentPo] = useState(null);

  // Form State - Warehouse Transfer
  const [transferProdId, setTransferProdId] = useState('');
  const [sourceBatchNo, setSourceBatchNo] = useState('');
  const [destWarehouseName, setDestWarehouseName] = useState('');
  const [transferQty, setTransferQty] = useState('');

  // Reconcile State
  const [reconcileProduct, setReconcileProduct] = useState(null);
  const [physicalCount, setPhysicalCount] = useState('');
  const [reconcileReason, setReconcileReason] = useState('Physical Audit Discrepancy');

  // Serial number tracking state
  const [targetSerialProdId, setTargetSerialProdId] = useState(null);
  const [newSerialNumber, setNewSerialNumber] = useState('');

  // Detailed product preview modal states
  const [selectedProductPreview, setSelectedProductPreview] = useState(null);
  const [carouselIndex, setCarouselIndex] = useState(0);

  const handleAddBatch = async (e) => {
    e.preventDefault();
    if (!targetProdId || !newBatchNo || !newBatchQty) return;

    const prod = products.find(p => p.id === targetProdId);
    if (!prod) return;

    const qtyVal = parseInt(newBatchQty);
    const expiryVal = newBatchExpiry ? new Date(newBatchExpiry).getTime() : getCurrentTimestamp() + 365 * 24 * 60 * 60 * 1000;

    const updatedBatches = [...(prod.batches || [])];
    const existingIndex = updatedBatches.findIndex(b => b.batchNo === newBatchNo);
    if (existingIndex > -1) {
      updatedBatches[existingIndex].stock += qtyVal;
    } else {
      updatedBatches.push({
        batchNo: newBatchNo,
        expiryDate: expiryVal,
        stock: qtyVal,
        location: newBatchLocation
      });
    }

    await db.b2bProducts.update(targetProdId, {
      stock: prod.stock + qtyVal,
      batches: updatedBatches
    });

    setTargetProdId(null);
    setNewBatchNo('');
    setNewBatchQty('');
    setNewBatchExpiry('');
    alert('New batch registered successfully!');
  };

  const handleAdjustStock = async (productId, amount) => {
    const item = products.find(p => p.id === productId);
    if (!item) return;
    const nextStock = Math.max(0, item.stock + amount);

    // Adjust in batches too (first batch or matching)
    let updatedBatches = [...(item.batches || [])];
    if (updatedBatches.length > 0) {
      if (amount > 0) {
        updatedBatches[0].stock += amount;
      } else {
        // deduct from batches sequentially
        let rem = Math.abs(amount);
        for (let i = 0; i < updatedBatches.length; i++) {
          if (updatedBatches[i].stock >= rem) {
            updatedBatches[i].stock -= rem;
            break;
          } else {
            rem -= updatedBatches[i].stock;
            updatedBatches[i].stock = 0;
          }
        }
      }
    }

    await db.b2bProducts.update(productId, { stock: nextStock, batches: updatedBatches });
  };



  // Reconcile physically counted stock
  const handleReconcile = async (e) => {
    e.preventDefault();
    if (!reconcileProduct || physicalCount === '') return;

    const countVal = parseInt(physicalCount);
    const diff = countVal - reconcileProduct.stock;

    if (diff === 0) {
      alert('Physical count matches system stock. No change needed.');
      setReconcileProduct(null);
      return;
    }

    // Log adjustment
    await db.stockAdjustments.add({
      productId: reconcileProduct.id,
      type: diff > 0 ? 'Surplus / Found' : 'Loss / Damaged',
      qtyChange: diff,
      reason: reconcileReason,
      date: Date.now()
    });

    // Update product stock and first batch stock
    let updatedBatches = [...(reconcileProduct.batches || [])];
    if (updatedBatches.length > 0) {
      updatedBatches[0].stock = Math.max(0, updatedBatches[0].stock + diff);
    }

    await db.b2bProducts.update(reconcileProduct.id, {
      stock: countVal,
      batches: updatedBatches
    });

    alert(`Reconciliation applied. Stock adjusted by ${diff > 0 ? '+' : ''}${diff} units.`);
    setReconcileProduct(null);
    setPhysicalCount('');
  };

  // Add Serial Number
  const handleAddSerialNumber = async (e) => {
    e.preventDefault();
    if (!targetSerialProdId || !newSerialNumber) return;

    const prod = products.find(p => p.id === targetSerialProdId);
    if (!prod) return;

    const updatedSerials = [...(prod.serialNumbers || []), newSerialNumber];
    await db.b2bProducts.update(targetSerialProdId, {
      serialNumbers: updatedSerials
    });

    setTargetSerialProdId(null);
    setNewSerialNumber('');
    alert('Serial number added!');
  };

  // Submit PO to supplier
  const handleCreatePO = async (e) => {
    e.preventDefault();
    if (!supplierName || !poSku || !poQty || !poCost) return;

    await db.b2bPurchaseOrders.add({
      supplierName,
      status: 'Pending',
      paymentStatus: 'Unpaid',
      orderDate: Date.now(),
      expectedDate: expectedDate ? new Date(expectedDate).getTime() : Date.now() + 7 * 24 * 60 * 60 * 1000,
      items: [{ sku: poSku, qty: parseInt(poQty), cost: parseFloat(poCost) }]
    });

    setSupplierName('');
    setPoSku('');
    setPoQty('');
    setPoCost('');
    setExpectedDate('');
    alert('Supplier Purchase Order generated!');
  };

  // Receive PO
  const handleReceivePO = async (poId) => {
    const po = purchaseOrders.find(o => o.id === poId);
    if (!po) return;

    // Receive items into inventory
    for (const poItem of po.items) {
      const prod = products.find(p => p.sku === poItem.sku);
      if (prod) {
        const addedStock = poItem.qty;
        const newBatch = {
          batchNo: 'PO-' + po.id + '-' + getRandomNumber(100, 1000),
          expiryDate: getCurrentTimestamp() + 365 * 24 * 60 * 60 * 1000,
          stock: addedStock,
          location: 'Main Warehouse'
        };

        const updatedBatches = [...(prod.batches || []), newBatch];
        await db.b2bProducts.update(prod.id, {
          stock: prod.stock + addedStock,
          batches: updatedBatches
        });
      }
    }

    await db.b2bPurchaseOrders.update(poId, { status: 'Completed' });
    alert('Purchase order marked as Completed. Items added to Main Warehouse!');
  };

  // Warehouse Stock Transfer Handler
  const handleWarehouseTransfer = async (e) => {
    e.preventDefault();
    if (!transferProdId || !sourceBatchNo || !destWarehouseName || !transferQty) return;
    const qtyVal = parseInt(transferQty);
    if (qtyVal <= 0) return;

    const prod = products.find(p => p.id === parseInt(transferProdId));
    if (!prod) return;

    const updatedBatches = [...(prod.batches || [])];
    const sourceBatchIdx = updatedBatches.findIndex(b => b.batchNo === sourceBatchNo);
    if (sourceBatchIdx === -1) {
      alert('Source batch not found.');
      return;
    }

    const sourceBatch = updatedBatches[sourceBatchIdx];
    if (sourceBatch.stock < qtyVal) {
      alert(`Insufficient stock in batch ${sourceBatchNo}. Available: ${sourceBatch.stock}`);
      return;
    }

    if (sourceBatch.location === destWarehouseName) {
      alert('Source location and destination location must be different.');
      return;
    }

    if (!(await confirm(`Confirm transfer of ${qtyVal} units of ${prod.name} from ${sourceBatch.location} to ${destWarehouseName}?`))) {
      return;
    }

    // Deduct from source batch
    sourceBatch.stock -= qtyVal;

    // Add to destination batch
    const destBatchNo = sourceBatchNo;
    const destBatchIdx = updatedBatches.findIndex(b => b.batchNo === destBatchNo && b.location === destWarehouseName);
    
    if (destBatchIdx > -1) {
      updatedBatches[destBatchIdx].stock += qtyVal;
    } else {
      updatedBatches.push({
        batchNo: destBatchNo,
        expiryDate: sourceBatch.expiryDate,
        stock: qtyVal,
        location: destWarehouseName
      });
    }

    // Clean up empty source batch entry if stock is 0
    if (sourceBatch.stock === 0) {
      updatedBatches.splice(sourceBatchIdx, 1);
    }

    // Update database
    await db.b2bProducts.update(prod.id, {
      batches: updatedBatches
    });

    // Add log
    await db.stockAdjustments.add({
      productId: prod.id,
      type: 'Transfer',
      qtyChange: -qtyVal,
      reason: `Transferred from ${sourceBatch.location} to ${destWarehouseName}`,
      date: Date.now()
    });

    // Reset states
    setTransferProdId('');
    setSourceBatchNo('');
    setDestWarehouseName('');
    setTransferQty('');
    alert('Stock transfer completed successfully!');
  };

  return (
    <div className="animate-fade-in" style={{ paddingBottom: '30px' }}>
      
      {/* Sub-tabs Selection */}
      <div className="tab-group">
        <button
          onClick={() => setSubTab('catalog')}
          className={`tab-btn ${subTab === 'catalog' ? 'active' : ''}`}
          style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
        >
          <Package size={14} /> {t('tabCatalog', lang)}
        </button>
        <button
          onClick={() => setSubTab('po')}
          className={`tab-btn ${subTab === 'po' ? 'active' : ''}`}
          style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
        >
          <ClipboardList size={14} /> {t('tabPurchaseOrders', lang)}
        </button>
        <button
          onClick={() => setSubTab('transfers')}
          className={`tab-btn ${subTab === 'transfers' ? 'active' : ''}`}
          style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
        >
          <Truck size={14} /> Transfers
        </button>
      </div>

      {subTab === 'catalog' && (
        <>
          {/* Premium Critical Alerts Hub */}
          {(safetyShortages.length > 0 || expiredBatches.length > 0 || nearExpiryBatches.length > 0) && (
            <div className="glass-card" style={{ padding: '16px 20px', marginBottom: '18px', border: '1px solid hsl(var(--color-hyper) / 15%)', background: 'linear-gradient(135deg, hsl(var(--bg-card)) 0%, hsl(var(--color-hyper) / 2%) 100%)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
                <AlertTriangle size={16} color="hsl(var(--color-hyper))" />
                <h4 style={{ fontSize: '0.82rem', fontWeight: '800', fontFamily: 'Outfit', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'hsl(var(--color-hyper))', margin: 0 }}>
                  Critical Inventory Alerts Hub
                </h4>
              </div>
              
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(115px, 1fr))', gap: '8px' }}>
                {/* Safety Shortages Alert Card */}
                <div className="glass-card" style={{ margin: 0, padding: '10px', textAlign: 'center', background: safetyShortages.length > 0 ? 'hsl(var(--color-hyper) / 4%)' : 'hsl(var(--border-color) / 10%)', borderColor: safetyShortages.length > 0 ? 'hsl(var(--color-hyper) / 18%)' : 'hsl(var(--border-color))' }}>
                  <span style={{ fontSize: '0.62rem', color: 'hsl(var(--text-muted))', display: 'block', fontWeight: 'bold' }}>STOCK SHORTAGES</span>
                  <strong style={{ fontSize: '1.1rem', color: safetyShortages.length > 0 ? 'hsl(var(--color-hyper))' : 'hsl(var(--text-primary))', fontFamily: 'Outfit', display: 'block', marginTop: '2px' }}>
                    {safetyShortages.length}
                  </strong>
                </div>
                {/* Expired Batches Alert Card */}
                <div className="glass-card" style={{ margin: 0, padding: '10px', textAlign: 'center', background: expiredBatches.length > 0 ? 'hsl(var(--color-hyper) / 6%)' : 'hsl(var(--border-color) / 10%)', borderColor: expiredBatches.length > 0 ? 'hsl(var(--color-hyper) / 22%)' : 'hsl(var(--border-color))' }}>
                  <span style={{ fontSize: '0.62rem', color: 'hsl(var(--text-muted))', display: 'block', fontWeight: 'bold' }}>EXPIRED BATCHES</span>
                  <strong style={{ fontSize: '1.1rem', color: expiredBatches.length > 0 ? 'hsl(var(--color-hyper))' : 'hsl(var(--text-primary))', fontFamily: 'Outfit', display: 'block', marginTop: '2px' }}>
                    {expiredBatches.length}
                  </strong>
                </div>
                {/* Near Expiry Alert Card */}
                <div className="glass-card" style={{ margin: 0, padding: '10px', textAlign: 'center', background: nearExpiryBatches.length > 0 ? 'rgba(245, 158, 11, 0.06)' : 'hsl(var(--border-color) / 10%)', borderColor: nearExpiryBatches.length > 0 ? 'rgba(245, 158, 11, 0.22)' : 'hsl(var(--border-color))' }}>
                  <span style={{ fontSize: '0.62rem', color: 'hsl(var(--text-muted))', display: 'block', fontWeight: 'bold' }}>EXPIRING SOON</span>
                  <strong style={{ fontSize: '1.1rem', color: nearExpiryBatches.length > 0 ? '#d97706' : 'hsl(var(--text-primary))', fontFamily: 'Outfit', display: 'block', marginTop: '2px' }}>
                    {nearExpiryBatches.length}
                  </strong>
                </div>
              </div>
            </div>
          )}

          {/* Inventory Visual Stock Chart */}
          <div className="glass-card" style={{ padding: '16px 20px', marginBottom: '18px', border: '1px solid hsl(var(--border-color))' }}>
            <h4 style={{ fontSize: '0.78rem', fontWeight: '800', marginBottom: '14px', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'hsl(var(--text-dim))' }}>
              Stock Level Analysis
            </h4>
            {products.length === 0 ? (
              <span style={{ fontSize: '0.68rem', color: 'hsl(var(--text-muted))' }}>No inventory logged.</span>
            ) : (
              <div style={{ width: '100%', overflowX: 'auto', background: 'hsl(var(--bg-card))', borderRadius: '12px', padding: '8px' }}>
                <svg width="100%" height="180" viewBox="0 0 450 180" preserveAspectRatio="xMidYMid meet">
                  <defs>
                    <linearGradient id="healthyGrad" x1="0%" y1="100%" x2="0%" y2="0%">
                      <stop offset="0%" stopColor="hsl(var(--secondary))" />
                      <stop offset="100%" stopColor="#10b981" stopOpacity="0.85" />
                    </linearGradient>
                    <linearGradient id="lowGrad" x1="0%" y1="100%" x2="0%" y2="0%">
                      <stop offset="0%" stopColor="hsl(var(--color-hyper))" />
                      <stop offset="100%" stopColor="#ef4444" stopOpacity="0.85" />
                    </linearGradient>
                  </defs>
                  
                  {/* Grid Lines */}
                  <line x1="45" y1="20" x2="430" y2="20" stroke="hsl(var(--border-color) / 30%)" strokeDasharray="3,3" />
                  <line x1="45" y1="75" x2="430" y2="75" stroke="hsl(var(--border-color) / 30%)" strokeDasharray="3,3" />
                  <line x1="45" y1="130" x2="430" y2="130" stroke="hsl(var(--border-color) / 30%)" strokeDasharray="3,3" />
                  
                  {/* Axis */}
                  <line x1="45" y1="140" x2="430" y2="140" stroke="hsl(var(--border-color))" strokeWidth="1.5" />
                  
                  {products.slice(0, 7).map((prod, idx) => {
                    const maxStockVal = Math.max(...products.map(p => p.stock), 10);
                    const heightScale = 110;
                    const barHeight = (prod.stock / maxStockVal) * heightScale;
                    const minHeight = (prod.minStock / maxStockVal) * heightScale;
                    const barWidth = 32;
                    const spacing = (380 - (7 * barWidth)) / 8;
                    const x = 45 + spacing + idx * (barWidth + spacing);
                    const y = 140 - barHeight;
                    const isLow = prod.stock < prod.minStock;
                    
                    return (
                      <g key={prod.id}>
                        {/* Minimum Stock Limit Indicator Mark */}
                        <line 
                          x1={x - 4} 
                          y1={140 - minHeight} 
                          x2={x + barWidth + 4} 
                          y2={140 - minHeight} 
                          stroke="hsl(var(--primary))" 
                          strokeWidth="2" 
                          strokeDasharray="2,2"
                          opacity="0.8"
                        />
                        {/* Main Stock Bar */}
                        <rect
                          x={x}
                          y={y}
                          width={barWidth}
                          height={Math.max(barHeight, 4)}
                          rx="4"
                          fill={isLow ? "url(#lowGrad)" : "url(#healthyGrad)"}
                          style={{
                            transition: 'all 0.3s ease',
                            cursor: 'pointer'
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.opacity = '0.8';
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.opacity = '1';
                          }}
                        />
                        {/* Qty Label */}
                        <text
                          x={x + barWidth / 2}
                          y={y - 6}
                          textAnchor="middle"
                          fill={isLow ? "hsl(var(--color-hyper))" : "hsl(var(--text-primary))"}
                          fontSize="9.5"
                          fontWeight="800"
                          fontFamily="Outfit"
                        >
                          {prod.stock}
                        </text>
                        {/* Product SKU Label */}
                        <text
                          x={x + barWidth / 2}
                          y="156"
                          textAnchor="middle"
                          fill="hsl(var(--text-muted))"
                          fontSize="8.5"
                          fontWeight="600"
                          fontFamily="Inter"
                        >
                          {prod.sku}
                        </text>
                      </g>
                    );
                  })}
                </svg>
                {/* Legend */}
                <div style={{ display: 'flex', justifyContent: 'center', gap: '16px', marginTop: '6px', fontSize: '0.62rem', fontWeight: 'bold' }}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '4px', color: 'hsl(var(--secondary))' }}>
                    <span style={{ width: '8px', height: '8px', background: 'hsl(var(--secondary))', borderRadius: '2px' }} /> Healthy Stock
                  </span>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '4px', color: 'hsl(var(--color-hyper))' }}>
                    <span style={{ width: '8px', height: '8px', background: 'hsl(var(--color-hyper))', borderRadius: '2px' }} /> Under Minimum Stock
                  </span>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '4px', color: 'hsl(var(--primary))' }}>
                    <span style={{ width: '10px', height: '2px', borderTop: '2.5px dashed hsl(var(--primary))' }} /> Min Target Line
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* Catalog list */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '18px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '8px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <div style={{ padding: '6px', borderRadius: '8px', background: 'hsl(var(--primary-glow))', color: 'hsl(var(--primary))' }}>
                  <Package size={16} />
                </div>
                <h3 style={{ fontSize: '0.92rem', color: 'hsl(var(--text-primary))', fontWeight: '800', fontFamily: 'Outfit', margin: 0 }}>{t('catalogStock', lang)}</h3>
              </div>
              <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                <button
                  onClick={exportInventoryToCSV}
                  className="btn-primary"
                  style={{ display: 'flex', alignItems: 'center', gap: '4px', padding: '6px 10px', fontSize: '0.68rem', borderRadius: '8px', border: 'none', cursor: 'pointer', fontWeight: 'bold' }}
                >
                  <Download size={12} /> Export CSV
                </button>
                <input 
                  type="text" 
                  placeholder="Search catalog..." 
                  value={catalogSearch} 
                  onChange={(e) => { setCatalogSearch(e.target.value); setCatalogPage(1); }}
                  style={{ padding: '6px 10px', fontSize: '0.72rem', borderRadius: '8px', border: '1px solid hsl(var(--border-color))', outline: 'none', background: 'transparent', color: 'hsl(var(--text-primary))', width: '120px' }}
                />
              </div>
            </div>

            {filteredProducts.length === 0 ? (
              <EmptyStateCard 
                icon={Package} 
                title="No Products Found" 
                message="No products match your search or inventory is empty." 
              />
            ) : (
              displayedProducts.map(item => {
                const isLowStock = item.stock < item.minStock;
                const profitMargin = item.purchaseCost ? ((item.price - item.purchaseCost) / item.price * 100).toFixed(1) : '0';

                return (
                   <div key={item.id} className="glass-card" 
                    onClick={() => { setSelectedProductPreview(item); setCarouselIndex(0); }}
                    style={{
                      padding: '16px', border: isLowStock ? '1px solid hsl(var(--color-hyper))' : '1px solid hsl(var(--border-color))',
                      background: isLowStock ? 'hsl(var(--color-hyper) / 2%)' : 'hsl(var(--bg-card))',
                      cursor: 'pointer'
                    }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                      <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-start', flex: 1 }}>
                        {item.image ? (
                          <img src={item.image.includes('|') ? item.image.split('|')[0] : item.image} alt={item.name} style={{ width: '48px', height: '48px', borderRadius: '8px', objectFit: 'cover', border: '1px solid hsl(var(--border-color))', flexShrink: 0 }} />
                        ) : (
                          <div style={{ width: '48px', height: '48px', borderRadius: '8px', background: 'hsl(var(--primary-glow))', color: 'hsl(var(--primary))', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', fontSize: '1rem', flexShrink: 0 }}>
                            {item.name.charAt(0)}
                          </div>
                        )}
                        <div style={{ flex: 1 }}>
                          <span style={{ fontSize: '0.55rem', fontWeight: '800', color: 'hsl(var(--text-dim))', letterSpacing: '0.05em' }}>
                            {item.sku} • {item.category.toUpperCase()}
                          </span>
                          <h4 style={{ fontSize: '0.88rem', fontWeight: '800', margin: '2px 0 0', color: 'hsl(var(--text-primary))', fontFamily: 'Outfit' }}>
                            {item.name}
                          </h4>
                        <p style={{ fontSize: '0.7rem', color: 'hsl(var(--text-muted))', marginTop: '2px' }}>
                          {t('unitPrice', lang)} <strong style={{ color: 'hsl(var(--text-primary))' }}>₹{item.price}</strong> • Cost: <span style={{ color: 'hsl(var(--text-muted))' }}>₹{item.purchaseCost || 0}</span> • Margin: <strong style={{ color: 'hsl(var(--secondary))' }}>{profitMargin}%</strong>
                        </p>
                      </div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                        <span style={{ fontSize: '0.82rem', fontWeight: 'bold', color: 'hsl(var(--primary))' }}>₹{item.price.toLocaleString('en-IN')}</span>
                        <span style={{ display: 'block', fontSize: '0.58rem', color: 'hsl(var(--text-muted))' }}>Margin: {profitMargin}%</span>
                      </div>
                    </div>

                    {/* Stock Alert Warning */}
                    {isLowStock && (
                      <div style={{
                        marginTop: '8px', display: 'flex', alignItems: 'center', gap: '6px',
                        background: 'hsl(var(--color-hyper) / 8%)', padding: '6px 10px', borderRadius: '6px',
                        color: 'hsl(var(--color-hyper))', fontSize: '0.68rem', fontWeight: 'bold'
                      }}>
                        <AlertTriangle size={12} />
                        <span>Critical stock level! Minimum required: {item.minStock} units</span>
                      </div>
                    )}

                    {/* Serial Numbers Section */}
                    {item.isSerialized && (
                      <div style={{ marginTop: '8px', borderTop: '1px dotted hsl(var(--border-color))', paddingTop: '6px' }}>
                        <span style={{ fontSize: '0.62rem', fontWeight: '800', color: 'hsl(var(--text-dim))', display: 'flex', alignItems: 'center', gap: '4px' }}>
                          <Barcode size={10} /> SERIALIZED surgical tools:
                        </span>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', marginTop: '4px' }}>
                          {item.serialNumbers && item.serialNumbers.map((sn, idx) => (
                            <span key={idx} style={{
                              fontSize: '0.58rem', background: 'hsl(var(--border-color) / 30%)',
                              padding: '2px 5px', borderRadius: '4px', fontFamily: 'monospace'
                            }}>
                              {sn}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Batch numbers and Locations */}
                    {item.batches && item.batches.length > 0 && (
                      <div style={{ marginTop: '8px', borderTop: '1px dotted hsl(var(--border-color))', paddingTop: '6px' }}>
                        <span style={{ fontSize: '0.62rem', fontWeight: '800', color: 'hsl(var(--text-dim))', display: 'flex', alignItems: 'center', gap: '4px' }}>
                          <Warehouse size={10} /> Batches & Multi-warehouse hubs:
                        </span>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '3px', marginTop: '4px' }}>
                          {item.batches.map((b, idx) => {
                            const isExpired = b.expiryDate < Date.now();
                            const isExpiringSoon = !isExpired && b.expiryDate < Date.now() + 90 * 24 * 60 * 60 * 1000;

                            return (
                              <div key={idx} style={{
                                display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.62rem',
                                background: isExpired ? 'hsl(var(--color-hyper) / 4%)' : isExpiringSoon ? 'rgba(245, 158, 11, 0.04)' : 'hsl(var(--border-color) / 15%)',
                                border: '1px solid ' + (isExpired ? 'hsl(var(--color-hyper) / 10%)' : isExpiringSoon ? 'rgba(245, 158, 11, 0.15)' : 'transparent'),
                                padding: '4px 8px', borderRadius: '6px', margin: '2px 0'
                              }}>
                                <span>Batch: <strong>{b.batchNo}</strong> • {b.location}</span>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                  <span style={{ fontWeight: 'bold' }}>Qty: {b.stock}</span>
                                  {isExpired && (
                                    <span style={{
                                      fontSize: '0.52rem', fontWeight: '800', background: 'hsl(var(--color-hyper) / 10%)',
                                      color: 'hsl(var(--color-hyper))', padding: '1px 5px', borderRadius: '4px', textTransform: 'uppercase'
                                    }}>
                                      Expired
                                    </span>
                                  )}
                                  {isExpiringSoon && (
                                    <span style={{
                                      fontSize: '0.52rem', fontWeight: '800', background: 'rgba(245, 158, 11, 0.12)',
                                      color: '#d97706', padding: '1px 5px', borderRadius: '4px', textTransform: 'uppercase'
                                    }}>
                                      Expiring Soon
                                    </span>
                                  )}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    {/* Visual Barcode Simulator */}
                    <div style={{ marginTop: 'auto', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px', background: 'hsl(var(--border-color) / 5%)', padding: '8px', borderRadius: '8px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <Barcode size={24} color="hsl(var(--text-primary))" />
                        <div>
                          <div style={{ letterSpacing: '2px', fontFamily: 'monospace', fontSize: '0.52rem', fontWeight: 'bold', color: 'hsl(var(--text-dim))' }}>
                            |||||||||| | || || |||
                          </div>
                          <span style={{ fontSize: '0.58rem', color: 'hsl(var(--text-muted))' }}>{item.sku}</span>
                        </div>
                      </div>
                      <button
                        onClick={(e) => { e.stopPropagation(); setQrScanProduct(item); }}
                        className="btn-primary"
                        style={{ marginLeft: 'auto', padding: '4px 10px', fontSize: '0.62rem', borderRadius: '6px', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}
                      >
                        <Camera size={11} /> {t('scanBarcode', lang)}
                      </button>
                    </div>

                    {/* Actions Panel */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '10px', paddingTop: '8px', borderTop: '1px solid hsl(var(--border-color))' }}>
                      <div style={{ display: 'flex', gap: '8px' }}>
                        <button 
                          onClick={(e) => { e.stopPropagation(); setTargetProdId(item.id); }}
                          style={{ border: 'none', background: 'none', color: 'hsl(var(--primary))', fontSize: '0.68rem', fontWeight: 'bold', cursor: 'pointer' }}
                        >
                          + {t('addBatch', lang)}
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setReconcileProduct(item);
                            setPhysicalCount(item.stock);
                          }}
                          style={{ border: 'none', background: 'none', color: 'hsl(var(--secondary))', fontSize: '0.68rem', fontWeight: 'bold', cursor: 'pointer' }}
                        >
                          ⚖️ {t('stockReconciliation', lang)}
                        </button>
                      </div>
                      
                      <div style={{ display: 'flex', gap: '6px' }}>
                        <button 
                          onClick={(e) => { e.stopPropagation(); handleAdjustStock(item.id, 5); }}
                          style={{
                            border: 'none', padding: '4px 8px', borderRadius: '4px', fontSize: '0.65rem', fontWeight: '800',
                            background: 'hsl(var(--primary-glow))', color: 'hsl(var(--primary))', cursor: 'pointer'
                          }}
                        >
                          +5
                        </button>
                        <button 
                          onClick={(e) => { e.stopPropagation(); handleAdjustStock(item.id, -1); }}
                          disabled={item.stock === 0}
                          style={{
                            border: 'none', padding: '4px 8px', borderRadius: '4px', fontSize: '0.65rem', fontWeight: '800',
                            background: 'hsl(var(--border-color))', color: 'hsl(var(--text-muted))', cursor: item.stock === 0 ? 'not-allowed' : 'pointer'
                          }}
                        >
                          -1
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })
            )}

            {filteredProducts.length > itemsPerPage && (
              <div style={{ display: 'flex', justifyContent: 'center', gap: '8px', marginTop: '10px' }}>
                <button
                  type="button"
                  disabled={catalogPage === 1}
                  onClick={() => setCatalogPage(prev => Math.max(1, prev - 1))}
                  style={{ padding: '4px 8px', fontSize: '0.7rem', borderRadius: '6px', border: '1px solid hsl(var(--border-color))', background: 'transparent', color: catalogPage === 1 ? 'hsl(var(--text-muted))' : 'hsl(var(--text-primary))', cursor: catalogPage === 1 ? 'not-allowed' : 'pointer' }}
                >
                  Prev
                </button>
                <span style={{ fontSize: '0.72rem', alignSelf: 'center', color: 'hsl(var(--text-muted))' }}>
                  Page {catalogPage} of {totalCatalogPages}
                </span>
                <button
                  type="button"
                  disabled={catalogPage === totalCatalogPages}
                  onClick={() => setCatalogPage(prev => Math.min(totalCatalogPages, prev + 1))}
                  style={{ padding: '4px 8px', fontSize: '0.7rem', borderRadius: '6px', border: '1px solid hsl(var(--border-color))', background: 'transparent', color: catalogPage === totalCatalogPages ? 'hsl(var(--text-muted))' : 'hsl(var(--text-primary))', cursor: catalogPage === totalCatalogPages ? 'not-allowed' : 'pointer' }}
                >
                  Next
                </button>
              </div>
            )}
          </div>
        </>
      )}

      {subTab === 'po' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          
          <div className="glass-card" style={{ padding: '16px', border: '1px solid hsl(var(--border-color))' }}>
            <h3 style={{ fontSize: '0.92rem', color: 'hsl(var(--text-primary))', display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '14px', fontFamily: 'Outfit', fontWeight: '800' }}>
              📝 {t('createPurchaseOrder', lang)}
            </h3>
            <form onSubmit={handleCreatePO} style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <div>
                <label style={{ fontSize: '0.7rem', fontWeight: 'bold' }}>{t('supplierName', lang)}</label>
                <input type="text" required placeholder="e.g. Titanium Implants Inc" value={supplierName} onChange={(e) => setSupplierName(e.target.value)}
                  style={{ width: '100%', padding: '8px', fontSize: '0.78rem', borderRadius: '8px', border: '1px solid hsl(var(--border-color))', background: 'transparent', color: 'hsl(var(--text-primary))' }} />
              </div>
              <div style={{ display: 'flex', gap: '8px' }}>
                <div style={{ flex: 1 }}>
                  <label style={{ fontSize: '0.7rem', fontWeight: 'bold' }}>Select SKU to Buy:</label>
                  <select value={poSku} onChange={(e) => setPoSku(e.target.value)} required
                    style={{ width: '100%', padding: '8px', fontSize: '0.78rem', borderRadius: '8px', border: '1px solid hsl(var(--border-color))', background: 'transparent', color: 'hsl(var(--text-primary))' }}>
                    <option value="">-- Choose --</option>
                    {products.map(p => <option key={p.id} value={p.sku}>{p.sku} ({p.name})</option>)}
                  </select>
                </div>
                <div style={{ flex: 1 }}>
                  <label style={{ fontSize: '0.7rem', fontWeight: 'bold' }}>Order Quantity:</label>
                  <input type="number" required placeholder="Qty" value={poQty} onChange={(e) => setPoQty(e.target.value)}
                    style={{ width: '100%', padding: '8px', fontSize: '0.78rem', borderRadius: '8px', border: '1px solid hsl(var(--border-color))', background: 'transparent', color: 'hsl(var(--text-primary))' }} />
                </div>
              </div>
              <div style={{ display: 'flex', gap: '8px' }}>
                <div style={{ flex: 1 }}>
                  <label style={{ fontSize: '0.7rem', fontWeight: 'bold' }}>Buy Unit Price (₹):</label>
                  <input type="number" required placeholder="Price" value={poCost} onChange={(e) => setPoCost(e.target.value)}
                    style={{ width: '100%', padding: '8px', fontSize: '0.78rem', borderRadius: '8px', border: '1px solid hsl(var(--border-color))', background: 'transparent', color: 'hsl(var(--text-primary))' }} />
                </div>
                <div style={{ flex: 1 }}>
                  <label style={{ fontSize: '0.7rem', fontWeight: 'bold' }}>{t('expectedDelivery', lang)}</label>
                  <input type="date" value={expectedDate} onChange={(e) => setExpectedDate(e.target.value)}
                    style={{ width: '100%', padding: '8px', fontSize: '0.78rem', borderRadius: '8px', border: '1px solid hsl(var(--border-color))', background: 'transparent', color: 'hsl(var(--text-primary))' }} />
                </div>
              </div>
              <button type="submit" className="btn-primary" style={{ padding: '10px', borderRadius: '8px', border: 'none', fontWeight: 'bold', cursor: 'pointer', fontFamily: 'Outfit' }}>
                Generate Supplier Purchase Order
              </button>
            </form>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ fontSize: '0.88rem', fontWeight: '800', fontFamily: 'Outfit', margin: 0 }}>Active Supplier PO List</h3>
              <input 
                type="text" 
                placeholder="Search POs..." 
                value={poSearch} 
                onChange={(e) => { setPoSearch(e.target.value); setPoPage(1); }}
                style={{ padding: '6px 10px', fontSize: '0.72rem', borderRadius: '8px', border: '1px solid hsl(var(--border-color))', outline: 'none', background: 'transparent', color: 'hsl(var(--text-primary))', width: '150px' }}
              />
            </div>
            {filteredPOs.length === 0 ? (
              <EmptyStateCard 
                icon={ClipboardList} 
                title="No Supplier POs Found" 
                message="No purchase orders match your search or exist in the system." 
              />
            ) : (
              displayedPOs.map(po => (
                <div key={po.id} className="glass-card" style={{ padding: '12px', border: '1px solid hsl(var(--border-color))' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <span style={{ fontSize: '0.58rem', color: 'hsl(var(--text-dim))' }}>PO ID: #{po.id} • {t('orderDate', lang)} {new Date(po.orderDate).toLocaleDateString()}</span>
                      <h4 style={{ fontSize: '0.8rem', fontWeight: 'bold', margin: '2px 0 0' }}>{po.supplierName}</h4>
                    </div>
                    <div style={{ display: 'flex', gap: '6px' }}>
                      <span style={{
                        fontSize: '0.62rem', fontWeight: 'bold', padding: '2px 6px', borderRadius: '6px',
                        background: po.status === 'Completed' ? 'hsl(var(--secondary) / 10%)' : 'hsl(var(--primary) / 10%)',
                        color: po.status === 'Completed' ? 'hsl(var(--secondary))' : 'hsl(var(--primary))'
                      }}>{po.status}</span>
                      <span style={{
                        fontSize: '0.62rem', fontWeight: 'bold', padding: '2px 6px', borderRadius: '6px',
                        background: po.paymentStatus === 'Paid' ? 'hsl(var(--secondary) / 10%)' : 'hsl(var(--color-hyper) / 10%)',
                        color: po.paymentStatus === 'Paid' ? 'hsl(var(--secondary))' : 'hsl(var(--color-hyper))'
                      }}>{po.paymentStatus || 'Unpaid'}</span>
                    </div>
                  </div>
                  <div style={{ marginTop: '8px', fontSize: '0.72rem', color: 'hsl(var(--text-muted))' }}>
                    {po.items.map((it, index) => (
                      <div key={index}>Buying: <strong style={{ color: 'hsl(var(--text-primary))' }}>{it.qty}x</strong> {it.sku} @ ₹{it.cost}/ea</div>
                    ))}
                    <div style={{ fontSize: '0.65rem', marginTop: '4px' }}>Expected By: {new Date(po.expectedDate).toLocaleDateString()}</div>
                  </div>

                  <div style={{ display: 'flex', gap: '8px', marginTop: '8px' }}>
                    {po.status === 'Pending' && (
                      <button
                        onClick={() => handleReceivePO(po.id)}
                        style={{
                          flex: 1, padding: '6px', border: 'none', borderRadius: '6px', fontSize: '0.7rem', fontWeight: 'bold', cursor: 'pointer',
                          background: 'hsl(var(--secondary) / 10%)', color: 'hsl(var(--secondary))'
                        }}
                      >
                        Receive Shipment & Update Stock
                      </button>
                    )}
                    {(po.paymentStatus || 'Unpaid') === 'Unpaid' && (
                      <button
                        onClick={() => setPaymentPo(po)}
                        style={{
                          flex: 1, padding: '6px', border: 'none', borderRadius: '6px', fontSize: '0.7rem', fontWeight: 'bold', cursor: 'pointer',
                          background: 'hsl(var(--primary) / 10%)', color: 'hsl(var(--primary))'
                        }}
                      >
                        💳 Pay Supplier
                      </button>
                    )}
                  </div>
                </div>
              ))
            )}

            {filteredPOs.length > itemsPerPage && (
              <div style={{ display: 'flex', justifyContent: 'center', gap: '8px', marginTop: '10px' }}>
                <button
                  type="button"
                  disabled={poPage === 1}
                  onClick={() => setPoPage(prev => Math.max(1, prev - 1))}
                  style={{ padding: '4px 8px', fontSize: '0.7rem', borderRadius: '6px', border: '1px solid hsl(var(--border-color))', background: 'transparent', color: poPage === 1 ? 'hsl(var(--text-muted))' : 'hsl(var(--text-primary))', cursor: poPage === 1 ? 'not-allowed' : 'pointer' }}
                >
                  Prev
                </button>
                <span style={{ fontSize: '0.72rem', alignSelf: 'center', color: 'hsl(var(--text-muted))' }}>
                  Page {poPage} of {totalPoPages}
                </span>
                <button
                  type="button"
                  disabled={poPage === totalPoPages}
                  onClick={() => setPoPage(prev => Math.min(totalPoPages, prev + 1))}
                  style={{ padding: '4px 8px', fontSize: '0.7rem', borderRadius: '6px', border: '1px solid hsl(var(--border-color))', background: 'transparent', color: poPage === totalPoPages ? 'hsl(var(--text-muted))' : 'hsl(var(--text-primary))', cursor: poPage === totalPoPages ? 'not-allowed' : 'pointer' }}
                >
                  Next
                </button>
              </div>
            )}
          </div>

        </div>
      )}

      {subTab === 'transfers' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div className="glass-card" style={{ padding: '16px', border: '1px solid hsl(var(--border-color))' }}>
            <h3 style={{ fontSize: '0.92rem', color: 'hsl(var(--text-primary))', display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '14px', fontFamily: 'Outfit', fontWeight: '800' }}>
              🚚 Warehouse Stock Transfer
            </h3>
            <form onSubmit={handleWarehouseTransfer} style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <div>
                <label style={{ fontSize: '0.7rem', fontWeight: 'bold' }}>Select Product:</label>
                <select value={transferProdId} onChange={(e) => {
                  setTransferProdId(e.target.value);
                  setSourceBatchNo('');
                }} required
                  style={{ width: '100%', padding: '8px', fontSize: '0.78rem', borderRadius: '8px', border: '1px solid hsl(var(--border-color))', background: 'transparent', color: 'hsl(var(--text-primary))' }}>
                  <option value="">-- Choose Product --</option>
                  {products.map(p => <option key={p.id} value={p.id}>{p.sku} ({p.name})</option>)}
                </select>
              </div>

              {transferProdId && (
                <div>
                  <label style={{ fontSize: '0.7rem', fontWeight: 'bold' }}>Select Source Batch / Warehouse:</label>
                  <select value={sourceBatchNo} onChange={(e) => setSourceBatchNo(e.target.value)} required
                    style={{ width: '100%', padding: '8px', fontSize: '0.78rem', borderRadius: '8px', border: '1px solid hsl(var(--border-color))', background: 'transparent', color: 'hsl(var(--text-primary))' }}>
                    <option value="">-- Choose Batch --</option>
                    {(products.find(p => p.id === parseInt(transferProdId))?.batches || []).map(b => (
                      <option key={b.batchNo} value={b.batchNo}>
                        Batch: {b.batchNo} at {b.location} (Stock: {b.stock})
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div style={{ display: 'flex', gap: '8px' }}>
                <div style={{ flex: 1 }}>
                  <label style={{ fontSize: '0.7rem', fontWeight: 'bold' }}>Destination Warehouse:</label>
                  <select value={destWarehouseName} onChange={(e) => setDestWarehouseName(e.target.value)} required
                    style={{ width: '100%', padding: '8px', fontSize: '0.78rem', borderRadius: '8px', border: '1px solid hsl(var(--border-color))', background: 'transparent', color: 'hsl(var(--text-primary))' }}>
                    <option value="">-- Choose Destination --</option>
                    {warehousesList.map(w => (
                      <option key={w.id} value={w.name}>{w.name}</option>
                    ))}
                  </select>
                </div>
                <div style={{ flex: 1 }}>
                  <label style={{ fontSize: '0.7rem', fontWeight: 'bold' }}>Quantity to Transfer:</label>
                  <input type="number" required placeholder="Qty" value={transferQty} onChange={(e) => setTransferQty(e.target.value)}
                    style={{ width: '100%', padding: '8px', fontSize: '0.78rem', borderRadius: '8px', border: '1px solid hsl(var(--border-color))', background: 'transparent', color: 'hsl(var(--text-primary))' }} />
                </div>
              </div>

              <button type="submit" className="btn-primary" style={{ padding: '10px', borderRadius: '8px', border: 'none', fontWeight: 'bold', cursor: 'pointer', fontFamily: 'Outfit' }}>
                Execute Warehouse Stock Transfer
              </button>
            </form>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ fontSize: '0.88rem', fontWeight: '800', fontFamily: 'Outfit', margin: 0 }}>Recent Transfer Logs</h3>
              <input 
                type="text" 
                placeholder="Search transfers..." 
                value={transferSearch} 
                onChange={(e) => { setTransferSearch(e.target.value); setTransferPage(1); }}
                style={{ padding: '6px 10px', fontSize: '0.72rem', borderRadius: '8px', border: '1px solid hsl(var(--border-color))', outline: 'none', background: 'transparent', color: 'hsl(var(--text-primary))', width: '150px' }}
              />
            </div>
            {filteredTransfers.length === 0 ? (
              <EmptyStateCard 
                icon={Truck} 
                title="No Transfers Found" 
                message="No stock transfers match your search or exist in the system." 
              />
            ) : (
              displayedTransfers.map(log => {
                const prod = products.find(p => p.id === log.productId);
                return (
                  <div key={log.id} className="glass-card" style={{ padding: '12px', border: '1px solid hsl(var(--border-color))' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.7rem' }}>
                      <span><strong>{prod?.name || 'Unknown Product'}</strong> ({prod?.sku})</span>
                      <span style={{ color: 'hsl(var(--text-muted))' }}>{new Date(log.date).toLocaleString()}</span>
                    </div>
                    <div style={{ fontSize: '0.68rem', color: 'hsl(var(--text-muted))', marginTop: '4px' }}>
                      Status: <strong style={{ color: 'hsl(var(--secondary))' }}>Transferred</strong> • {log.reason}
                    </div>
                  </div>
                );
              })
            )}

            {filteredTransfers.length > itemsPerPage && (
              <div style={{ display: 'flex', justifyContent: 'center', gap: '8px', marginTop: '10px' }}>
                <button
                  type="button"
                  disabled={transferPage === 1}
                  onClick={() => setTransferPage(prev => Math.max(1, prev - 1))}
                  style={{ padding: '4px 8px', fontSize: '0.7rem', borderRadius: '6px', border: '1px solid hsl(var(--border-color))', background: 'transparent', color: transferPage === 1 ? 'hsl(var(--text-muted))' : 'hsl(var(--text-primary))', cursor: transferPage === 1 ? 'not-allowed' : 'pointer' }}
                >
                  Prev
                </button>
                <span style={{ fontSize: '0.72rem', alignSelf: 'center', color: 'hsl(var(--text-muted))' }}>
                  Page {transferPage} of {totalTransferPages}
                </span>
                <button
                  type="button"
                  disabled={transferPage === totalTransferPages}
                  onClick={() => setTransferPage(prev => Math.min(totalTransferPages, prev + 1))}
                  style={{ padding: '4px 8px', fontSize: '0.7rem', borderRadius: '6px', border: '1px solid hsl(var(--border-color))', background: 'transparent', color: transferPage === totalTransferPages ? 'hsl(var(--text-muted))' : 'hsl(var(--text-primary))', cursor: transferPage === totalTransferPages ? 'not-allowed' : 'pointer' }}
                >
                  Next
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Reconcile Modal */}
      {reconcileProduct && (
        <div className="modal-overlay-container">
          <div className="modal-content-card animate-fade-in">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ fontSize: '0.9rem', fontWeight: 'bold', fontFamily: 'Outfit' }}>⚖️ Physical Stock Audit Reconciliation</h3>
              <button onClick={() => setReconcileProduct(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'hsl(var(--text-muted))' }}>
                <X size={16} />
              </button>
            </div>
            <p style={{ fontSize: '0.7rem', color: 'hsl(var(--text-muted))' }}>
              Item: <strong>{reconcileProduct.name}</strong> ({reconcileProduct.sku})<br />
              System Stock: <strong>{reconcileProduct.stock}</strong> units.
            </p>
            <form onSubmit={handleReconcile} style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <div>
                <label style={{ fontSize: '0.68rem', fontWeight: 'bold', display: 'block', marginBottom: '2px' }}>Actual Physically Counted Count:</label>
                <input type="number" required value={physicalCount} onChange={(e) => setPhysicalCount(e.target.value)}
                  style={{ width: '100%', padding: '8px', fontSize: '0.78rem', borderRadius: '6px', border: '1px solid hsl(var(--border-color))', background: 'transparent', color: 'hsl(var(--text-primary))' }} />
              </div>
              <div>
                <label style={{ fontSize: '0.68rem', fontWeight: 'bold', display: 'block', marginBottom: '2px' }}>Adjustment Reason:</label>
                <select value={reconcileReason} onChange={(e) => setReconcileReason(e.target.value)}
                  style={{ width: '100%', padding: '8px', fontSize: '0.78rem', borderRadius: '6px', border: '1px solid hsl(var(--border-color))', background: 'transparent', color: 'hsl(var(--text-primary))' }}>
                  <option value="Physical Audit Discrepancy">Physical Audit Discrepancy</option>
                  <option value="Loss / Damaged">Loss / Damaged</option>
                  <option value="Bonus / Vendor Correction">Bonus / Vendor Correction</option>
                  <option value="Expired Product Disposal">Expired Product Disposal</option>
                </select>
              </div>
              <button type="submit" className="btn-primary" style={{ padding: '10px', borderRadius: '8px', border: 'none', fontWeight: 'bold', cursor: 'pointer', marginTop: '6px' }}>
                Confirm Stock Adjustment
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Target Serial registration modal */}
      {targetSerialProdId && (
        <div className="modal-overlay-container">
          <div className="modal-content-card animate-fade-in">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ fontSize: '0.9rem', fontWeight: 'bold', fontFamily: 'Outfit' }}>➕ Register New Serial Number</h3>
              <button onClick={() => setTargetSerialProdId(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'hsl(var(--text-muted))' }}>
                <X size={16} />
              </button>
            </div>
            <form onSubmit={handleAddSerialNumber} style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <div>
                <label style={{ fontSize: '0.68rem', fontWeight: 'bold', display: 'block', marginBottom: '2px' }}>Serial Number / Barcode Text:</label>
                <input type="text" required value={newSerialNumber} onChange={(e) => setNewSerialNumber(e.target.value)} placeholder="e.g. SN-ZIR-5521"
                  style={{ width: '100%', padding: '8px', fontSize: '0.78rem', borderRadius: '6px', border: '1px solid hsl(var(--border-color))', background: 'transparent', color: 'hsl(var(--text-primary))' }} />
              </div>
              <button type="submit" className="btn-primary" style={{ padding: '10px', borderRadius: '8px', border: 'none', fontWeight: 'bold', cursor: 'pointer', marginTop: '6px' }}>
                Add Serial Number
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Target Add Batch modal */}
      {targetProdId && (
        <div className="modal-overlay-container">
          <div className="modal-content-card animate-fade-in">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ fontSize: '0.9rem', fontWeight: 'bold', fontFamily: 'Outfit' }}>➕ Register New Product Batch</h3>
              <button onClick={() => setTargetProdId(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'hsl(var(--text-muted))' }}>
                <X size={16} />
              </button>
            </div>
            <form onSubmit={handleAddBatch} style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <div>
                <label style={{ fontSize: '0.68rem', fontWeight: 'bold', display: 'block', marginBottom: '2px' }}>Batch / Lot ID:</label>
                <input type="text" required value={newBatchNo} onChange={(e) => setNewBatchNo(e.target.value)} placeholder="e.g. F40-26X"
                  style={{ width: '100%', padding: '8px', fontSize: '0.78rem', borderRadius: '6px', border: '1px solid hsl(var(--border-color))', background: 'transparent', color: 'hsl(var(--text-primary))' }} />
              </div>
              <div style={{ display: 'flex', gap: '8px' }}>
                <div style={{ flex: 1 }}>
                  <label style={{ fontSize: '0.68rem', fontWeight: 'bold', display: 'block', marginBottom: '2px' }}>Batch Qty:</label>
                  <input type="number" required value={newBatchQty} onChange={(e) => setNewBatchQty(e.target.value)} placeholder="e.g. 20"
                    style={{ width: '100%', padding: '8px', fontSize: '0.78rem', borderRadius: '6px', border: '1px solid hsl(var(--border-color))', background: 'transparent', color: 'hsl(var(--text-primary))' }} />
                </div>
                <div style={{ flex: 1 }}>
                  <label style={{ fontSize: '0.68rem', fontWeight: 'bold', display: 'block', marginBottom: '2px' }}>Expiry Date:</label>
                  <input type="date" value={newBatchExpiry} onChange={(e) => setNewBatchExpiry(e.target.value)}
                    style={{ width: '100%', padding: '8px', fontSize: '0.78rem', borderRadius: '6px', border: '1px solid hsl(var(--border-color))', background: 'transparent', color: 'hsl(var(--text-primary))' }} />
                </div>
              </div>
              <div>
                <label style={{ fontSize: '0.68rem', fontWeight: 'bold', display: 'block', marginBottom: '2px' }}>Warehouse Location:</label>
                <select value={newBatchLocation} onChange={(e) => setNewBatchLocation(e.target.value)}
                  style={{ width: '100%', padding: '8px', fontSize: '0.78rem', borderRadius: '6px', border: '1px solid hsl(var(--border-color))', background: 'transparent', color: 'hsl(var(--text-primary))' }}>
                  {warehousesList.map(w => (
                    <option key={w.id} value={w.name}>{w.name}</option>
                  ))}
                </select>
              </div>
              <button type="submit" className="btn-primary" style={{ padding: '10px', borderRadius: '8px', border: 'none', fontWeight: 'bold', cursor: 'pointer', marginTop: '6px' }}>
                Add Batch to Inventory
              </button>
            </form>
          </div>
        </div>
      )}



      {/* Supplier PO Payout Simulator */}
      {paymentPo && (
        <div className="modal-overlay-container">
          <div className="modal-content-card animate-fade-in">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ fontSize: '0.95rem', fontWeight: '800', fontFamily: 'Outfit' }}>💳 B2B Corporate Payout Simulator</h3>
              <button onClick={() => setPaymentPo(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'hsl(var(--text-muted))' }}>
                <X size={18} />
              </button>
            </div>
            
            <div style={{ background: 'hsl(var(--border-color) / 10%)', padding: '12px', borderRadius: '12px', fontSize: '0.72rem' }}>
              <div style={{ color: 'hsl(var(--text-muted))', marginBottom: '4px' }}>Paying Supplier:</div>
              <div style={{ fontSize: '0.85rem', fontWeight: 'bold', color: 'hsl(var(--text-primary))' }}>{paymentPo.supplierName}</div>
              <div style={{ marginTop: '8px', borderTop: '1px solid hsl(var(--border-color) / 20%)', paddingTop: '6px', display: 'flex', justifyContent: 'space-between' }}>
                <span>Total Amount:</span>
                <strong style={{ color: 'hsl(var(--primary))' }}>
                  ₹{(paymentPo.items.reduce((sum, item) => sum + (item.qty * item.cost), 0)).toLocaleString('en-IN')}
                </strong>
              </div>
            </div>

            <div>
              <label style={{ fontSize: '0.68rem', fontWeight: 'bold', display: 'block', marginBottom: '4px' }}>Choose Settlement Account:</label>
              <select style={{ width: '100%', padding: '10px', fontSize: '0.78rem', borderRadius: '8px', border: '1px solid hsl(var(--border-color))', background: 'transparent', color: 'hsl(var(--text-primary))' }}>
                <option value="corporate-axis">HDFC Bank Corporate A/c - *9908 (INR)</option>
                <option value="corporate-sbi">SBI Cash Credit A/c - *4451 (INR)</option>
                <option value="nodal-icici">ICICI Nodal Escrow A/c - *2289 (INR)</option>
              </select>
            </div>

            <div>
              <label style={{ fontSize: '0.68rem', fontWeight: 'bold', display: 'block', marginBottom: '4px' }}>Payment Method:</label>
              <select style={{ width: '100%', padding: '10px', fontSize: '0.78rem', borderRadius: '8px', border: '1px solid hsl(var(--border-color))', background: 'transparent', color: 'hsl(var(--text-primary))' }}>
                <option value="neft">NEFT / RTGS (Immediate B2B Settlement)</option>
                <option value="imps">IMPS Instant Corporate Payout</option>
                <option value="upi">UPI ID / Corporate QR Code</option>
              </select>
            </div>

            <button
              onClick={async () => {
                await db.b2bPurchaseOrders.update(paymentPo.id, { paymentStatus: 'Paid' });
                setPaymentPo(null);
                alert('B2B Corporate Payout approved and settled successfully!');
              }}
              className="btn-primary"
              style={{ padding: '12px', borderRadius: '10px', fontWeight: 'bold', border: 'none', cursor: 'pointer', width: '100%', fontFamily: 'Outfit' }}
            >
              Confirm & Authorize Payout
            </button>
          </div>
        </div>
      )}

      {selectedProductPreview && (() => {
        const images = getProductImages(selectedProductPreview);
        const stockVal = selectedProductPreview.stock || 0;
        const outOfStock = stockVal <= 0;
        const lowStock = !outOfStock && selectedProductPreview.stock < (selectedProductPreview.minStock || 5);

        const catKey = getCategoryKey(selectedProductPreview.category);
        const cs = CAT_CONFIG[catKey] || DEFAULT_CAT_CONFIG;

        return (
          <div style={{ position: 'fixed', inset: 0, zIndex: 4000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16, boxSizing: 'border-box' }}>
            <style>{`
              @keyframes fadeIn {
                from { opacity: 0; }
                to { opacity: 1; }
              }
              @keyframes slideUp {
                from { transform: translateY(20px); opacity: 0; }
                to { transform: translateY(0); opacity: 1; }
              }
            `}</style>
            
            <div 
              onClick={() => { setSelectedProductPreview(null); setCarouselIndex(0); }} 
              style={{ position: 'absolute', inset: 0, background: 'rgba(15, 23, 42, 0.45)', backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)', animation: 'fadeIn 0.2s ease-out' }} 
            />
            
            <div style={{ position: 'relative', background: 'hsl(var(--bg-card))', border: '1px solid hsl(var(--border-color))', borderRadius: 24, width: '100%', maxWidth: 440, maxHeight: '90vh', display: 'flex', flexDirection: 'column', overflow: 'hidden', boxShadow: '0 24px 64px rgba(15, 23, 42, 0.25)', animation: 'slideUp 0.25s cubic-bezier(0.16, 1, 0.3, 1)', zIndex: 1 }}>
              
              {/* Image Carousel */}
              <div style={{ position: 'relative', width: '100%', height: 260, background: 'hsl(var(--bg-dark))', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                {images.length > 0 ? (
                  <img 
                    src={images[carouselIndex]} 
                    alt={selectedProductPreview.name} 
                    style={{ width: '100%', height: '100%', objectFit: 'cover', transition: 'all 0.3s ease' }} 
                    onError={(e) => { e.target.style.display = 'none'; }}
                  />
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10, opacity: 0.45 }}>
                    <div style={{ fontSize: '4rem' }}>{cs.icon}</div>
                    <span style={{ fontSize: '0.7rem', fontWeight: 700, color: 'hsl(var(--text-muted))', fontFamily: 'Outfit' }}>No images uploaded</span>
                  </div>
                )}

                {/* Close Button overlay */}
                <button 
                  className="modal-close-btn dark-overlay"
                  onClick={() => { setSelectedProductPreview(null); setCarouselIndex(0); }} 
                  style={{ 
                    position: 'absolute', 
                    top: 14, 
                    right: 14, 
                    zIndex: 10
                  }}
                >
                  <X size={15} strokeWidth={2.5} />
                </button>

                {/* Left/Right nav buttons — only when multiple images exist */}
                {images.length > 1 && (
                  <>
                    <button 
                      className="carousel-nav-btn"
                      onClick={(e) => { 
                        e.stopPropagation(); 
                        setCarouselIndex(prev => (prev === 0 ? images.length - 1 : prev - 1)); 
                      }} 
                      style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', zIndex: 10 }}
                    >
                      <ChevronLeft size={18} strokeWidth={2.5} />
                    </button>
                    <button 
                      className="carousel-nav-btn"
                      onClick={(e) => { 
                        e.stopPropagation(); 
                        setCarouselIndex(prev => (prev === images.length - 1 ? 0 : prev + 1)); 
                      }} 
                      style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', zIndex: 10 }}
                    >
                      <ChevronRight size={18} strokeWidth={2.5} />
                    </button>
                  </>
                )}

                {/* Carousel Dots */}
                {images.length > 1 && (
                  <div style={{ position: 'absolute', bottom: 12, left: '50%', transform: 'translateX(-50%)', display: 'flex', gap: 6, zIndex: 10 }}>
                    {images.map((_, idx) => (
                      <button 
                        key={idx} 
                        onClick={(e) => { e.stopPropagation(); setCarouselIndex(idx); }} 
                        style={{ width: 8, height: 8, borderRadius: '50%', border: 'none', background: carouselIndex === idx ? '#fff' : 'rgba(255, 255, 255, 0.45)', cursor: 'pointer', padding: 0, transition: 'all 0.2s' }} 
                      />
                    ))}
                  </div>
                )}
              </div>

              {/* Product Info */}
              <div style={{ padding: 20, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 14 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 }}>
                  <div>
                    <span style={{ fontSize: '0.6rem', fontWeight: 800, color: cs.color, background: cs.bg, padding: '3px 8px', borderRadius: 6, textTransform: 'uppercase', letterSpacing: '0.06em', display: 'inline-block', marginBottom: 6 }}>
                      {selectedProductPreview.category || 'General'}
                    </span>
                    <h2 style={{ fontSize: '1.15rem', fontWeight: 900, color: 'hsl(var(--text-primary))', fontFamily: 'Outfit', margin: 0, lineHeight: 1.3 }}>
                      {selectedProductPreview.name}
                    </h2>
                  </div>
                  <div style={{ textAlign: 'right', flexShrink: 0 }}>
                    <div style={{ fontFamily: 'Outfit', fontWeight: 900, fontSize: '1.25rem', color: '#0ea5e9' }}>
                      ₹{selectedProductPreview.price?.toLocaleString('en-IN')}
                    </div>
                    {selectedProductPreview.unit && (
                      <div style={{ fontSize: '0.65rem', color: 'hsl(var(--text-muted))', marginTop: 1 }}>
                        per {selectedProductPreview.unit}
                      </div>
                    )}
                  </div>
                </div>

                {/* Badges / Stock */}
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  <span style={{ fontSize: '0.62rem', fontWeight: 800, padding: '3px 8px', borderRadius: 6, background: outOfStock ? 'rgba(239,68,68,0.1)' : lowStock ? 'rgba(245,158,11,0.1)' : 'rgba(16,185,129,0.1)', color: outOfStock ? '#ef4444' : lowStock ? '#f59e0b' : '#10b981' }}>
                    {outOfStock ? 'Out of Stock' : lowStock ? `Stock level low (${stockVal})` : 'In Stock'}
                  </span>
                  <span style={{ fontSize: '0.62rem', fontWeight: 800, padding: '3px 8px', borderRadius: 6, background: 'rgba(16,185,129,0.1)', color: '#10b981' }}>
                    Active
                  </span>
                  {selectedProductPreview.sku && (
                    <span style={{ fontSize: '0.62rem', fontWeight: 700, padding: '3px 8px', borderRadius: 6, background: 'hsl(var(--bg-dark))', border: '1px solid hsl(var(--border-color))', color: 'hsl(var(--text-muted))' }}>
                      SKU: {selectedProductPreview.sku}
                    </span>
                  )}
                </div>

                {/* B2B Specific Details Grid */}
                <div style={{ borderTop: '1px solid hsl(var(--border-color))', paddingTop: 12 }}>
                  <h4 style={{ fontSize: '0.72rem', fontWeight: 800, color: 'hsl(var(--text-muted))', textTransform: 'uppercase', letterSpacing: '0.05em', margin: '0 0 8px 0' }}>B2B Inventory Details</h4>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, background: 'hsl(var(--bg-dark))', padding: 12, borderRadius: 12, border: '1px solid hsl(var(--border-color))' }}>
                    <div>
                      <div style={{ fontSize: '0.6rem', color: 'hsl(var(--text-muted))', fontWeight: 700, textTransform: 'uppercase' }}>Purchase Cost</div>
                      <div style={{ fontSize: '0.82rem', fontWeight: 800, color: 'hsl(var(--text-primary))', marginTop: 2 }}>₹{selectedProductPreview.purchaseCost || 0}</div>
                    </div>
                    <div>
                      <div style={{ fontSize: '0.6rem', color: 'hsl(var(--text-muted))', fontWeight: 700, textTransform: 'uppercase' }}>Profit Margin</div>
                      <div style={{ fontSize: '0.82rem', fontWeight: 800, color: '#10b981', marginTop: 2 }}>
                        {selectedProductPreview.purchaseCost ? ((selectedProductPreview.price - selectedProductPreview.purchaseCost) / selectedProductPreview.price * 100).toFixed(1) : '0'}%
                      </div>
                    </div>
                    <div>
                      <div style={{ fontSize: '0.6rem', color: 'hsl(var(--text-muted))', fontWeight: 700, textTransform: 'uppercase' }}>Min Stock Alert</div>
                      <div style={{ fontSize: '0.82rem', fontWeight: 800, color: 'hsl(var(--text-primary))', marginTop: 2 }}>{selectedProductPreview.minStock || 5} units</div>
                    </div>
                    <div>
                      <div style={{ fontSize: '0.6rem', color: 'hsl(var(--text-muted))', fontWeight: 700, textTransform: 'uppercase' }}>Serialized Tracking</div>
                      <div style={{ fontSize: '0.82rem', fontWeight: 800, color: selectedProductPreview.isSerialized ? '#0ea5e9' : 'hsl(var(--text-muted))', marginTop: 2 }}>{selectedProductPreview.isSerialized ? 'Enabled ✅' : 'Disabled ❌'}</div>
                    </div>
                  </div>

                  {/* Serial Numbers tag cloud */}
                  {selectedProductPreview.isSerialized && selectedProductPreview.serialNumbers && selectedProductPreview.serialNumbers.length > 0 && (
                    <div style={{ marginTop: 10 }}>
                      <div style={{ fontSize: '0.62rem', fontWeight: 800, color: 'hsl(var(--text-dim))', display: 'flex', alignItems: 'center', gap: 4, marginBottom: 4 }}>
                        <Barcode size={10} /> Tracked Serial Numbers:
                      </div>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, maxHeight: 60, overflowY: 'auto' }}>
                        {selectedProductPreview.serialNumbers.map((sn, idx) => (
                          <span key={idx} style={{ fontSize: '0.58rem', background: 'hsl(var(--border-color) / 40%)', color: 'hsl(var(--text-primary))', padding: '2px 6px', borderRadius: 4, fontFamily: 'monospace' }}>
                            {sn}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Batches & Locations */}
                  {selectedProductPreview.batches && selectedProductPreview.batches.length > 0 && (
                    <div style={{ marginTop: 12 }}>
                      <div style={{ fontSize: '0.62rem', fontWeight: 800, color: 'hsl(var(--text-dim))', display: 'flex', alignItems: 'center', gap: 4, marginBottom: 6 }}>
                        <Warehouse size={10} /> Batches & Warehouse Mappings:
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 4, maxHeight: 120, overflowY: 'auto' }}>
                        {selectedProductPreview.batches.map((b, idx) => {
                          const isExpired = b.expiryDate < Date.now();
                          const isExpiringSoon = !isExpired && b.expiryDate < Date.now() + 90 * 24 * 60 * 60 * 1000;
                          return (
                            <div key={idx} style={{
                              display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.65rem',
                              background: isExpired ? 'rgba(239, 68, 68, 0.05)' : isExpiringSoon ? 'rgba(245, 158, 11, 0.05)' : 'hsl(var(--border-color) / 10%)',
                              border: '1px solid ' + (isExpired ? 'rgba(239, 68, 68, 0.15)' : isExpiringSoon ? 'rgba(245, 158, 11, 0.2)' : 'transparent'),
                              padding: '6px 10px', borderRadius: 8
                            }}>
                              <span>Batch: <strong style={{ color: 'hsl(var(--text-primary))' }}>{b.batchNo}</strong> • {b.location}</span>
                              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                <span style={{ fontWeight: 800 }}>Qty: {b.stock}</span>
                                {isExpired && (
                                  <span style={{ fontSize: '0.52rem', fontWeight: 800, background: 'rgba(239,68,68,0.1)', color: '#ef4444', padding: '1px 5px', borderRadius: 4, textTransform: 'uppercase' }}>Expired</span>
                                )}
                                {isExpiringSoon && (
                                  <span style={{ fontSize: '0.52rem', fontWeight: 800, background: 'rgba(245,158,11,0.15)', color: '#d97706', padding: '1px 5px', borderRadius: 4, textTransform: 'uppercase' }}>Expiring Soon</span>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>

                {/* Action Footer */}
                <div style={{ borderTop: '1px solid hsl(var(--border-color))', paddingTop: 16, marginTop: 4, display: 'flex', gap: 10 }}>
                  <button 
                    onClick={() => {
                      setSelectedProductPreview(null);
                      setCarouselIndex(0);
                    }}
                    style={{ flex: 1, padding: '12px', borderRadius: 12, border: 'none', background: 'linear-gradient(135deg, #0ea5e9, #6366f1)', color: '#fff', fontSize: '0.82rem', fontWeight: 800, cursor: 'pointer', fontFamily: 'Outfit', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, boxShadow: '0 4px 14px rgba(14,165,233,0.25)' }}
                  >
                    Close Preview
                  </button>
                </div>
              </div>
            </div>
          </div>
        );
      })()}

      {qrScanProduct && (
        <QrScannerModal
          product={qrScanProduct}
          onClose={() => setQrScanProduct(null)}
          onSuccess={async (product) => {
            const nextStock = (product.stock || 0) + 5;
            await db.b2bProducts.update(product.id, { stock: nextStock });
            await db.stockAdjustments.add({
              productId: product.id,
              type: 'Restock via QR Scan',
              date: Date.now()
            });
            setQrScanProduct(null);
          }}
        />
      )}

    </div>
  );
}

function QrScannerModal({ product, onClose, onSuccess }) {
  const videoRef = useRef(null);
  const [hasCamera, setHasCamera] = useState(() => !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia));
  const [status, setStatus] = useState('scanning'); // 'scanning' | 'success'
  const [stream, setStream] = useState(null);

  const handleScanSuccess = () => {
    if (localStorage.getItem('dentalSoundFx') !== 'false') {
      try {
        const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        const oscillator = audioCtx.createOscillator();
        const gainNode = audioCtx.createGain();
        oscillator.connect(gainNode);
        gainNode.connect(audioCtx.destination);
        oscillator.type = 'sine';
        oscillator.frequency.setValueAtTime(1000, audioCtx.currentTime);
        gainNode.gain.setValueAtTime(0.08, audioCtx.currentTime);
        oscillator.start();
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.12);
        oscillator.stop(audioCtx.currentTime + 0.15);
      } catch (e) {
        console.log(e);
      }
    }
    
    setStatus('success');
    setTimeout(() => {
      onSuccess(product);
    }, 1500);
  };

  useEffect(() => {
    if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
      navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } })
        .then(str => {
          setStream(str);
          if (videoRef.current) {
            videoRef.current.srcObject = str;
          }
        })
        .catch(err => {
          console.warn("Camera access denied or not available:", err);
          setHasCamera(false);
        });
    }

    const timer = setTimeout(() => {
      handleScanSuccess();
    }, 2800);

    return () => {
      clearTimeout(timer);
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
    };
  }, []);

  return (
    <div className="modal-overlay-container">
      <div className="modal-content-card animate-fade-in">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid hsl(var(--border-color))', paddingBottom: '8px' }}>
          <div>
            <span style={{ fontSize: '0.6rem', color: 'hsl(var(--primary))', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Inventory Scanner</span>
            <h3 style={{ fontSize: '0.92rem', fontWeight: '800', fontFamily: 'Outfit', margin: 0 }}>QR & Barcode Scan</h3>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'hsl(var(--text-muted))' }}>
            <X size={18} />
          </button>
        </div>

        {status === 'scanning' ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div style={{ position: 'relative', width: '100%', height: '220px', borderRadius: '16px', overflow: 'hidden', background: '#090d16', border: '1px solid hsl(var(--border-color))', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              {hasCamera ? (
                <video ref={videoRef} autoPlay playsInline muted style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px', color: 'hsl(var(--text-muted))', padding: '20px', textAlign: 'center' }}>
                  <Camera size={32} style={{ opacity: 0.5 }} />
                  <span style={{ fontSize: '0.68rem' }}>Webcam simulator active. Scanning pattern...</span>
                </div>
              )}
              {/* Scanning Target frame */}
              <div style={{
                position: 'absolute', width: '160px', height: '160px',
                border: '2px solid hsl(var(--secondary))', borderRadius: '12px',
                boxShadow: '0 0 0 9999px rgba(9, 13, 22, 0.65)',
                display: 'flex', alignItems: 'center', justifyContent: 'center'
              }}>
                {/* Laser animation */}
                <div style={{
                  position: 'absolute', left: 0, right: 0, height: '2px',
                  background: 'hsl(var(--secondary))', boxShadow: '0 0 8px hsl(var(--secondary))',
                  animation: 'scanLaser 2s linear infinite'
                }} />
              </div>
            </div>
            
            <div style={{ textAlign: 'center' }}>
              <span style={{ fontSize: '0.72rem', fontWeight: 'bold' }}>Aligning SKU QR Code:</span>
              <div style={{ fontSize: '0.78rem', color: 'hsl(var(--primary))', fontFamily: 'monospace', fontWeight: '800', letterSpacing: '1px', marginTop: '2px' }}>
                {product.sku}
              </div>
              <p style={{ fontSize: '0.62rem', color: 'hsl(var(--text-muted))', margin: '4px 0 0' }}>
                Detecting scan lines...
              </p>
            </div>

            <button 
              onClick={handleScanSuccess} 
              className="btn-primary" 
              style={{ padding: '8px', fontSize: '0.7rem', borderRadius: '8px', border: 'none', cursor: 'pointer', fontWeight: 'bold' }}
            >
              ⚡ Force QR Scan Match
            </button>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px', padding: '30px 0', textAlign: 'center' }}>
            <div style={{ width: '48px', height: '48px', borderRadius: '50%', background: 'hsl(var(--secondary-glow))', color: 'hsl(var(--secondary))', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.5rem', fontWeight: 'bold' }}>
              ✓
            </div>
            <div>
              <h4 style={{ fontSize: '0.9rem', fontWeight: 'bold', color: 'hsl(var(--secondary))', margin: 0 }}>QR Scan Matched!</h4>
              <p style={{ fontSize: '0.75rem', fontWeight: 'bold', marginTop: '4px' }}>{product.name}</p>
              <p style={{ fontSize: '0.62rem', color: 'hsl(var(--text-muted))', marginTop: '2px' }}>Stock auto-incremented by +5 units.</p>
            </div>
          </div>
        )}
      </div>
      <style>{`
        @keyframes scanLaser {
          0% { top: 0%; }
          50% { top: 100%; }
          100% { top: 0%; }
        }
      `}</style>
    </div>
  );
}
