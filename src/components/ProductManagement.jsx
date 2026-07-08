import { useState, useEffect } from 'react';
import { supabase } from '../utils/supabase';
import { useStore } from '../utils/store';
import { db } from '../utils/db';
import { useLiveQuery } from 'dexie-react-hooks';
import { Plus, Edit3, Trash2, Package, Search, X, ToggleLeft, ToggleRight, ChevronLeft, ChevronRight, Barcode, Warehouse } from 'lucide-react';
import PremiumDatePicker from './ui/PremiumDatePicker';
import PremiumSelect from './ui/PremiumSelect';
import PremiumLoader from './ui/PremiumLoader';
import EmptyStateCard from './EmptyStateCard';

const CATEGORIES = ['Implants', 'Instruments', 'Materials', 'PPE', 'Equipment', 'Consumables'];
const CAT_COLOR = { Implants: '#6366f1', Instruments: '#0ea5e9', Materials: '#10b981', PPE: '#f59e0b', Equipment: '#a855f7', Consumables: '#ec4899' };



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

const resolveUrl = (url) => {
  if (!url) return '';
  if (url.startsWith('http://') || url.startsWith('https://') || url.startsWith('data:') || url.startsWith('blob:')) {
    return url;
  }
  const path = url.startsWith('/') ? url.substring(1) : url;
  const base = import.meta.env.BASE_URL || '/';
  return base + path;
};

const getProductImages = (product) => {
  let urls = [];
  if (product && product.image_url && product.image_url.trim()) {
    urls = splitImageUrls(product.image_url);
  } else if (product && product.image && product.image.trim()) {
    urls = splitImageUrls(product.image);
  }
  return urls.map(resolveUrl);
};

const uploadImage = async (file) => {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result);
    reader.readAsDataURL(file);
  });
};

const B2B_CATEGORIES = ['Implant', 'Abutment', 'Crown', 'Bridge', 'Surgical Tool'];
const EMPTY_B2C = { name: '', category: 'Implants', price: '', stock_qty: '', description: '', active: true, image_url: '' };
const EMPTY_B2B = { name: '', category: 'Implant', sku: '', price: '', purchaseCost: '', stock: '', minStock: '5', isSerialized: false, initialSerial: '', batchNo: '', batchExpiry: '', batchLocation: 'Main Warehouse', image: '', material: '', finish: '', sterilization: 'ETO', warrantyPct: '100', bendableAngle: '0' };
const STERILIZATION_METHODS = ['ETO', 'Autoclave', 'Gamma'];

function Field({ label, children }) {
  return (
    <div>
      <label style={{ fontSize: '0.68rem', fontWeight: 800, color: 'hsl(var(--text-muted))', textTransform: 'uppercase', letterSpacing: '0.06em', display: 'block', marginBottom: 6 }}>{label}</label>
      {children}
    </div>
  );
}

const inputStyle = { width: '100%', padding: '12px 16px', background: 'hsl(var(--bg-dark))', border: '1.5px solid hsl(var(--border-color))', borderRadius: 12, fontSize: '0.88rem', color: 'hsl(var(--text-primary))', outline: 'none', fontFamily: 'Outfit', boxSizing: 'border-box', transition: 'all 0.2s ease' };

export default function ProductManagement() {
  const [subTab, setSubTab] = useState('b2b'); // B2B Rep Catalog
  
  const products = useStore(state => state.products);
  const categories = useStore(state => state.categories);
  const storeLoading = useStore(state => state.loading);
 
  const b2bProducts = useLiveQuery(() => db.b2bProducts.toArray()) || [];
  const warehousesList = useLiveQuery(() => db.b2bWarehouses.toArray()) || [
    { id: 'wh-1', name: 'Main Warehouse' },
    { id: 'wh-2', name: 'Hyderabad Hub' },
    { id: 'wh-3', name: 'Rep Kit' }
  ];
 
  const [categoriesList, setCategoriesList] = useState(CATEGORIES);
  const [catColors, setCatColors] = useState(CAT_COLOR);
  const [search, setSearch] = useState('');
  const [modal, setModal] = useState(null);
  const [form, setForm] = useState(EMPTY_B2B);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(null);
  const [selectedProductPreview, setSelectedProductPreview] = useState(null);
  const [carouselIndex, setCarouselIndex] = useState(0);
  const [uploadingFiles, setUploadingFiles] = useState(false);

  const loading = products.length === 0 && storeLoading;

  const handleFileChange = async (e) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;
    setUploadingFiles(true);

    const uploadedUrls = [];
    for (const file of files) {
      const url = await uploadImage(file);
      if (url) {
        uploadedUrls.push(url);
      }
    }

    if (uploadedUrls.length) {
      if (subTab === 'b2b') {
        const existing = form.image ? splitImageUrls(form.image) : [];
        const updated = [...existing, ...uploadedUrls].join('|');
        setForm(f => ({ ...f, image: updated }));
      } else {
        const existing = form.image_url ? splitImageUrls(form.image_url) : [];
        const updated = [...existing, ...uploadedUrls].join('|');
        setForm(f => ({ ...f, image_url: updated }));
      }
    }
    setUploadingFiles(false);
    e.target.value = '';
  };

  useEffect(() => {
    if (categories && categories.length > 0) {
      setCategoriesList(categories.map(c => c.name));
      const colors = {};
      categories.forEach(c => {
        colors[c.name] = c.text_color || '#0ea5e9';
      });
      setCatColors(colors);
    }
  }, [categories]);

  const openAdd = () => {
    if (subTab === 'b2b') {
      setForm(EMPTY_B2B);
    } else {
      setForm(EMPTY_B2C);
    }
    setModal('add');
  };

  const openEdit = (p) => {
    if (subTab === 'b2b') {
      setForm({
        name: p.name || '',
        category: p.category || 'Implant',
        sku: p.sku || '',
        price: p.price || '',
        purchaseCost: p.purchaseCost || '',
        minStock: p.minStock || 5,
        isSerialized: !!p.isSerialized,
        image: p.image || '',
        material: p.material || '',
        finish: p.finish || '',
        sterilization: p.sterilization || 'ETO',
        warrantyPct: p.warrantyPct ?? '100',
        bendableAngle: p.bendableAngle ?? '0'
      });
    } else {
      setForm({
        name: p.name,
        category: p.category || 'Implants',
        price: p.price,
        stock_qty: p.stock_qty ?? '',
        description: p.description || '',
        active: p.active !== false,
        image_url: p.image_url || ''
      });
    }
    setModal(p);
  };

  const handleSave = async () => {
    if (subTab === 'b2b') {
      if (!form.name.trim() || !form.price || !form.sku.trim()) {
        alert('Please fill out product details (Name, SKU, Price).');
        return;
      }
      setSaving(true);
      const priceNum = parseFloat(form.price);
      const costNum = parseFloat(form.purchaseCost) || Math.round(priceNum * 0.5);
      const stockQty = parseInt(form.stock) || 0;

      const supabasePayload = {
        name: form.name.trim(),
        category: form.category === 'Implant' ? 'Implants' : form.category === 'Abutment' ? 'Materials' : 'Instruments',
        price: priceNum,
        stock_qty: stockQty,
        sku: form.sku.trim(),
        purchase_cost: costNum,
        is_serialized: form.isSerialized,
        image_url: form.image || '',
        active: true
      };

      if (modal === 'add') {
        const finalBatchNo = form.batchNo || 'BATCH-GEN-' + Math.floor(100 + Math.random() * 900);
        const finalExpiry = form.batchExpiry ? new Date(form.batchExpiry).getTime() : Date.now() + 365 * 24 * 60 * 60 * 1000;
        
        const newProduct = {
          name: form.name.trim(),
          category: form.category,
          sku: form.sku.trim(),
          price: priceNum,
          purchaseCost: costNum,
          stock: stockQty,
          minStock: parseInt(form.minStock) || 5,
          isSerialized: form.isSerialized,
          serialNumbers: form.isSerialized && form.initialSerial ? [form.initialSerial] : [],
          image: form.image || '',
          material: form.material?.trim() || '',
          finish: form.finish?.trim() || '',
          sterilization: form.sterilization || 'ETO',
          warrantyPct: parseFloat(form.warrantyPct) || 0,
          bendableAngle: parseFloat(form.bendableAngle) || 0,
          batches: [
            {
              batchNo: finalBatchNo,
              expiryDate: finalExpiry,
              stock: stockQty,
              location: form.batchLocation || 'Main Warehouse'
            }
          ]
        };
        const newId = await db.b2bProducts.add(newProduct);
        try {
          const { data: inserted, error } = await supabase.from('products').insert(supabasePayload).select().single();
          if (!error && inserted) {
            await db.b2bProducts.update(newId, { supabase_id: inserted.id });
          }
        } catch (e) {
          console.error('Supabase insert failed:', e);
        }
        alert('Product added successfully!');
      } else {
        await db.b2bProducts.update(modal.id, {
          name: form.name.trim(),
          category: form.category,
          sku: form.sku.trim(),
          price: priceNum,
          purchaseCost: costNum,
          minStock: parseInt(form.minStock) || 5,
          isSerialized: form.isSerialized,
          image: form.image || '',
          material: form.material?.trim() || '',
          finish: form.finish?.trim() || '',
          sterilization: form.sterilization || 'ETO',
          warrantyPct: parseFloat(form.warrantyPct) || 0,
          bendableAngle: parseFloat(form.bendableAngle) || 0
        });
        const localProd = await db.b2bProducts.get(modal.id);
        try {
          if (localProd && localProd.supabase_id) {
            await supabase.from('products').update(supabasePayload).eq('id', localProd.supabase_id);
          } else {
            const { data: inserted } = await supabase.from('products').insert(supabasePayload).select().single();
            if (inserted) {
              await db.b2bProducts.update(modal.id, { supabase_id: inserted.id });
            }
          }
        } catch (e) {
          console.error('Supabase update failed:', e);
        }
        alert('Product updated successfully!');
      }
      useStore.getState().refresh('products');
      setSaving(false);
      setModal(null);
    } else {
      if (!form.name.trim() || !form.price) return;
      setSaving(true);
      const payload = { name: form.name.trim(), category: form.category, price: Number(form.price), stock_qty: Number(form.stock_qty) || 0, description: form.description?.trim() || null, active: form.active, image_url: form.image_url?.trim() || null };
      if (modal === 'add') {
        await supabase.from('products').insert(payload);
      } else {
        await supabase.from('products').update(payload).eq('id', modal.id);
      }
      useStore.getState().refresh('products');
      setSaving(false);
      setModal(null);
    }
  };

  const handleDelete = async (id) => {
    if (!(await confirm('Delete this product? This cannot be undone.'))) return;
    setDeleting(id);
    if (subTab === 'b2b') {
      const localProd = await db.b2bProducts.get(id);
      try {
        if (localProd && localProd.supabase_id) {
          await supabase.from('products').delete().eq('id', localProd.supabase_id);
        }
      } catch (e) {
        console.error('Supabase delete failed:', e);
      }
      await db.b2bProducts.delete(id);
      alert('Product deleted successfully!');
    } else {
      await supabase.from('products').delete().eq('id', id);
    }
    useStore.getState().refresh('products');
    setDeleting(null);
  };

  const displayProducts = subTab === 'b2b' ? b2bProducts : products;
  
  const filtered = displayProducts.filter(p => !search || p.name?.toLowerCase().includes(search.toLowerCase()));

  const totalCount = displayProducts.length;

  const activeCount = subTab === 'b2b' 
    ? displayProducts.length 
    : displayProducts.filter(p => p.active !== false).length;

  const lowStockCount = subTab === 'b2b'
    ? displayProducts.filter(p => p.stock < p.minStock).length
    : displayProducts.filter(p => (p.stock_qty === null || p.stock_qty === undefined || p.stock_qty <= 5) && p.active !== false).length;

  return (
    <div style={{ paddingBottom: 12 }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 }}>
        <div>
          <h2 style={{ fontFamily: 'Outfit', fontWeight: 900, fontSize: '1.15rem', color: 'hsl(var(--text-primary))', margin: '0 0 2px' }}>
            Product Catalog
          </h2>
          <p style={{ fontSize: '0.72rem', color: 'hsl(var(--text-muted))' }}>
            Manage catalog stock items and details
          </p>
        </div>
        <button onClick={openAdd} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '9px 16px', borderRadius: 12, border: 'none', background: 'linear-gradient(135deg, #0ea5e9, #6366f1)', color: '#fff', fontSize: '0.75rem', fontWeight: 700, cursor: 'pointer', fontFamily: 'Outfit', boxShadow: '0 4px 14px rgba(14,165,233,0.3)', flexShrink: 0 }}>
          <Plus size={14} /> Add Product
        </button>
      </div>

      {/* Stats Cards Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12, marginBottom: 20 }}>
        <div style={{ background: 'hsl(var(--bg-card))', border: '1px solid hsl(var(--border-color))', borderRadius: 16, padding: '12px 14px', display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ width: 34, height: 34, borderRadius: 10, background: 'rgba(99, 102, 241, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#6366f1' }}>
            <Package size={16} />
          </div>
          <div>
            <div style={{ fontSize: '0.6rem', fontWeight: 800, color: 'hsl(var(--text-muted))', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Total</div>
            <div style={{ fontSize: '1.1rem', fontWeight: 900, color: 'hsl(var(--text-primary))', fontFamily: 'Outfit', marginTop: 1 }}>{totalCount}</div>
          </div>
        </div>
        <div style={{ background: 'hsl(var(--bg-card))', border: '1px solid hsl(var(--border-color))', borderRadius: 16, padding: '12px 14px', display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ width: 34, height: 34, borderRadius: 10, background: 'rgba(16, 185, 129, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#10b981' }}>
            <ToggleRight size={16} />
          </div>
          <div>
            <div style={{ fontSize: '0.6rem', fontWeight: 800, color: 'hsl(var(--text-muted))', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Active</div>
            <div style={{ fontSize: '1.1rem', fontWeight: 900, color: 'hsl(var(--text-primary))', fontFamily: 'Outfit', marginTop: 1 }}>{activeCount}</div>
          </div>
        </div>
        <div style={{ background: 'hsl(var(--bg-card))', border: '1px solid hsl(var(--border-color))', borderRadius: 16, padding: '12px 14px', display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ width: 34, height: 34, borderRadius: 10, background: lowStockCount > 0 ? 'rgba(239, 68, 68, 0.1)' : 'rgba(14, 165, 233, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: lowStockCount > 0 ? '#ef4444' : '#0ea5e9' }}>
            <Package size={16} />
          </div>
          <div>
            <div style={{ fontSize: '0.6rem', fontWeight: 800, color: 'hsl(var(--text-muted))', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Low Stock</div>
            <div style={{ fontSize: '1.1rem', fontWeight: 900, color: lowStockCount > 0 ? '#ef4444' : 'hsl(var(--text-primary))', fontFamily: 'Outfit', marginTop: 1 }}>{lowStockCount}</div>
          </div>
        </div>
      </div>

      {/* Search */}
      <div style={{ position: 'relative', marginBottom: 16 }}>
        <Search size={14} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'hsl(var(--text-dim))', pointerEvents: 'none' }} />
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search products..."
          style={{ ...inputStyle, paddingLeft: 34, background: 'hsl(var(--bg-card))', border: '1.5px solid hsl(var(--border-color))' }}
          onFocus={e => { e.target.style.borderColor = '#0ea5e9'; e.target.style.boxShadow = '0 0 0 3px rgba(14, 165, 233, 0.15)'; }}
          onBlur={e => { e.target.style.borderColor = 'hsl(var(--border-color))'; e.target.style.boxShadow = 'none'; }} />
      </div>

      {/* Product list */}
      {loading ? (
        <PremiumLoader text="Retrieving products..." />
      ) : filtered.length === 0 ? (
        <EmptyStateCard 
          icon={Package} 
          title="No Products Found" 
          message="There are no products matching your search criteria."
          action={
            <button onClick={openAdd} style={{ padding: '10px 20px', borderRadius: 12, border: 'none', background: 'linear-gradient(135deg, #0ea5e9, #6366f1)', color: '#fff', fontSize: '0.78rem', fontWeight: 700, cursor: 'pointer', fontFamily: 'Outfit' }}>
              Add First Product
            </button>
          }
        />
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {filtered.map(p => {
            const isB2b = subTab === 'b2b';
            const catKey = getCategoryKey(p.category);
            const cc = catColors[catKey] || '#0ea5e9';
            const cs = CAT_CONFIG[catKey] || DEFAULT_CAT_CONFIG;
            const images = getProductImages(p);
            
            const hasImage = isB2b ? (!!p.image && p.image.trim()) : (!!p.image_url && p.image_url.trim());
            const stockVal = isB2b ? p.stock : p.stock_qty;
            const isOutOfStock = stockVal === null || stockVal === undefined || stockVal <= 0;
            const isLowStock = isB2b 
              ? (!isOutOfStock && p.stock < p.minStock)
              : (!isOutOfStock && p.stock_qty <= 5);

            return (
              <div 
                key={p.id} 
                onClick={() => { setSelectedProductPreview(p); setCarouselIndex(0); }}
                style={{ 
                  background: 'hsl(var(--bg-card))', 
                  borderRadius: 16, 
                  border: '1px solid hsl(var(--border-color))', 
                  overflow: 'hidden', 
                  opacity: (isB2b || p.active !== false) ? 1 : 0.55, 
                  display: 'flex', 
                  alignItems: 'center',
                  padding: '12px 14px',
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                  gap: 12
                }}
                onMouseEnter={e => {
                  e.currentTarget.style.transform = 'translateY(-2px)';
                  e.currentTarget.style.boxShadow = '0 6px 16px rgba(15,23,42,0.08)';
                  e.currentTarget.style.borderColor = '#0ea5e9';
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.boxShadow = 'none';
                  e.currentTarget.style.borderColor = 'hsl(var(--border-color))';
                }}
              >
                {/* Thumbnail */}
                <div style={{ width: 44, height: 44, borderRadius: 10, overflow: 'hidden', background: cs.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.2rem', flexShrink: 0 }}>
                  {hasImage ? (
                    <img src={images[0]} alt={p.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} onError={(e) => { e.target.style.display = 'none'; }} />
                  ) : (
                    <span>{cs.icon}</span>
                  )}
                </div>

                {/* Details */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 3 }}>
                    <span style={{ fontSize: '0.85rem', fontWeight: 800, color: 'hsl(var(--text-primary))', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {p.name}
                    </span>
                    {isB2b ? (
                      p.isSerialized && (
                        <span style={{ fontSize: '0.52rem', color: '#0ea5e9', background: 'rgba(14,165,233,0.1)', padding: '1px 5px', borderRadius: 4, fontWeight: 800, flexShrink: 0 }}>SERIALIZED</span>
                      )
                    ) : (
                      p.active === false ? (
                        <span style={{ fontSize: '0.52rem', color: '#ef4444', background: 'rgba(239,68,68,0.1)', padding: '1px 5px', borderRadius: 4, fontWeight: 800, flexShrink: 0 }}>INACTIVE</span>
                      ) : (
                        <span style={{ fontSize: '0.52rem', color: '#10b981', background: 'rgba(16,185,129,0.1)', padding: '1px 5px', borderRadius: 4, fontWeight: 800, flexShrink: 0 }}>ACTIVE</span>
                      )
                    )}
                  </div>
                  <div style={{ display: 'flex', gap: 8, fontSize: '0.68rem', alignItems: 'center', flexWrap: 'wrap' }}>
                    <span style={{ fontWeight: 800, color: '#0ea5e9' }}>₹{p.price?.toLocaleString('en-IN')}</span>
                    <span style={{ color: 'hsl(var(--text-dim))' }}>·</span>
                    <span style={{ color: cc, fontWeight: 700 }}>{p.category}</span>
                    <span style={{ color: 'hsl(var(--text-dim))' }}>·</span>
                    {isB2b && p.sku && (
                      <>
                        <span style={{ color: 'hsl(var(--text-muted))' }}>SKU: {p.sku}</span>
                        <span style={{ color: 'hsl(var(--text-dim))' }}>·</span>
                      </>
                    )}
                    <span style={{ color: isOutOfStock ? '#ef4444' : isLowStock ? '#f59e0b' : '#10b981', fontWeight: 700 }}>
                      {isOutOfStock ? 'Out of stock' : `${stockVal} in stock`}
                    </span>
                  </div>
                </div>

                {/* Actions */}
                <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
                  <button 
                    onClick={(e) => { e.stopPropagation(); openEdit(p); }} 
                    style={{ padding: '8px', borderRadius: 8, border: '1px solid hsl(var(--border-color))', background: 'hsl(var(--bg-dark))', cursor: 'pointer', color: 'hsl(var(--text-muted))', display: 'flex' }} 
                    title="Edit"
                  >
                    <Edit3 size={13} />
                  </button>
                  <button 
                    onClick={(e) => { e.stopPropagation(); handleDelete(p.id); }} 
                    disabled={deleting === p.id} 
                    style={{ padding: '8px', borderRadius: 8, border: '1px solid rgba(239,68,68,0.2)', background: 'rgba(239,68,68,0.05)', cursor: 'pointer', color: '#ef4444', display: 'flex', opacity: deleting === p.id ? 0.5 : 1 }} 
                    title="Delete"
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Add/Edit modal */}
      {modal && (() => {
        const isB2b = subTab === 'b2b';
        const isDisabled = saving || !form.name.trim() || !form.price || (isB2b && !form.sku.trim()) || (isB2b && modal === 'add' && !form.stock);

        return (
          <div className="modal-overlay-container" style={{ zIndex: 5000 }}>
            <div onClick={() => setModal(null)} style={{ position: 'absolute', inset: 0 }} />
            <div className="modal-content-card animate-fade-in" style={{ padding: '24px 20px', maxWidth: 460, maxHeight: '90vh', overflowY: 'auto' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 }}>
                <h3 style={{ fontFamily: 'Outfit', fontWeight: 900, fontSize: '1.15rem', color: 'hsl(var(--text-primary))', margin: 0 }}>
                  {modal === 'add' ? 'Add Product' : 'Edit Product'}
                </h3>
                <button 
                  className="modal-close-btn light-bg" 
                  onClick={() => setModal(null)} 
                >
                  <X size={15} strokeWidth={2.5} />
                </button>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                <Field label="Product Name *">
                  <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="e.g. Straumann BLT Implant 4.1mm" className="form-input" />
                </Field>

                {isB2b && (
                  <Field label="SKU Code *">
                    <input value={form.sku} onChange={e => setForm(f => ({ ...f, sku: e.target.value }))} placeholder="e.g. SCW-HEX-20" className="form-input" />
                  </Field>
                )}

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  <Field label="Price (₹) *">
                    <input type="number" value={form.price} onChange={e => setForm(f => ({ ...f, price: e.target.value }))} placeholder="0" className="form-input" />
                  </Field>
                  {isB2b ? (
                    <Field label="Purchase Cost (₹)">
                      <input type="number" value={form.purchaseCost} onChange={e => setForm(f => ({ ...f, purchaseCost: e.target.value }))} placeholder="Cost (₹)" className="form-input" />
                    </Field>
                  ) : (
                    <Field label="Stock Qty">
                      <input type="number" value={form.stock_qty} onChange={e => setForm(f => ({ ...f, stock_qty: e.target.value }))} placeholder="0" className="form-input" />
                    </Field>
                  )}
                </div>

                {isB2b && (
                  <>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                      {modal === 'add' ? (
                        <Field label="Initial Stock Qty *">
                          <input type="number" value={form.stock} onChange={e => setForm(f => ({ ...f, stock: e.target.value }))} placeholder="e.g. 50" className="form-input" />
                        </Field>
                      ) : (
                        <div />
                      )}
                      <Field label="Min Stock Alert">
                        <input type="number" value={form.minStock} onChange={e => setForm(f => ({ ...f, minStock: e.target.value }))} placeholder="e.g. 5" className="form-input" />
                      </Field>
                    </div>

                    {modal === 'add' && (
                      <div style={{ background: 'hsl(var(--border-color) / 10%)', padding: 12, borderRadius: 12, border: '1px solid hsl(var(--border-color))' }}>
                        <h4 style={{ fontSize: '0.72rem', fontWeight: 800, margin: '0 0 8px 0', color: 'hsl(var(--text-primary))', fontFamily: 'Outfit' }}>Initial Batch & Warehouse Mappings</h4>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                            <div>
                              <label style={{ fontSize: '0.62rem', fontWeight: 800, color: 'hsl(var(--text-muted))', display: 'block', marginBottom: 4 }}>Batch ID</label>
                              <input type="text" placeholder="e.g. B-01" value={form.batchNo} onChange={e => setForm(f => ({ ...f, batchNo: e.target.value }))} className="form-input" style={{ ...inputStyle, padding: '8px 12px', fontSize: '0.8rem' }} />
                            </div>
                            <div>
                              <label style={{ fontSize: '0.62rem', fontWeight: 800, color: 'hsl(var(--text-muted))', display: 'block', marginBottom: 4 }}>Expiry Date</label>
                              <PremiumDatePicker value={form.batchExpiry} onChange={e => setForm(f => ({ ...f, batchExpiry: e.target.value }))} className="form-input" style={{ ...inputStyle, padding: '8px 12px', fontSize: '0.8rem' }} />
                            </div>
                          </div>
                          <div>
                            <label style={{ fontSize: '0.62rem', fontWeight: 800, color: 'hsl(var(--text-muted))', display: 'block', marginBottom: 4 }}>Warehouse Location</label>
                            <PremiumSelect value={form.batchLocation} onChange={e => setForm(f => ({ ...f, batchLocation: e.target.value }))} className="form-select" style={{ padding: '8px 12px', fontSize: '0.8rem' }}>
                              {warehousesList.map(w => (
                                <option key={w.id} value={w.name}>{w.name}</option>
                              ))}
                            </PremiumSelect>
                          </div>
                        </div>
                      </div>
                    )}

                    {modal === 'add' && (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <input type="checkbox" id="modal_serialized" checked={form.isSerialized} onChange={e => setForm(f => ({ ...f, isSerialized: e.target.checked }))} style={{ cursor: 'pointer' }} />
                          <label htmlFor="modal_serialized" style={{ fontSize: '0.78rem', fontWeight: 700, color: 'hsl(var(--text-primary))', cursor: 'pointer' }}>Serialized Equipment Tracking</label>
                        </div>
                        {form.isSerialized && (
                          <Field label="Initial Serial Number (Optional)">
                            <input value={form.initialSerial} onChange={e => setForm(f => ({ ...f, initialSerial: e.target.value }))} placeholder="e.g. SN-99882" className="form-input" />
                          </Field>
                        )}
                      </div>
                    )}
                  </>
                )}

                <Field label="Category">
                  <PremiumSelect value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))} className="form-select">
                    {isB2b 
                      ? B2B_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)
                      : categoriesList.map(c => <option key={c} value={c}>{c}</option>)
                    }
                  </PremiumSelect>
                </Field>

                {isB2b && (
                  <div style={{ background: 'hsl(var(--border-color) / 10%)', padding: 12, borderRadius: 12, border: '1px solid hsl(var(--border-color))', display: 'flex', flexDirection: 'column', gap: 12 }}>
                    <h4 style={{ fontSize: '0.72rem', fontWeight: 800, margin: 0, color: 'hsl(var(--text-primary))', fontFamily: 'Outfit' }}>Technical Spec Sheet (Optional)</h4>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                      <Field label="Material">
                        <input value={form.material} onChange={e => setForm(f => ({ ...f, material: e.target.value }))} placeholder="e.g. Titanium Gr5 (Ti6Al4V)" className="form-input" />
                      </Field>
                      <Field label="Surface Finish">
                        <input value={form.finish} onChange={e => setForm(f => ({ ...f, finish: e.target.value }))} placeholder="e.g. Polished" className="form-input" />
                      </Field>
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
                      <Field label="Sterilization">
                        <PremiumSelect value={form.sterilization} onChange={e => setForm(f => ({ ...f, sterilization: e.target.value }))} className="form-select">
                          {STERILIZATION_METHODS.map(m => <option key={m} value={m}>{m}</option>)}
                        </PremiumSelect>
                      </Field>
                      <Field label="Warranty %">
                        <input type="number" value={form.warrantyPct} onChange={e => setForm(f => ({ ...f, warrantyPct: e.target.value }))} placeholder="100" className="form-input" />
                      </Field>
                      <Field label="Bendable Angle °">
                        <input type="number" value={form.bendableAngle} onChange={e => setForm(f => ({ ...f, bendableAngle: e.target.value }))} placeholder="20" className="form-input" />
                      </Field>
                    </div>
                  </div>
                )}

                {!isB2b && (
                  <Field label="Description">
                    <textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} placeholder="Optional product details..." rows={3}
                      className="form-textarea" style={{ resize: 'none', lineHeight: 1.5 }} />
                  </Field>
                )}

                <Field label="Product Images">
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                    <input 
                      type="file" 
                      id="product-image-uploader" 
                      multiple 
                      accept="image/*" 
                      onChange={handleFileChange} 
                      style={{ display: 'none' }} 
                    />
                    <label 
                      htmlFor="product-image-uploader"
                      style={{ 
                        display: 'flex', 
                        alignItems: 'center', 
                        justifyContent: 'center', 
                        gap: 8, 
                        padding: '12px 16px', 
                        background: 'hsl(var(--bg-dark))', 
                        border: '1.5px dashed hsl(var(--border-color))', 
                        borderRadius: 12, 
                        fontSize: '0.85rem', 
                        fontWeight: 700, 
                        color: 'hsl(var(--text-muted))', 
                        cursor: 'pointer',
                        transition: 'all 0.2s',
                        fontFamily: 'Outfit'
                      }}
                      onMouseEnter={e => { e.currentTarget.style.borderColor = '#0ea5e9'; e.currentTarget.style.color = '#0ea5e9'; }}
                      onMouseLeave={e => { e.currentTarget.style.borderColor = 'hsl(var(--border-color))'; e.currentTarget.style.color = 'hsl(var(--text-muted))'; }}
                    >
                      <Plus size={16} /> {uploadingFiles ? 'Uploading images...' : 'Upload Images (Multiple)'}
                    </label>

                    {((isB2b ? form.image : form.image_url) && (isB2b ? form.image.trim() : form.image_url.trim())) && (
                      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 4 }}>
                        {splitImageUrls(isB2b ? form.image : form.image_url).map((url, idx) => (
                          <div 
                            key={idx} 
                            style={{ 
                              position: 'relative', 
                              width: 54, 
                              height: 54, 
                              borderRadius: 8, 
                              border: '1.5px solid hsl(var(--border-color))', 
                              overflow: 'hidden', 
                              background: 'hsl(var(--bg-dark))' 
                            }}
                          >
                            <img src={resolveUrl(url)} alt={`Uploaded ${idx + 1}`} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                            <button 
                              type="button"
                              onClick={() => {
                                const urls = splitImageUrls(isB2b ? form.image : form.image_url);
                                urls.splice(idx, 1);
                                if (isB2b) {
                                  setForm(f => ({ ...f, image: urls.join('|') }));
                                } else {
                                  setForm(f => ({ ...f, image_url: urls.join('|') }));
                                }
                              }}
                              style={{ 
                                position: 'absolute', 
                                top: 2, 
                                right: 2, 
                                background: 'rgba(239, 68, 68, 0.85)', 
                                border: 'none', 
                                borderRadius: '50%', 
                                width: 14, 
                                height: 14, 
                                display: 'flex', 
                                alignItems: 'center', 
                                justifyContent: 'center', 
                                color: '#fff', 
                                cursor: 'pointer',
                                padding: 0
                              }}
                            >
                              <X size={10} />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </Field>

                {/* Active toggle */}
                {!isB2b && (
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 14px', background: 'hsl(var(--bg-dark))', borderRadius: 12, border: '1px solid hsl(var(--border-color))' }}>
                    <div>
                      <div style={{ fontSize: '0.82rem', fontWeight: 700, color: 'hsl(var(--text-primary))' }}>Active in Catalog</div>
                      <div style={{ fontSize: '0.63rem', color: 'hsl(var(--text-muted))', marginTop: 1 }}>Doctors can view and order this product</div>
                    </div>
                    <button onClick={() => setForm(f => ({ ...f, active: !f.active }))} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, display: 'flex', color: form.active ? '#10b981' : 'hsl(var(--text-dim))' }}>
                      {form.active ? <ToggleRight size={32} /> : <ToggleLeft size={32} />}
                    </button>
                  </div>
                )}

                <button onClick={handleSave} disabled={isDisabled}
                  style={{ width: '100%', padding: '14px', borderRadius: 14, border: 'none', background: isDisabled ? 'hsl(var(--border-color))' : 'linear-gradient(135deg, #0ea5e9, #6366f1)', color: isDisabled ? 'hsl(var(--text-dim))' : '#fff', fontSize: '0.9rem', fontWeight: 800, cursor: isDisabled ? 'not-allowed' : 'pointer', fontFamily: 'Outfit', boxShadow: isDisabled ? 'none' : '0 6px 20px rgba(14,165,233,0.25)', transition: 'all 0.2s' }}>
                  {saving ? 'Saving...' : modal === 'add' ? '+ Add Product' : '✓ Save Changes'}
                </button>
              </div>
            </div>
          </div>
        );
      })()}

      {/* Product Preview Modal */}
      {selectedProductPreview && (() => {
        const isB2b = subTab === 'b2b';
        const images = getProductImages(selectedProductPreview);
        const stockVal = isB2b ? selectedProductPreview.stock : selectedProductPreview.stock_qty;
        const outOfStock = stockVal === null || stockVal === undefined || stockVal <= 0;
        const lowStock = isB2b
          ? (!outOfStock && selectedProductPreview.stock < selectedProductPreview.minStock)
          : (!outOfStock && selectedProductPreview.stock_qty <= 5);

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
                    {outOfStock ? 'Out of Stock' : lowStock ? (isB2b ? `Stock level low (${stockVal})` : `Only ${stockVal} left`) : 'In Stock'}
                  </span>
                  {(isB2b || selectedProductPreview.active !== false) ? (
                    <span style={{ fontSize: '0.62rem', fontWeight: 800, padding: '3px 8px', borderRadius: 6, background: 'rgba(16,185,129,0.1)', color: '#10b981' }}>
                      Active
                    </span>
                  ) : (
                    <span style={{ fontSize: '0.62rem', fontWeight: 800, padding: '3px 8px', borderRadius: 6, background: 'rgba(239,68,68,0.1)', color: '#ef4444' }}>
                      Inactive
                    </span>
                  )}
                  {selectedProductPreview.sku && (
                    <span style={{ fontSize: '0.62rem', fontWeight: 700, padding: '3px 8px', borderRadius: 6, background: 'hsl(var(--bg-dark))', border: '1px solid hsl(var(--border-color))', color: 'hsl(var(--text-muted))' }}>
                      SKU: {selectedProductPreview.sku}
                    </span>
                  )}
                </div>

                {/* B2B Specific Details Grid */}
                {isB2b && (
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
                        <div style={{ fontSize: '0.82rem', fontWeight: 800, color: 'hsl(var(--text-primary))', marginTop: 2 }}>{selectedProductPreview.minStock} units</div>
                      </div>
                      <div>
                        <div style={{ fontSize: '0.6rem', color: 'hsl(var(--text-muted))', fontWeight: 700, textTransform: 'uppercase' }}>Serialized Tracking</div>
                        <div style={{ fontSize: '0.82rem', fontWeight: 800, color: selectedProductPreview.isSerialized ? '#0ea5e9' : 'hsl(var(--text-muted))', marginTop: 2 }}>{selectedProductPreview.isSerialized ? 'Enabled ✅' : 'Disabled ❌'}</div>
                      </div>
                    </div>

                    {/* Technical Spec Sheet */}
                    {(selectedProductPreview.material || selectedProductPreview.finish || selectedProductPreview.sterilization || selectedProductPreview.bendableAngle) && (
                      <div style={{ marginTop: 12 }}>
                        <div style={{ fontSize: '0.62rem', fontWeight: 800, color: 'hsl(var(--text-dim))', marginBottom: 6 }}>Technical Spec Sheet:</div>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, background: 'hsl(var(--bg-dark))', padding: 12, borderRadius: 12, border: '1px solid hsl(var(--border-color))' }}>
                          {selectedProductPreview.material && (
                            <div>
                              <div style={{ fontSize: '0.6rem', color: 'hsl(var(--text-muted))', fontWeight: 700, textTransform: 'uppercase' }}>Material</div>
                              <div style={{ fontSize: '0.82rem', fontWeight: 800, color: 'hsl(var(--text-primary))', marginTop: 2 }}>{selectedProductPreview.material}</div>
                            </div>
                          )}
                          {selectedProductPreview.finish && (
                            <div>
                              <div style={{ fontSize: '0.6rem', color: 'hsl(var(--text-muted))', fontWeight: 700, textTransform: 'uppercase' }}>Finish</div>
                              <div style={{ fontSize: '0.82rem', fontWeight: 800, color: 'hsl(var(--text-primary))', marginTop: 2 }}>{selectedProductPreview.finish}</div>
                            </div>
                          )}
                          {selectedProductPreview.sterilization && (
                            <div>
                              <div style={{ fontSize: '0.6rem', color: 'hsl(var(--text-muted))', fontWeight: 700, textTransform: 'uppercase' }}>Sterilization</div>
                              <div style={{ fontSize: '0.82rem', fontWeight: 800, color: 'hsl(var(--text-primary))', marginTop: 2 }}>{selectedProductPreview.sterilization}</div>
                            </div>
                          )}
                          {!!selectedProductPreview.warrantyPct && (
                            <div>
                              <div style={{ fontSize: '0.6rem', color: 'hsl(var(--text-muted))', fontWeight: 700, textTransform: 'uppercase' }}>Warranty</div>
                              <div style={{ fontSize: '0.82rem', fontWeight: 800, color: '#10b981', marginTop: 2 }}>{selectedProductPreview.warrantyPct}%</div>
                            </div>
                          )}
                          {!!selectedProductPreview.bendableAngle && (
                            <div>
                              <div style={{ fontSize: '0.6rem', color: 'hsl(var(--text-muted))', fontWeight: 700, textTransform: 'uppercase' }}>Bendable Angle</div>
                              <div style={{ fontSize: '0.82rem', fontWeight: 800, color: 'hsl(var(--text-primary))', marginTop: 2 }}>{selectedProductPreview.bendableAngle}°</div>
                            </div>
                          )}
                        </div>
                      </div>
                    )}

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
                )}

                {/* B2C Specific Details Grid */}
                {!isB2b && (
                  <div style={{ borderTop: '1px solid hsl(var(--border-color))', paddingTop: 12 }}>
                    <h4 style={{ fontSize: '0.72rem', fontWeight: 800, color: 'hsl(var(--text-muted))', textTransform: 'uppercase', letterSpacing: '0.05em', margin: '0 0 8px 0' }}>B2C Catalog Details</h4>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, background: 'hsl(var(--bg-dark))', padding: 12, borderRadius: 12, border: '1px solid hsl(var(--border-color))' }}>
                      <div>
                        <div style={{ fontSize: '0.6rem', color: 'hsl(var(--text-muted))', fontWeight: 700, textTransform: 'uppercase' }}>Stock Qty</div>
                        <div style={{ fontSize: '0.82rem', fontWeight: 800, color: outOfStock ? '#ef4444' : lowStock ? '#f59e0b' : '#10b981', marginTop: 2 }}>
                          {outOfStock ? '0 (Out of Stock)' : `${stockVal} units`}
                        </div>
                      </div>
                      <div>
                        <div style={{ fontSize: '0.6rem', color: 'hsl(var(--text-muted))', fontWeight: 700, textTransform: 'uppercase' }}>Availability</div>
                        <div style={{ fontSize: '0.82rem', fontWeight: 800, color: outOfStock ? '#ef4444' : lowStock ? '#f59e0b' : '#10b981', marginTop: 2 }}>
                          {outOfStock ? 'Out of Stock' : lowStock ? `Low — ${stockVal} left` : '✅ Available'}
                        </div>
                      </div>
                      <div>
                        <div style={{ fontSize: '0.6rem', color: 'hsl(var(--text-muted))', fontWeight: 700, textTransform: 'uppercase' }}>Category</div>
                        <div style={{ fontSize: '0.82rem', fontWeight: 800, color: cs.color, marginTop: 2 }}>{selectedProductPreview.category || 'General'}</div>
                      </div>
                      <div>
                        <div style={{ fontSize: '0.6rem', color: 'hsl(var(--text-muted))', fontWeight: 700, textTransform: 'uppercase' }}>Listing Status</div>
                        <div style={{ fontSize: '0.82rem', fontWeight: 800, color: selectedProductPreview.active === false ? '#ef4444' : '#10b981', marginTop: 2 }}>
                          {selectedProductPreview.active === false ? 'Inactive ❌' : 'Active ✅'}
                        </div>
                      </div>
                      {selectedProductPreview.sku && (
                        <div style={{ gridColumn: '1 / -1' }}>
                          <div style={{ fontSize: '0.6rem', color: 'hsl(var(--text-muted))', fontWeight: 700, textTransform: 'uppercase' }}>SKU / Product Code</div>
                          <div style={{ fontSize: '0.82rem', fontWeight: 800, color: 'hsl(var(--text-primary))', marginTop: 2, fontFamily: 'monospace' }}>{selectedProductPreview.sku}</div>
                        </div>
                      )}
                      {selectedProductPreview.unit && (
                        <div style={{ gridColumn: '1 / -1' }}>
                          <div style={{ fontSize: '0.6rem', color: 'hsl(var(--text-muted))', fontWeight: 700, textTransform: 'uppercase' }}>Unit</div>
                          <div style={{ fontSize: '0.82rem', fontWeight: 800, color: 'hsl(var(--text-primary))', marginTop: 2 }}>per {selectedProductPreview.unit}</div>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Description */}
                {selectedProductPreview.description && (
                  <div style={{ borderTop: '1px solid hsl(var(--border-color))', paddingTop: 12 }}>
                    <h4 style={{ fontSize: '0.72rem', fontWeight: 800, color: 'hsl(var(--text-muted))', textTransform: 'uppercase', letterSpacing: '0.05em', margin: '0 0 6px 0' }}>Description</h4>
                    <p style={{ fontSize: '0.78rem', color: 'hsl(var(--text-primary))', lineHeight: 1.5, margin: 0, maxHeight: 110, overflowY: 'auto' }}>
                      {selectedProductPreview.description}
                    </p>
                  </div>
                )}

                {/* Action Footer */}
                <div style={{ borderTop: '1px solid hsl(var(--border-color))', paddingTop: 16, marginTop: 4, display: 'flex', gap: 10 }}>
                  <button 
                    onClick={() => {
                      const prod = selectedProductPreview;
                      setSelectedProductPreview(null);
                      openEdit(prod);
                    }}
                    style={{ flex: 1, padding: '12px', borderRadius: 12, border: 'none', background: 'linear-gradient(135deg, #0ea5e9, #6366f1)', color: '#fff', fontSize: '0.82rem', fontWeight: 800, cursor: 'pointer', fontFamily: 'Outfit', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, boxShadow: '0 4px 14px rgba(14,165,233,0.25)' }}
                  >
                    <Edit3 size={15} /> Edit Product Details
                  </button>
                  <button 
                    onClick={() => {
                      const id = selectedProductPreview.id;
                      setSelectedProductPreview(null);
                      handleDelete(id);
                    }}
                    style={{ padding: '12px 16px', borderRadius: 12, border: '1px solid rgba(239,68,68,0.2)', background: 'rgba(239,68,68,0.05)', color: '#ef4444', fontSize: '0.82rem', fontWeight: 800, cursor: 'pointer', fontFamily: 'Outfit' }}
                  >
                    Delete
                  </button>
                </div>
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
}
