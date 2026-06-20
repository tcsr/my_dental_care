import { useState, useEffect } from 'react';
import { supabase } from '../utils/supabase';
import { Plus, Edit3, Trash2, Package, Search, X, ToggleLeft, ToggleRight, ChevronLeft, ChevronRight } from 'lucide-react';

const CATEGORIES = ['Implants', 'Instruments', 'Materials', 'PPE', 'Equipment', 'Consumables'];
const CAT_COLOR = { Implants: '#6366f1', Instruments: '#0ea5e9', Materials: '#10b981', PPE: '#f59e0b', Equipment: '#a855f7', Consumables: '#ec4899' };

const FALLBACK_IMAGES = {
  Implants: [
    'https://images.unsplash.com/photo-1606811971618-4486d14f3f99?auto=format&fit=crop&w=600&q=80',
    'https://images.unsplash.com/photo-1588776814546-1ffcf47267a5?auto=format&fit=crop&w=600&q=80',
    'https://images.unsplash.com/photo-1579684385127-1ef15d508118?auto=format&fit=crop&w=600&q=80'
  ],
  Instruments: [
    'https://images.unsplash.com/photo-1512223792601-592a9809eed4?auto=format&fit=crop&w=600&q=80',
    'https://images.unsplash.com/photo-1629909613654-28e377c37b09?auto=format&fit=crop&w=600&q=80',
    'https://images.unsplash.com/photo-1576091160550-2173dba999ef?auto=format&fit=crop&w=600&q=80'
  ],
  Materials: [
    'https://images.unsplash.com/photo-1581091226825-a6a2a5aee158?auto=format&fit=crop&w=600&q=80',
    'https://images.unsplash.com/photo-1576086213369-97a306d36557?auto=format&fit=crop&w=600&q=80',
    'https://images.unsplash.com/photo-1612115539055-fa377042c16e?auto=format&fit=crop&w=600&q=80'
  ],
  PPE: [
    'https://images.unsplash.com/photo-1584515901367-f1c27b744afe?auto=format&fit=crop&w=600&q=80',
    'https://images.unsplash.com/photo-1584483766114-2ece65485222?auto=format&fit=crop&w=600&q=80',
    'https://images.unsplash.com/photo-1607613009820-a29f7bb81c04?auto=format&fit=crop&w=600&q=80'
  ],
  Equipment: [
    'https://images.unsplash.com/photo-1516549655169-df83a0774514?auto=format&fit=crop&w=600&q=80',
    'https://images.unsplash.com/photo-1551076805-e18690237571?auto=format&fit=crop&w=600&q=80',
    'https://images.unsplash.com/photo-1486312338219-ce68d2c6f44d?auto=format&fit=crop&w=600&q=80'
  ],
  Consumables: [
    'https://images.unsplash.com/photo-1576091160550-2173dba999ef?auto=format&fit=crop&w=600&q=80',
    'https://images.unsplash.com/photo-1603398938378-e54eab446dde?auto=format&fit=crop&w=600&q=80',
    'https://images.unsplash.com/photo-1583947215259-38e31be8751f?auto=format&fit=crop&w=600&q=80'
  ],
  General: [
    'https://images.unsplash.com/photo-1588776814546-1ffcf47267a5?auto=format&fit=crop&w=600&q=80',
    'https://images.unsplash.com/photo-1579684385127-1ef15d508118?auto=format&fit=crop&w=600&q=80',
    'https://images.unsplash.com/photo-1576091160550-2173dba999ef?auto=format&fit=crop&w=600&q=80'
  ]
};

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

const getProductImages = (product) => {
  if (product && product.image_url && product.image_url.trim()) {
    return splitImageUrls(product.image_url);
  }
  return FALLBACK_IMAGES[product.category] || FALLBACK_IMAGES.General;
};

const uploadImage = async (file) => {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result);
    reader.readAsDataURL(file);
  });
};

const EMPTY = { name: '', category: 'Implants', price: '', stock_qty: '', description: '', active: true, image_url: '' };

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
  const [products, setProducts] = useState([]);
  const [categoriesList, setCategoriesList] = useState(CATEGORIES);
  const [catColors, setCatColors] = useState(CAT_COLOR);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [modal, setModal] = useState(null);
  const [form, setForm] = useState(EMPTY);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(null);
  const [selectedProductPreview, setSelectedProductPreview] = useState(null);
  const [carouselIndex, setCarouselIndex] = useState(0);
  const [uploadingFiles, setUploadingFiles] = useState(false);

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
      const existing = splitImageUrls(form.image_url);
      const updated = [...existing, ...uploadedUrls].join('|');
      setForm(f => ({ ...f, image_url: updated }));
    }
    setUploadingFiles(false);
    e.target.value = '';
  };

  const fetchCategories = async () => {
    try {
      const { data, error } = await supabase.from('product_categories').select('*').eq('active', true);
      if (error) throw error;
      if (data && data.length > 0) {
        setCategoriesList(data.map(c => c.name));
        const colors = {};
        data.forEach(c => {
          colors[c.name] = c.text_color || '#0ea5e9';
        });
        setCatColors(colors);
      }
    } catch (e) {
      console.warn('Could not load categories in ProductManagement:', e);
    }
  };

  const fetchProducts = async () => {
    setLoading(true);
    const { data } = await supabase.from('products').select('*').order('name');
    setProducts(data || []);
    setLoading(false);
  };

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchCategories();
    fetchProducts();
  }, []);

  const openAdd = () => { setForm(EMPTY); setModal('add'); };
  const openEdit = (p) => {
    setForm({ name: p.name, category: p.category || 'Implants', price: p.price, stock_qty: p.stock_qty ?? '', description: p.description || '', active: p.active !== false, image_url: p.image_url || '' });
    setModal(p);
  };

  const handleSave = async () => {
    if (!form.name.trim() || !form.price) return;
    setSaving(true);
    const payload = { name: form.name.trim(), category: form.category, price: Number(form.price), stock_qty: Number(form.stock_qty) || 0, description: form.description?.trim() || null, active: form.active, image_url: form.image_url?.trim() || null };
    if (modal === 'add') {
      await supabase.from('products').insert(payload);
    } else {
      await supabase.from('products').update(payload).eq('id', modal.id);
    }
    await fetchProducts();
    setSaving(false);
    setModal(null);
  };

  const handleDelete = async (id) => {
    if (!(await confirm('Delete this product? This cannot be undone.'))) return;
    setDeleting(id);
    await supabase.from('products').delete().eq('id', id);
    await fetchProducts();
    setDeleting(null);
  };

  const filtered = products.filter(p => !search || p.name?.toLowerCase().includes(search.toLowerCase()));
  const activeCount = products.filter(p => p.active !== false).length;

  return (
    <div style={{ paddingBottom: 12 }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 }}>
        <div>
          <h2 style={{ fontFamily: 'Outfit', fontWeight: 900, fontSize: '1.15rem', color: 'hsl(var(--text-primary))', margin: '0 0 2px' }}>Products</h2>
          <p style={{ fontSize: '0.72rem', color: 'hsl(var(--text-muted))' }}>Manage dentist B2B catalog items</p>
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
            <div style={{ fontSize: '1.1rem', fontWeight: 900, color: 'hsl(var(--text-primary))', fontFamily: 'Outfit', marginTop: 1 }}>{products.length}</div>
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
        {(() => {
          const lowStockCount = products.filter(p => (p.stock_qty === null || p.stock_qty === undefined || p.stock_qty <= 5) && p.active !== false).length;
          return (
            <div style={{ background: 'hsl(var(--bg-card))', border: '1px solid hsl(var(--border-color))', borderRadius: 16, padding: '12px 14px', display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{ width: 34, height: 34, borderRadius: 10, background: lowStockCount > 0 ? 'rgba(239, 68, 68, 0.1)' : 'rgba(14, 165, 233, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: lowStockCount > 0 ? '#ef4444' : '#0ea5e9' }}>
                <Package size={16} />
              </div>
              <div>
                <div style={{ fontSize: '0.6rem', fontWeight: 800, color: 'hsl(var(--text-muted))', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Low Stock</div>
                <div style={{ fontSize: '1.1rem', fontWeight: 900, color: lowStockCount > 0 ? '#ef4444' : 'hsl(var(--text-primary))', fontFamily: 'Outfit', marginTop: 1 }}>{lowStockCount}</div>
              </div>
            </div>
          );
        })()}
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
        <div style={{ textAlign: 'center', padding: '40px 0', color: 'hsl(var(--text-muted))', fontSize: '0.8rem' }}>Loading...</div>
      ) : filtered.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '60px 0' }}>
          <Package size={44} color="hsl(var(--text-dim))" style={{ margin: '0 auto 14px', display: 'block' }} />
          <p style={{ fontFamily: 'Outfit', fontWeight: 700, color: 'hsl(var(--text-muted))', marginBottom: 6 }}>No products yet</p>
          <button onClick={openAdd} style={{ padding: '10px 20px', borderRadius: 12, border: 'none', background: 'linear-gradient(135deg, #0ea5e9, #6366f1)', color: '#fff', fontSize: '0.78rem', fontWeight: 700, cursor: 'pointer', fontFamily: 'Outfit' }}>
            Add First Product
          </button>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {filtered.map(p => {
            const cc = catColors[p.category] || '#0ea5e9';
            const cs = CAT_CONFIG[p.category] || DEFAULT_CAT_CONFIG;
            const images = getProductImages(p);
            return (
              <div 
                key={p.id} 
                onClick={() => { setSelectedProductPreview(p); setCarouselIndex(0); }}
                style={{ 
                  background: 'hsl(var(--bg-card))', 
                  borderRadius: 16, 
                  border: '1px solid hsl(var(--border-color))', 
                  overflow: 'hidden', 
                  opacity: p.active !== false ? 1 : 0.55, 
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
                  {p.image_url ? (
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
                    {p.active === false ? (
                      <span style={{ fontSize: '0.52rem', color: '#ef4444', background: 'rgba(239,68,68,0.1)', padding: '1px 5px', borderRadius: 4, fontWeight: 800, flexShrink: 0 }}>INACTIVE</span>
                    ) : (
                      <span style={{ fontSize: '0.52rem', color: '#10b981', background: 'rgba(16,185,129,0.1)', padding: '1px 5px', borderRadius: 4, fontWeight: 800, flexShrink: 0 }}>ACTIVE</span>
                    )}
                  </div>
                  <div style={{ display: 'flex', gap: 8, fontSize: '0.68rem', alignItems: 'center', flexWrap: 'wrap' }}>
                    <span style={{ fontWeight: 800, color: '#0ea5e9' }}>₹{p.price?.toLocaleString('en-IN')}</span>
                    <span style={{ color: 'hsl(var(--text-dim))' }}>·</span>
                    <span style={{ color: cc, fontWeight: 700 }}>{p.category}</span>
                    <span style={{ color: 'hsl(var(--text-dim))' }}>·</span>
                    <span style={{ color: p.stock_qty === 0 ? '#ef4444' : p.stock_qty <= 5 ? '#f59e0b' : '#10b981', fontWeight: 700 }}>
                      {p.stock_qty === 0 ? 'Out of stock' : `${p.stock_qty} in stock`}
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
      {modal && (
        <div className="modal-overlay-container" style={{ zIndex: 5000 }}>
          <div onClick={() => setModal(null)} style={{ position: 'absolute', inset: 0 }} />
          <div className="modal-content-card animate-fade-in" style={{ padding: '24px 20px', maxWidth: 460 }}>
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

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <Field label="Price (₹) *">
                  <input type="number" value={form.price} onChange={e => setForm(f => ({ ...f, price: e.target.value }))} placeholder="0" className="form-input" />
                </Field>
                <Field label="Stock Qty">
                  <input type="number" value={form.stock_qty} onChange={e => setForm(f => ({ ...f, stock_qty: e.target.value }))} placeholder="0" className="form-input" />
                </Field>
              </div>

              <Field label="Category">
                <select value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))} className="form-select">
                  {categoriesList.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </Field>

              <Field label="Description">
                <textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} placeholder="Optional product details..." rows={3}
                  className="form-textarea" style={{ resize: 'none', lineHeight: 1.5 }} />
              </Field>

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

                  {form.image_url && form.image_url.trim() && (
                    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 4 }}>
                      {splitImageUrls(form.image_url).map((url, idx) => (
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
                          <img src={url} alt={`Uploaded ${idx + 1}`} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                          <button 
                            type="button"
                            onClick={() => {
                              const urls = splitImageUrls(form.image_url);
                              urls.splice(idx, 1);
                              setForm(f => ({ ...f, image_url: urls.join('|') }));
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
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 14px', background: 'hsl(var(--bg-dark))', borderRadius: 12, border: '1px solid hsl(var(--border-color))' }}>
                <div>
                  <div style={{ fontSize: '0.82rem', fontWeight: 700, color: 'hsl(var(--text-primary))' }}>Active in Catalog</div>
                  <div style={{ fontSize: '0.63rem', color: 'hsl(var(--text-muted))', marginTop: 1 }}>Doctors can view and order this product</div>
                </div>
                <button onClick={() => setForm(f => ({ ...f, active: !f.active }))} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, display: 'flex', color: form.active ? '#10b981' : 'hsl(var(--text-dim))' }}>
                  {form.active ? <ToggleRight size={32} /> : <ToggleLeft size={32} />}
                </button>
              </div>

              <button onClick={handleSave} disabled={saving || !form.name.trim() || !form.price}
                style={{ width: '100%', padding: '14px', borderRadius: 14, border: 'none', background: (saving || !form.name.trim() || !form.price) ? 'hsl(var(--border-color))' : 'linear-gradient(135deg, #0ea5e9, #6366f1)', color: (saving || !form.name.trim() || !form.price) ? 'hsl(var(--text-dim))' : '#fff', fontSize: '0.9rem', fontWeight: 800, cursor: (saving || !form.name.trim() || !form.price) ? 'not-allowed' : 'pointer', fontFamily: 'Outfit', boxShadow: '0 6px 20px rgba(14,165,233,0.25)', transition: 'all 0.2s' }}>
                {saving ? 'Saving...' : modal === 'add' ? '+ Add Product' : '✓ Save Changes'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Product Preview Modal */}
      {selectedProductPreview && (() => {
        const images = getProductImages(selectedProductPreview);
        const outOfStock = selectedProductPreview.stock_qty === null || selectedProductPreview.stock_qty === undefined || selectedProductPreview.stock_qty <= 0;
        const lowStock = !outOfStock && selectedProductPreview.stock_qty <= 5;
        const cs = CAT_CONFIG[selectedProductPreview.category] || DEFAULT_CAT_CONFIG;

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
              <div style={{ position: 'relative', width: '100%', height: 260, background: 'hsl(var(--bg-dark))', overflow: 'hidden' }}>
                <img 
                  src={images[carouselIndex]} 
                  alt={selectedProductPreview.name} 
                  style={{ width: '100%', height: '100%', objectFit: 'cover', transition: 'all 0.3s ease' }} 
                />
                
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

                {/* Left/Right buttons */}
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
                    {outOfStock ? 'Out of Stock' : lowStock ? `Only ${selectedProductPreview.stock_qty} left` : 'In Stock'}
                  </span>
                  {selectedProductPreview.active !== false ? (
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
